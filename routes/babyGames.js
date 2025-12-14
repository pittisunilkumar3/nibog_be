const express = require('express');
const router = express.Router();
const babyGamesController = require('../controller/babyGamesController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// GET all games (public)
router.get('/', babyGamesController.getAllGames);

// GET game by id (public)
router.get('/:id', babyGamesController.getGameById);

// CREATE new game (protected)
router.post('/', authenticateEmployee, babyGamesController.createGame);

// UPDATE game by id (protected)
router.put('/:id', authenticateEmployee, babyGamesController.updateGame);

// DELETE game by id (protected)
router.delete('/:id', authenticateEmployee, babyGamesController.deleteGame);

module.exports = router;
