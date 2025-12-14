// model/TermsModel.js
const { promisePool } = require('../config/config');

const TermsModel = {
  async getTerms() {
    const [rows] = await promisePool.query('SELECT * FROM terms_conditions ORDER BY id DESC LIMIT 1');
    return rows[0] || null;
  },
  async updateTerms(text) {
    // Update the latest row if exists, otherwise insert
    const [rows] = await promisePool.query('SELECT id FROM terms_conditions ORDER BY id DESC LIMIT 1');
    if (rows.length > 0) {
      const id = rows[0].id;
      const [result] = await promisePool.query('UPDATE terms_conditions SET html_content = ? WHERE id = ?', [text, id]);
      return result;
    } else {
      const [result] = await promisePool.query('INSERT INTO terms_conditions (html_content) VALUES (?)', [text]);
      return result;
    }
  }
};

module.exports = TermsModel;
