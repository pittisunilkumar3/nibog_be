
// model/employeeModel.js
// Employee model for database operations

const { promisePool } = require('../config/config');

const EmployeeModel = {
    // Change password by employee ID
    async changePasswordById(id, newPassword) {
      const [result] = await promisePool.query(
        'UPDATE employee SET password = ? WHERE id = ? AND is_active = 1',
        [newPassword, id]
      );
      return result;
    },
  async findByEmailOrId(email, employee_id) {
    const [rows] = await promisePool.query(
      'SELECT * FROM employee WHERE email = ? OR employee_id = ?',
      [email, employee_id]
    );
    return rows;
  },

  async createEmployee(employeeData) {
    const [result] = await promisePool.query(
      `INSERT INTO employee (
        employee_id, department, designation, qualification, work_exp,
        name, surname, father_name, mother_name, contact_no, emeregency_contact_no,
        email, dob, marital_status, date_of_joining, local_address, permanent_address,
        password, gender, acount_title, bank_account_no, bank_name, ifsc_code,
        bank_branch, payscale, basic_salary, epf_no, contract_type, shift, location,
        resume, joining_letter, resignation_letter, other_document_name, other_document_file,
        is_active, is_superadmin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)` ,
      [
        employeeData.employee_id, employeeData.department, employeeData.designation, employeeData.qualification, employeeData.work_exp,
        employeeData.name, employeeData.surname, employeeData.father_name, employeeData.mother_name, employeeData.contact_no, employeeData.emeregency_contact_no,
        employeeData.email, employeeData.dob, employeeData.marital_status, employeeData.date_of_joining, employeeData.local_address, employeeData.permanent_address,
        employeeData.password, employeeData.gender, employeeData.acount_title, employeeData.bank_account_no, employeeData.bank_name, employeeData.ifsc_code,
        employeeData.bank_branch, employeeData.payscale, employeeData.basic_salary, employeeData.epf_no, employeeData.contract_type, employeeData.shift, employeeData.location,
        '', '', '', '', '',
        employeeData.is_superadmin || 0
      ]
    );
    return result;
  },

  async findByEmail(email) {
    const [rows] = await promisePool.query(
      'SELECT * FROM employee WHERE email = ? AND is_active = 1',
      [email]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await promisePool.query(
      'SELECT * FROM employee WHERE id = ? AND is_active = 1',
      [id]
    );
    return rows;
  },

  async listActiveEmployees() {
    const [rows] = await promisePool.query(
      'SELECT id, employee_id, name, surname, email, department, designation, is_superadmin, is_active FROM employee WHERE is_active = 1'
    );
    return rows;
  }
};

module.exports = EmployeeModel;
