const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verifyPhonePePayment } = require('../controller/phonePeVerification');

const env = {
  PHONEPE_ENVIRONMENT: 'test',
  PHONEPE_TEST_MERCHANT_ID: 'MERCHANT_TEST',
  PHONEPE_TEST_SALT_KEY: 'test-salt',
  PHONEPE_TEST_SALT_INDEX: '1'
};

function gatewayResponse(body, ok = true, status = 200) {
  return { ok, status, text: async () => JSON.stringify(body) };
}

function completedBody(overrides = {}) {
  return {
    success: true,
    code: 'PAYMENT_SUCCESS',
    data: {
      state: 'COMPLETED',
      merchantId: 'MERCHANT_TEST',
      merchantTransactionId: 'NIB-20261114-1001',
      transactionId: 'GATEWAY_TXN_1',
      amount: 10000,
      ...overrides
    }
  };
}

test('accepts only a completed payment for the requested booking reference', async () => {
  let request;
  const result = await verifyPhonePePayment('NIB-20261114-1001', {
    env,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return gatewayResponse(completedBody());
    }
  });

  assert.equal(result.merchantTransactionId, 'NIB-20261114-1001');
  assert.equal(result.transactionId, 'GATEWAY_TXN_1');
  assert.equal(result.amountPaise, 10000);
  assert.match(request.url, /\/pg\/v1\/status\/MERCHANT_TEST\/NIB-20261114-1001$/);
  assert.match(request.options.headers['X-VERIFY'], /^[a-f0-9]{64}###1$/);
});

test('rejects a merchant reference returned for a different booking', async () => {
  await assert.rejects(
    verifyPhonePePayment('NIB-20261114-1001', {
      env,
      fetchImpl: async () => gatewayResponse(completedBody({ merchantTransactionId: 'NIB-20261114-9999' }))
    }),
    error => error.statusCode === 409 && error.code === 'BOOKING_REFERENCE_MISMATCH'
  );
});

test('rejects pending gateway state instead of treating it as payment success', async () => {
  await assert.rejects(
    verifyPhonePePayment('NIB-20261114-1001', {
      env,
      fetchImpl: async () => gatewayResponse({
        success: true,
        code: 'PAYMENT_PENDING',
        data: { state: 'PENDING', merchantTransactionId: 'NIB-20261114-1001', amount: 10000 }
      })
    }),
    error => error.statusCode === 409 && error.code === 'PAYMENT_NOT_COMPLETED'
  );
});
