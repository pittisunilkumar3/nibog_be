// model/PrivacyPolicyModel.js
const { promisePool } = require('../config/config');

const PrivacyPolicyModel = {
  async getPolicy() {
    const [rows] = await promisePool.query('SELECT * FROM privacy_policy ORDER BY id DESC LIMIT 1');
    return rows[0] || null;
  },
  async updatePolicy(text) {
    // Insert new version (history), or update if only one row is needed
    const [result] = await promisePool.query('INSERT INTO privacy_policy (html_content) VALUES (?)', [text]);
    return result;
  }
};

module.exports = PrivacyPolicyModel;
