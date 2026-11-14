const { test } = require('node:test');
const assert = require('node:assert/strict');

const paymentControllerPath = require.resolve('../controller/paymentController');
const employeeModelPath = require.resolve('../model/employeeModel');
const authMiddlewarePath = require.resolve('../controller/authMiddleware');
const paymentRoutesPath = require.resolve('../routes/payment');

test('rejects unauthenticated manual payment creation before the controller', async () => {
  const previous = new Map();
  const controller = new Proxy({}, {
    get: () => async (req, res) => res.status(201).json({ success: true })
  });
  const mocks = new Map([
    [paymentControllerPath, controller],
    [employeeModelPath, { findByEmail: async () => [] }],
    [authMiddlewarePath, { authenticateEmployee: async (req, res, next) => next() }]
  ]);
  for (const [path, exports] of mocks) {
    previous.set(path, require.cache[path]);
    require.cache[path] = { id: path, filename: path, loaded: true, exports };
  }
  delete require.cache[paymentRoutesPath];
  const router = require(paymentRoutesPath);
  delete require.cache[paymentRoutesPath];
  for (const [path, cache] of previous) {
    if (cache) require.cache[path] = cache;
    else delete require.cache[path];
  }

  const [guard] = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack;
  const req = { body: { booking_id: 42, amount: 100, payment_status: 'Paid' }, headers: {} };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  let nextCalled = false;

  await guard.handle(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'No session token');
});
