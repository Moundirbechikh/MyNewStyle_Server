const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getFavorites, toggleFavorite } = require('../controllers/favoriteController');

router.use(protect);

router.get('/', getFavorites);
router.post('/toggle/:productId', toggleFavorite);

module.exports = router;