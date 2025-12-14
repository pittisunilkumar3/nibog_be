const { promisePool } = require('../config/config');

const BabyGamesModel = {
  async getAll() {
    const [rows] = await promisePool.query('SELECT * FROM baby_games');
    return rows;
  },
  async getById(id) {
    const [rows] = await promisePool.query('SELECT * FROM baby_games WHERE id = ?', [id]);
    return rows[0] || null;
  },
  async create(data) {
    const {
      game_name, image_url, description, min_age, max_age, duration_minutes, categories, priority, is_active
    } = data;
    const [result] = await promisePool.query(
      'INSERT INTO baby_games (game_name, image_url, description, min_age, max_age, duration_minutes, categories, priority, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [game_name, image_url, description, min_age, max_age, duration_minutes, categories, priority, is_active]
    );
    return result;
  },
  async update(id, data) {
    const fields = [];
    const values = [];
    for (const key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
    values.push(id);
    const sql = `UPDATE baby_games SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await promisePool.execute(sql, values);
    return result;
  },
  async remove(id) {
    const [result] = await promisePool.query('DELETE FROM baby_games WHERE id = ?', [id]);
    return result;
  }
};

module.exports = BabyGamesModel;
