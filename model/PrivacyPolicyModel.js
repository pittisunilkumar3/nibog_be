// model/PrivacyPolicyModel.js
const { promisePool } = require('../config/config');

const PrivacyPolicyModel = {
  async getPolicy() {
    const [rows] = await promisePool.query('SELECT * FROM privacy_policy ORDER BY id DESC LIMIT 1');
    return rows[0] || null;
  },
  async updatePolicy(text) {
    // Update the latest row if exists, otherwise insert
    const [rows] = await promisePool.query('SELECT id FROM privacy_policy ORDER BY id DESC LIMIT 1');
    if (rows.length > 0) {
      // Update the latest row
      const id = rows[0].id;
      const [result] = await promisePool.query('UPDATE privacy_policy SET html_content = ? WHERE id = ?', [text, id]);
      return result;
    } else {
      // Insert if no row exists
      const [result] = await promisePool.query('INSERT INTO privacy_policy (html_content) VALUES (?)', [text]);
      return result;
    }
  }
};

module.exports = PrivacyPolicyModel;
