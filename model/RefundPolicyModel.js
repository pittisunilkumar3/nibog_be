// model/RefundPolicyModel.js
const { promisePool } = require('../config/config');

const RefundPolicyModel = {
  async getPolicy() {
    const [rows] = await promisePool.query('SELECT * FROM refund_policy ORDER BY id DESC LIMIT 1');
    return rows[0] || null;
  },
  async updatePolicy(text) {
    // Update the latest row if exists, otherwise insert
    const [rows] = await promisePool.query('SELECT id FROM refund_policy ORDER BY id DESC LIMIT 1');
    if (rows.length > 0) {
      const id = rows[0].id;
      const [result] = await promisePool.query('UPDATE refund_policy SET html_content = ? WHERE id = ?', [text, id]);
      return result;
    } else {
      const [result] = await promisePool.query('INSERT INTO refund_policy (html_content) VALUES (?)', [text]);
      return result;
    }
  }
};

module.exports = RefundPolicyModel;
