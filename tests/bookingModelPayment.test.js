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

function fakeConnection({ booking, references, payments = [] }) {
  const queries = [];
  const referenceRows = references || (booking ? [{ id: booking.id }] : []);
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
      if (sql.startsWith('SELECT id FROM bookings WHERE booking_ref = ? LIMIT 2')) {
        return [referenceRows, []];
      }
      if (sql.startsWith('SELECT b.id, b.booking_ref, b.status, b.total_amount, b.payment_status, p.user_id FROM bookings')) {
        return [booking ? [booking] : [], []];
      }
      if (sql.startsWith('SELECT id, transaction_id, payment_status FROM payments')) {
        return [payments, []];
      }
      if (sql.startsWith('INSERT INTO parents')) return [{ insertId: 1 }, []];
      if (sql.startsWith('INSERT INTO payments')) return [{ insertId: 901 }, []];
      if (sql.startsWith('UPDATE bookings') || sql.startsWith('UPDATE payments')) return [{ affectedRows: 1 }, []];
      throw new Error(`Unexpected query: ${sql}`);
    }
  };
}

const verifiedPayment = {
  booking_ref: 'NIBOG_7_1760000000000',
  merchantTransactionId: 'NIBOG_7_1760000000000',
  transactionId: 'GATEWAY_TXN_1',
  amountPaise: 10000,
  gatewayResponse: { success: true }
};

function booking(overrides = {}) {
  return {
    id: 42,
    booking_ref: verifiedPayment.booking_ref,
    status: 'Pending',
    total_amount: '100.00',
    payment_status: 'Pending',
    user_id: 7,
    ...overrides
  };
}

test('locks by primary key, transitions the pending booking, and snapshots before commit', async () => {
  const connection = fakeConnection({ booking: booking() });
  const model = loadModel(connection);
  let snapshotRead = false;
  model.getBookingById = async (bookingId, connectionUsed) => {
    assert.equal(bookingId, 42);
    assert.equal(connectionUsed, connection);
    assert.equal(connection.commits, 0);
    snapshotRead = true;
    return { booking_id: bookingId, payment_status: 'Paid' };
  };

  const result = await model.completePhonePeBooking(verifiedPayment);

  assert.equal(result.booking_id, 42);
  assert.equal(result.booking_ref, verifiedPayment.booking_ref);
  assert.equal(result.payment_id, 901);
  assert.equal(result.total_amount, 100);
  assert.equal(result.transitioned, true);
  assert.equal(result.bookingDetails.payment_status, 'Paid');
  assert.equal(snapshotRead, true);
  assert.equal(connection.queries.filter(query => query.sql.startsWith('UPDATE bookings')).length, 1);
  assert.equal(connection.queries.filter(query => query.sql.startsWith('INSERT INTO payments')).length, 1);
  assert.equal(connection.queries.some(query => query.sql.includes('WHERE b.id = ? FOR UPDATE')), true);
  assert.equal(connection.queries.some(query => query.sql.includes('WHERE booking_ref = ? FOR UPDATE')), false);
  assert.equal(connection.commits, 1);
  assert.equal(connection.rollbacks, 0);
  assert.equal(connection.releases, 1);
});

test('reads the full confirmation snapshot through the supplied transaction connection', async () => {
  const connection = {
    queries: [],
    async query(sql) {
      this.queries.push(sql);
      if (sql.includes('FROM bookings b')) {
        return [[{
          booking_id: 42,
          booking_ref: verifiedPayment.booking_ref,
          booking_status: 'Confirmed',
          total_amount: 100,
          payment_method: 'PhonePe',
          payment_status: 'Paid',
          parent_id: 1,
          parent_name: 'Parent',
          parent_email: 'parent@example.com',
          parent_phone: '9876543210',
          user_id: 7,
          event_id: null
        }], []];
      }
      if (sql.includes('FROM children c')) return [[{ child_id: 9, full_name: 'Child' }], []];
      if (sql.includes('FROM booking_games bg')) return [[], []];
      if (sql.includes('FROM payments')) return [[], []];
      throw new Error(`Unexpected snapshot query: ${sql}`);
    }
  };
  const model = loadModel(connection);

  const details = await model.getBookingById(42, connection);

  assert.equal(details.booking_id, 42);
  assert.equal(details.parent.user_id, 7);
  assert.equal(details.children.length, 1);
  assert.equal(connection.queries.length, 4);
});

test('returns the original booking and payment on an idempotent retry without writes', async () => {
  const connection = fakeConnection({
    booking: booking({ status: 'Confirmed', payment_status: 'Paid' }),
    payments: [{ id: 901, transaction_id: 'GATEWAY_TXN_1', payment_status: 'Paid' }]
  });
  const model = loadModel(connection);

  const result = await model.completePhonePeBooking(verifiedPayment);

  assert.equal(result.booking_id, 42);
  assert.equal(result.payment_id, 901);
  assert.equal(result.transitioned, false);
  assert.equal(result.bookingDetails, null);
  assert.equal(connection.queries.filter(query => /^(UPDATE|INSERT)/.test(query.sql)).length, 0);
  assert.equal(connection.commits, 1);
});

test('rejects duplicate booking references before selecting a booking to confirm', async () => {
  const connection = fakeConnection({ booking: booking(), references: [{ id: 42 }, { id: 43 }] });
  const model = loadModel(connection);

  await assert.rejects(
    model.completePhonePeBooking(verifiedPayment),
    error => error.statusCode === 409 && error.code === 'DUPLICATE_BOOKING_REFERENCE'
  );
  assert.equal(connection.queries.filter(query => /^(UPDATE|INSERT)/.test(query.sql)).length, 0);
  assert.equal(connection.rollbacks, 1);
});

test('rejects a known duplicate reference during initial booking creation', async () => {
  const connection = fakeConnection({ booking: booking(), references: [{ id: 42 }] });
  const model = loadModel(connection);

  await assert.rejects(
    model.createBooking({
      booking_ref: verifiedPayment.booking_ref,
      parent_name: 'Parent',
      email: 'parent@example.com',
      phone: '9876543210',
      user_id: 7,
      event_id: 3,
      total_amount: 100,
      children: []
    }),
    error => error.statusCode === 409 && error.code === 'DUPLICATE_BOOKING_REFERENCE'
  );
  assert.equal(connection.queries.filter(query => query.sql.startsWith('INSERT INTO bookings')).length, 0);
  assert.equal(connection.rollbacks, 1);
});

test('rejects a reference whose embedded user differs from the persisted parent', async () => {
  const connection = fakeConnection({ booking: booking({ user_id: 8 }) });
  const model = loadModel(connection);

  await assert.rejects(
    model.completePhonePeBooking(verifiedPayment),
    error => error.statusCode === 409 && error.code === 'BOOKING_USER_MISMATCH'
  );
  assert.equal(connection.queries.filter(query => /^(UPDATE|INSERT)/.test(query.sql)).length, 0);
  assert.equal(connection.rollbacks, 1);
});

test('rejects a verified amount that differs from the persisted booking total', async () => {
  const connection = fakeConnection({ booking: booking() });
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
    booking: booking({ status: 'Confirmed', payment_status: 'Paid' }),
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

test('rolls back confirmation writes when the transactional snapshot read fails', async () => {
  const connection = fakeConnection({ booking: booking() });
  const model = loadModel(connection);
  model.getBookingById = async () => { throw new Error('Snapshot read failed'); };

  await assert.rejects(model.completePhonePeBooking(verifiedPayment), /Snapshot read failed/);

  assert.equal(connection.commits, 0);
  assert.equal(connection.rollbacks, 1);
  assert.equal(connection.releases, 1);
});
