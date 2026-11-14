const { test } = require('node:test');
const assert = require('node:assert/strict');

const controllerPath = require.resolve('../controller/bookingController');
const employeeModelPath = require.resolve('../model/employeeModel');
const routesPath = require.resolve('../routes/booking');

function loadCreateRoute() {
  const previousController = require.cache[controllerPath];
  const previousEmployeeModel = require.cache[employeeModelPath];
  const controller = new Proxy({
    createBooking: async (req, res) => res.status(201).json({ booking_id: 42 })
  }, {
    get: (target, property) => target[property] || (async (req, res) => res.status(200).json({}))
  });
  require.cache[controllerPath] = { id: controllerPath, filename: controllerPath, loaded: true, exports: controller };
  require.cache[employeeModelPath] = { id: employeeModelPath, filename: employeeModelPath, loaded: true, exports: { findByEmail: async () => [] } };
  delete require.cache[routesPath];
  const router = require(routesPath);
  delete require.cache[routesPath];
  if (previousController) require.cache[controllerPath] = previousController;
  else delete require.cache[controllerPath];
  if (previousEmployeeModel) require.cache[employeeModelPath] = previousEmployeeModel;
  else delete require.cache[employeeModelPath];
  return router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack;
}

function reqRes(body) {
  const req = { body, headers: {} };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
  return { req, res };
}

test('rejects unauthenticated manual paid booking requests before the controller', async () => {
  const [guard] = loadCreateRoute();
  const { req, res } = reqRes({ payment_status: 'Paid', payment_method: 'Cash' });
  let nextCalled = false;

  await guard.handle(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'No session token');
});

test('allows public pending PhonePe registration to reach the booking controller', async () => {
  const [guard] = loadCreateRoute();
  const { req, res } = reqRes({ booking: { payment_status: 'Pending', payment_method: 'PhonePe' } });
  let nextCalled = false;

  await guard.handle(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('lets PhonePe paid completion reach direct gateway verification without manual auth', async () => {
  const [guard] = loadCreateRoute();
  const { req, res } = reqRes({ payment_status: 'Paid', payment_method: 'PhonePe', booking_ref: 'NIB-20261114-1001' });
  let nextCalled = false;

  await guard.handle(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});
