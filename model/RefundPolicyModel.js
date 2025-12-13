// model/RefundPolicyModel.js
const { promisePool } = require('../config/config');

const RefundPolicyModel = {
  async getPolicy() {
    const [rows] = await promisePool.query('SELECT * FROM refund_policy ORDER BY id DESC LIMIT 1');
    return rows[0] || null;
  },
  async updatePolicy(text) {
    const [result] = await promisePool.query('INSERT INTO refund_policy (policy_text, updated_at) VALUES (?, NOW())', [text]);
    return result;
  }
};

module.exports = RefundPolicyModel;
