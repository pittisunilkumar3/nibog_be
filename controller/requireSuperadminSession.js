const jwt = require('jsonwebtoken');
const EmployeeModel = require('../model/employeeModel');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
module.exports = async (req, res, next) => {
  try {
    const raw = req.headers['x-superadmin-token'];
    if (!raw) {
      return res.status(401).json({ success: false, message: 'No session token' });
    }

    // Extract the JWT from the raw cookie value
    let jwtToken = raw;
    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (parsed && typeof parsed === 'object' && parsed.token) {
        jwtToken = parsed.token;
      }
    } catch (e) { /* not JSON - treat whole value as JWT */ }

    // Verify signature
    let decoded;
    try {
      decoded = jwt.verify(jwtToken, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (decoded.is_superadmin !== 1) {
      return res.status(403).json({ success: false, message: 'Not a superadmin' });
    }

    // Check current DB state: account must still be superadmin and epoch must match
    const employees = await EmployeeModel.findByEmail(decoded.email);
    if (employees.length === 0) {
      return res.status(401).json({ success: false, message: 'Account not found' });
    }
    const employee = employees[0];

    if (employee.is_superadmin !== 1) {
      return res.status(403).json({ success: false, message: 'Superadmin access revoked' });
    }

    const currentEpoch = employee.session_epoch || 0;
    if ((decoded.session_epoch || 0) !== currentEpoch) {
      return res.status(401).json({ success: false, message: 'Session expired - please login again' });
    }

    return next();
  } catch (error) {
    console.error('validateSuperadmin error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
