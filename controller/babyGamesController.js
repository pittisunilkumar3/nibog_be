const BabyGamesModel = require('../model/babyGamesModel');

exports.getAllGames = async (req, res) => {
  try {
    const games = await BabyGamesModel.getAll();
    res.json({ success: true, games });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching games', error: error.message });
  }
};

exports.getGameById = async (req, res) => {
  try {
    const game = await BabyGamesModel.getById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }
    res.json({ success: true, game });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching game', error: error.message });
  }
};

exports.createGame = async (req, res) => {
  try {
    const result = await BabyGamesModel.create(req.body);
    res.status(201).json({ success: true, message: 'Game created', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating game', error: error.message });
  }
};

exports.updateGame = async (req, res) => {
  try {
    const result = await BabyGamesModel.update(req.params.id, req.body);
    res.json({ success: true, message: 'Game updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating game', error: error.message });
  }
};

exports.deleteGame = async (req, res) => {
  try {
    const result = await BabyGamesModel.remove(req.params.id);
    res.json({ success: true, message: 'Game deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting game', error: error.message });
  }
};
