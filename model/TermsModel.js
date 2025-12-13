// model/TermsModel.js
const { promisePool } = require('../config/config');

const TermsModel = {
  async getTerms() {
    const [rows] = await promisePool.query('SELECT * FROM terms_conditions ORDER BY id DESC LIMIT 1');
    return rows[0] || null;
  },
  async updateTerms(text) {
    const [result] = await promisePool.query('INSERT INTO terms_conditions (terms_text, updated_at) VALUES (?, NOW())', [text]);
    return result;
  }
};

module.exports = TermsModel;
