// Change Password
exports.changePassword = async (req, res) => {
  try {
    const employeeId = req.employee.id; // From auth middleware
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required'
      });
    }
    // Get employee
    const employees = await EmployeeModel.findById(employeeId);
    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    const employee = employees[0];
    // Check old password
    const isMatch = await bcrypt.compare(oldPassword, employee.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Old password is incorrect'
      });
    }
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await EmployeeModel.changePasswordById(employeeId, hashedNewPassword);
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const EmployeeModel = require('../model/employeeModel');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Employee Register
exports.register = async (req, res) => {
  try {
    const {
      employee_id, department, designation, qualification, work_exp,
      name, surname, father_name, mother_name, contact_no, emeregency_contact_no,
      email, dob, marital_status, date_of_joining, local_address, permanent_address,
      password, gender, acount_title, bank_account_no, bank_name, ifsc_code,
      bank_branch, payscale, basic_salary, epf_no, contract_type, shift, location,
      is_superadmin
    } = req.body;

    // Check if employee already exists
    const existingEmployee = await EmployeeModel.findByEmailOrId(email, employee_id);
    if (existingEmployee.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this email or employee ID already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert employee
    const employeeData = {
      employee_id, department, designation, qualification, work_exp,
      name, surname, father_name, mother_name, contact_no, emeregency_contact_no,
      email, dob, marital_status, date_of_joining, local_address, permanent_address,
      password: hashedPassword, gender, acount_title, bank_account_no, bank_name, ifsc_code,
      bank_branch, payscale, basic_salary, epf_no, contract_type, shift, location,
      is_superadmin
    };
    const result = await EmployeeModel.createEmployee(employeeData);

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      employee_id: result.insertId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering employee',
      error: error.message
    });
  }
};

// Employee Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find employee
    const employees = await EmployeeModel.findByEmail(email);
    if (employees.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    const employee = employees[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, employee.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: employee.id,
        email: employee.email,
        employee_id: employee.employee_id,
        is_superadmin: employee.is_superadmin
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    delete employee.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      employee: {
        id: employee.id,
        employee_id: employee.employee_id,
        name: employee.name,
        surname: employee.surname,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        is_superadmin: employee.is_superadmin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
};


// Get Employee Profile
exports.getProfile = async (req, res) => {
  try {
    const employeeId = req.employee.id; // From auth middleware

    const employees = await EmployeeModel.findById(employeeId);
    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    const employee = employees[0];
    delete employee.password;
    res.status(200).json({
      success: true,
      employee
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// List Employees (Protected, Superadmin only)
exports.listEmployees = async (req, res) => {
  try {
    // Only superadmin can list all employees (enforced in route)
    const employees = await EmployeeModel.listActiveEmployees();
    res.status(200).json({
      success: true,
      employees
    });
  } catch (error) {
    console.error('List employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};
