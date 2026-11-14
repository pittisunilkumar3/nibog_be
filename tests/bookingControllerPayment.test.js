const { test } = require('node:test');
const assert = require('node:assert/strict');

const controllerPath = require.resolve('../controller/bookingController');
const bookingModelPath = require.resolve('../model/bookingModel');
const verifierPath = require.resolve('../controller/phonePeVerification');
const emailModelPath = require.resolve('../model/emailSettingsModel');
const configPath = require.resolve('../config/config');
const qrCodePath = require.resolve('qrcode');
const jsPdfPath = require.resolve('jspdf');

function loadController({ bookingModel, verifyPhonePePayment, sendEmail }) {
  const mocks = new Map([
    [bookingModelPath, bookingModel],
    [verifierPath, { verifyPhonePePayment }],
    [emailModelPath, { sendEmail }],
    [configPath, { promisePool: { query: async () => [[], []] } }],
    [qrCodePath, { toBuffer: async () => { throw new Error('Ticket generation skipped in controller test'); } }],
    [jsPdfPath, { jsPDF: class {} }]
  ]);
  const previous = new Map();
  for (const [path, exports] of mocks) {
    previous.set(path, require.cache[path]);
    require.cache[path] = { id: path, filename: path, loaded: true, exports };
  }
  delete require.cache[controllerPath];
  const controller = require(controllerPath);
  delete require.cache[controllerPath];
  for (const [path, cache] of previous) {
    if (cache) require.cache[path] = cache;
    else delete require.cache[path];
  }
  return controller;
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function bookingDetails(overrides = {}) {
  return {
    booking_id: 42,
    booking_ref: 'NIB-20261114-1001',
    total_amount: 100,
    payment_status: 'Paid',
    parent: { name: 'Test Parent', email: 'parent@example.com', phone: '9876543210' },
    event: { name: 'Test Event', date: '2026-11-20', venue: {} },
    children: [],
    payments: [],
    ...overrides
  };
}

test('creates an initial PhonePe booking as Pending without confirmation email', async () => {
  let createdData;
  let emailCount = 0;
  const controller = loadController({
    bookingModel: {
      createBooking: async data => {
        createdData = data;
        return { booking_id: 42, booking_ref: 'NIB-20261114-1001', payment_id: null };
      },
      getBookingById: async () => bookingDetails({ payment_status: 'Pending', status: 'Pending' })
    },
    verifyPhonePePayment: async () => { throw new Error('Initial registration must not verify payment'); },
    sendEmail: async () => { emailCount += 1; }
  });
  const req = {
    body: {
      user_id: 7,
      parent: { parent_name: 'Test Parent', email: 'parent@example.com', additional_phone: '9876543210' },
      child: { full_name: 'Child', date_of_birth: '2020-01-01', gender: 'Female', school_name: 'School' },
      booking: { event_id: 3, total_amount: 100, payment_method: 'PhonePe', payment_status: 'Pending' },
      booking_games: [{ game_id: 4, slot_id: 5, game_price: 100 }]
    }
  };
  const res = responseRecorder();

  await controller.createBooking(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.booking_id, 42);
  assert.equal(res.body.booking_ref, 'NIB-20261114-1001');
  assert.equal(res.body.total_amount, 100);
  assert.equal(createdData.status, 'Pending');
  assert.equal(createdData.payment_status, 'Pending');
  assert.equal(emailCount, 0);
});

test('verifies before transitioning and sends one confirmation round, none on retry', async () => {
  let verificationCount = 0;
  let completionCount = 0;
  let emailCount = 0;
  let transitioned = true;
  let notifyEmails;
  const emailsSent = new Promise(resolve => { notifyEmails = resolve; });
  const controller = loadController({
    bookingModel: {
      completePhonePeBooking: async data => {
        completionCount += 1;
        assert.equal(data.booking_ref, 'NIB-20261114-1001');
        assert.equal(data.amountPaise, 10000);
        return { booking_id: 42, booking_ref: data.booking_ref, payment_id: 901, total_amount: 100, transitioned };
      },
      getBookingById: async () => bookingDetails()
    },
    verifyPhonePePayment: async reference => {
      verificationCount += 1;
      return { merchantTransactionId: reference, transactionId: 'GATEWAY_TXN_1', amountPaise: 10000, gatewayResponse: { success: true } };
    },
    sendEmail: async () => {
      emailCount += 1;
      if (emailCount === 2) notifyEmails();
    }
  });
  const req = {
    body: {
      booking_ref: 'NIB-20261114-1001',
      payment_status: 'Paid',
      payment_method: 'PhonePe',
      payment: { transaction_id: 'GATEWAY_TXN_1', amount: 100, payment_method: 'PhonePe', payment_status: 'Paid' }
    }
  };

  const firstResponse = responseRecorder();
  await controller.createBooking(req, firstResponse);
  await emailsSent;

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(firstResponse.body.booking_id, 42);
  assert.equal(firstResponse.body.payment_id, 901);
  assert.equal(firstResponse.body.already_completed, false);
  assert.equal(verificationCount, 1);
  assert.equal(completionCount, 1);
  assert.equal(emailCount, 2);

  transitioned = false;
  const retryResponse = responseRecorder();
  await controller.createBooking(req, retryResponse);

  assert.equal(retryResponse.body.already_completed, true);
  assert.equal(retryResponse.body.booking_id, 42);
  assert.equal(retryResponse.body.payment_id, 901);
  assert.equal(verificationCount, 2);
  assert.equal(completionCount, 2);
  assert.equal(emailCount, 2);
});

test('does not write or send confirmation when backend verification rejects paid input', async () => {
  let completionCount = 0;
  let emailCount = 0;
  const controller = loadController({
    bookingModel: {
      completePhonePeBooking: async () => { completionCount += 1; }
    },
    verifyPhonePePayment: async () => {
      const error = new Error('PhonePe payment is not completed');
      error.statusCode = 409;
      error.code = 'PAYMENT_NOT_COMPLETED';
      throw error;
    },
    sendEmail: async () => { emailCount += 1; }
  });
  const res = responseRecorder();

  await controller.createBooking({ body: { booking_ref: 'NIB-20261114-1001', payment_status: 'Paid', payment_method: 'PhonePe' } }, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'PAYMENT_NOT_COMPLETED');
  assert.equal(completionCount, 0);
  assert.equal(emailCount, 0);
});
