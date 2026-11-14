const { test } = require('node:test');
const assert = require('node:assert/strict');

const configPath = require.resolve('../config/config');
const modelPath = require.resolve('../model/bookingModel');

function loadModel(connection) {
  const previousConfig = require.cache[configPath];
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: { promisePool: { getConnection: async () => connection } }
  };
  delete require.cache[modelPath];
  const model = require(modelPath);
  delete require.cache[modelPath];
  if (previousConfig) require.cache[configPath] = previousConfig;
  else delete require.cache[configPath];
  return model;
}

function fakeConnection({ booking, payments = [] }) {
  const queries = [];
  return {
    queries,
    commits: 0,
    rollbacks: 0,
    releases: 0,
    async beginTransaction() {},
    async commit() { this.commits += 1; },
    async rollback() { this.rollbacks += 1; },
    release() { this.releases += 1; },
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.startsWith('SELECT id, booking_ref, status, total_amount, payment_status FROM bookings')) {
        return [booking ? [booking] : [], []];
      }
      if (sql.startsWith('SELECT id, transaction_id, payment_status FROM payments')) {
        return [payments, []];
      }
      if (sql.startsWith('INSERT INTO payments')) return [{ insertId: 901 }, []];
      if (sql.startsWith('UPDATE bookings') || sql.startsWith('UPDATE payments')) return [{ affectedRows: 1 }, []];
      throw new Error(`Unexpected query: ${sql}`);
    }
  };
}

const verifiedPayment = {
  booking_ref: 'NIB-20261114-1001',
  merchantTransactionId: 'NIB-20261114-1001',
  transactionId: 'GATEWAY_TXN_1',
  amountPaise: 10000,
  gatewayResponse: { success: true }
};

test('transitions the existing pending booking and inserts one verified payment', async () => {
  const connection = fakeConnection({
    booking: { id: 42, booking_ref: verifiedPayment.booking_ref, status: 'Pending', total_amount: '100.00', payment_status: 'Pending' }
  });
  const model = loadModel(connection);

  const result = await model.completePhonePeBooking(verifiedPayment);

  assert.deepEqual(result, {
    booking_id: 42,
    booking_ref: verifiedPayment.booking_ref,
    payment_id: 901,
    total_amount: 100,
    transitioned: true
  });
  assert.equal(connection.queries.filter(query => query.sql.startsWith('UPDATE bookings')).length, 1);
  assert.equal(connection.queries.filter(query => query.sql.startsWith('INSERT INTO payments')).length, 1);
  assert.equal(connection.commits, 1);
  assert.equal(connection.rollbacks, 0);
  assert.equal(connection.releases, 1);
});

test('returns the original booking and payment on an idempotent retry without writes', async () => {
  const connection = fakeConnection({
    booking: { id: 42, booking_ref: verifiedPayment.booking_ref, status: 'Confirmed', total_amount: '100.00', payment_status: 'Paid' },
    payments: [{ id: 901, transaction_id: 'GATEWAY_TXN_1', payment_status: 'Paid' }]
  });
  const model = loadModel(connection);

  const result = await model.completePhonePeBooking(verifiedPayment);

  assert.equal(result.booking_id, 42);
  assert.equal(result.payment_id, 901);
  assert.equal(result.transitioned, false);
  assert.equal(connection.queries.filter(query => /^(UPDATE|INSERT)/.test(query.sql)).length, 0);
  assert.equal(connection.commits, 1);
});

test('rejects a verified amount that differs from the persisted booking total', async () => {
  const connection = fakeConnection({
    booking: { id: 42, booking_ref: verifiedPayment.booking_ref, status: 'Pending', total_amount: '100.00', payment_status: 'Pending' }
  });
  const model = loadModel(connection);

  await assert.rejects(
    model.completePhonePeBooking({ ...verifiedPayment, amountPaise: 9999 }),
    error => error.statusCode === 409 && error.code === 'BOOKING_AMOUNT_MISMATCH'
  );
  assert.equal(connection.queries.filter(query => /^(UPDATE|INSERT)/.test(query.sql)).length, 0);
  assert.equal(connection.rollbacks, 1);
  assert.equal(connection.releases, 1);
});

test('does not overwrite a booking linked to another gateway transaction', async () => {
  const connection = fakeConnection({
    booking: { id: 42, booking_ref: verifiedPayment.booking_ref, status: 'Confirmed', total_amount: '100.00', payment_status: 'Paid' },
    payments: [{ id: 901, transaction_id: 'DIFFERENT_TXN', payment_status: 'Paid' }]
  });
  const model = loadModel(connection);

  await assert.rejects(
    model.completePhonePeBooking(verifiedPayment),
    error => error.statusCode === 409 && error.code === 'PAYMENT_TRANSACTION_MISMATCH'
  );
  assert.equal(connection.queries.filter(query => /^(UPDATE|INSERT)/.test(query.sql)).length, 0);
  assert.equal(connection.rollbacks, 1);
});
