const { test } = require('node:test');
const assert = require('node:assert/strict');

const controllerPath = require.resolve('../controller/bookingController');
const employeeModelPath = require.resolve('../model/employeeModel');
const routesPath = require.resolve('../routes/booking');

function loadBookingRouter() {
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
  return router;
}

function loadRoute(path, method) {
  return loadBookingRouter().stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack;
}

function loadCreateRoute() {
  return loadRoute('/', 'post');
}

function loadPatchRoute() {
  return loadRoute('/:id', 'patch');
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
  const { req, res } = reqRes({ payment_status: 'Paid', payment_method: 'PhonePe', booking_ref: 'NIBOG_7_1760000000000' });
  let nextCalled = false;

  await guard.handle(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('rejects conflicting payment payload shapes before authorization or writes', async () => {
  const [guard] = loadCreateRoute();
  const { req, res } = reqRes({
    payment_status: 'Paid',
    payment_method: 'Cash',
    booking: { payment_status: 'Paid', payment_method: 'PhonePe' }
  });
  let nextCalled = false;

  await guard.handle(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, 'CONFLICTING_PAYMENT_INPUT');
});

test('rejects unauthenticated booking edits before the controller', async () => {
  const [guard] = loadPatchRoute();
  const { req, res } = reqRes({ status: 'Confirmed', payment_status: 'Paid' });
  let nextCalled = false;

  await guard.handle(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});
