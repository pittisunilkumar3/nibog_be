const PAID_STATES = new Set(['paid', 'success', 'successful', 'completed', 'confirmed']);

function inputError(message, code) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  return error;
}

function normalizeBookingPaymentInput(body = {}) {
  const sources = [];
  if (body.payment && typeof body.payment === 'object') {
    sources.push({
      status: body.payment.payment_status,
      method: body.payment.payment_method
    });
  }
  if (body.booking && typeof body.booking === 'object') {
    sources.push({
      status: body.booking.payment_status,
      method: body.booking.payment_method
    });
  }
  if (body.payment_status !== undefined || body.payment_method !== undefined) {
    sources.push({ status: body.payment_status, method: body.payment_method });
  }

  const statuses = new Set(sources.filter(source => source.status !== undefined && source.status !== null).map(source => String(source.status).toLowerCase().trim()));
  const methods = new Set(sources.filter(source => source.method !== undefined && source.method !== null).map(source => String(source.method).toLowerCase().trim()));
  if (statuses.size > 1 || methods.size > 1) {
    throw inputError('Conflicting payment status or method fields', 'CONFLICTING_PAYMENT_INPUT');
  }

  const paymentStatus = statuses.size ? [...statuses][0] : 'pending';
  const paymentMethod = methods.size ? [...methods][0] : '';
  return {
    paymentStatus: PAID_STATES.has(paymentStatus) ? 'Paid' : 'Pending',
    paymentMethod: sources.find(source => source.method !== undefined && source.method !== null)?.method || null,
    isPaid: PAID_STATES.has(paymentStatus),
    isPhonePe: paymentMethod === 'phonepe',
    bookingRef: body.booking_ref || body.booking?.booking_ref || null
  };
}

module.exports = { normalizeBookingPaymentInput };
