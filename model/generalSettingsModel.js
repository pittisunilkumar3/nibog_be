const { promisePool } = require('../config/config');

const GeneralSettingsModel = {
  async get() {
    const [rows] = await promisePool.query('SELECT * FROM general_settings LIMIT 1');
    return rows[0];
  },
  async update(data) {
    // Only update the first row (id=1)
    const fields = [];
    const values = [];
    for (const key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
    values.push(1); // id=1
    const sql = `UPDATE general_settings SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await promisePool.execute(sql, values);
    return result;
  }
};

module.exports = GeneralSettingsModel;