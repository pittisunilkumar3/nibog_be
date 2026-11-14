const crypto = require('crypto');

function verificationError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getPhonePeConfig(env) {
  const isTest = String(env.PHONEPE_ENVIRONMENT || 'production').toLowerCase() === 'test';
  const prefix = isTest ? 'PHONEPE_TEST' : 'PHONEPE_PROD';
  const merchantId = env[`${prefix}_MERCHANT_ID`];
  const saltKey = env[`${prefix}_SALT_KEY`];
  const saltIndex = env[`${prefix}_SALT_INDEX`];

  if (!merchantId || !saltKey || !saltIndex) {
    throw verificationError('PhonePe verification is not configured', 503, 'PHONEPE_NOT_CONFIGURED');
  }

  return {
    merchantId,
    saltKey,
    saltIndex,
    baseUrl: isTest ? 'https://api-preprod.phonepe.com/apis/pg-sandbox' : 'https://api.phonepe.com/apis/hermes'
  };
}

async function verifyPhonePePayment(merchantTransactionId, options = {}) {
  if (typeof merchantTransactionId !== 'string' || !/^NIBOG_\d+_\d+$/.test(merchantTransactionId) || merchantTransactionId.length > 38) {
    throw verificationError('A valid booking reference is required', 400, 'INVALID_BOOKING_REFERENCE');
  }

  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const config = getPhonePeConfig(env);
  const statusPath = `/pg/v1/status/${encodeURIComponent(config.merchantId)}/${encodeURIComponent(merchantTransactionId)}`;
  const xVerify = `${crypto.createHash('sha256').update(statusPath + config.saltKey).digest('hex')}###${config.saltIndex}`;

  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}${statusPath}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': config.merchantId
      },
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    throw verificationError('PhonePe verification is unavailable', 503, 'PHONEPE_UNAVAILABLE');
  }

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (error) {
    throw verificationError('PhonePe returned an invalid verification response', 502, 'INVALID_PHONEPE_RESPONSE');
  }

  if (!response.ok) {
    throw verificationError('PhonePe verification failed', 502, 'PHONEPE_VERIFICATION_FAILED');
  }

  const data = payload && payload.data ? payload.data : {};
  const state = data.state || data.paymentState;
  if (payload.success !== true || payload.code !== 'PAYMENT_SUCCESS' || state !== 'COMPLETED') {
    throw verificationError('PhonePe payment is not completed', 409, 'PAYMENT_NOT_COMPLETED');
  }
  if (data.merchantTransactionId !== merchantTransactionId) {
    throw verificationError('PhonePe merchant transaction does not match the booking', 409, 'BOOKING_REFERENCE_MISMATCH');
  }
  if (data.merchantId !== config.merchantId) {
    throw verificationError('PhonePe merchant does not match the backend configuration', 409, 'MERCHANT_MISMATCH');
  }
  if (!Number.isInteger(data.amount) || data.amount <= 0) {
    throw verificationError('PhonePe returned an invalid payment amount', 502, 'INVALID_PHONEPE_RESPONSE');
  }
  if (typeof data.transactionId !== 'string' || !data.transactionId.trim()) {
    throw verificationError('PhonePe returned no gateway transaction ID', 502, 'INVALID_PHONEPE_RESPONSE');
  }

  return {
    merchantTransactionId,
    transactionId: data.transactionId,
    amountPaise: data.amount,
    gatewayResponse: payload
  };
}

module.exports = { verifyPhonePePayment };
