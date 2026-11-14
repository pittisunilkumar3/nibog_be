// Fixtures are synthetic; never a real key or customer identifier.
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
      merchantTransactionId: 'NIBOG_7_1760000000000',
      transactionId: 'GATEWAY_TXN_1',
      amount: 10000,
      ...overrides
    }
  };
}

test('accepts only a completed payment for the requested booking reference', async () => {
  let request;
  const result = await verifyPhonePePayment('NIBOG_7_1760000000000', {
    env,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return gatewayResponse(completedBody());
    }
  });

  assert.equal(result.merchantTransactionId, 'NIBOG_7_1760000000000');
  assert.equal(result.transactionId, 'GATEWAY_TXN_1');
  assert.equal(result.amountPaise, 10000);
  assert.match(request.url, /\/pg\/v1\/status\/MERCHANT_TEST\/NIBOG_7_1760000000000$/);
  assert.match(request.options.headers['X-VERIFY'], /^[a-f0-9]{64}###1$/);
});

test('rejects a merchant reference returned for a different booking', async () => {
  await assert.rejects(
    verifyPhonePePayment('NIBOG_7_1760000000000', {
      env,
      fetchImpl: async () => gatewayResponse(completedBody({ merchantTransactionId: 'NIBOG_7_1760000000001' }))
    }),
    error => error.statusCode === 409 && error.code === 'BOOKING_REFERENCE_MISMATCH'
  );
});

test('rejects pending gateway state instead of treating it as payment success', async () => {
  await assert.rejects(
    verifyPhonePePayment('NIBOG_7_1760000000000', {
      env,
      fetchImpl: async () => gatewayResponse({
        success: true,
        code: 'PAYMENT_PENDING',
        data: { state: 'PENDING', merchantTransactionId: 'NIBOG_7_1760000000000', amount: 10000 }
      })
    }),
    error => error.statusCode === 409 && error.code === 'PAYMENT_NOT_COMPLETED'
  );
});

test('uses the established Hermes production status endpoint without changing the signed path', async () => {
  let request;
  await verifyPhonePePayment('NIBOG_7_1760000000000', {
    env: {
      PHONEPE_ENVIRONMENT: 'production',
      PHONEPE_PROD_MERCHANT_ID: 'MERCHANT_TEST',
      PHONEPE_PROD_SALT_KEY: 'prod-salt',
      PHONEPE_PROD_SALT_INDEX: '1'
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return gatewayResponse(completedBody());
    }
  });

  assert.match(request.url, /^https:\/\/api\.phonepe\.com\/apis\/hermes\/pg\/v1\/status\//);
  assert.match(request.options.headers['X-VERIFY'], /^[a-f0-9]{64}###1$/);
});

test('rejects a completed response that omits merchant identity', async () => {
  await assert.rejects(
    verifyPhonePePayment('NIBOG_7_1760000000000', {
      env,
      fetchImpl: async () => gatewayResponse(completedBody({ merchantId: undefined }))
    }),
    error => error.statusCode === 409 && error.code === 'MERCHANT_MISMATCH'
  );
});
