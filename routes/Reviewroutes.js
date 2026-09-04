const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const {
  getReviews,
  getMyReview,
  submitReview,
  deleteMyReview,
  adminDeleteReview,
} = require('../controllers/Reviewcontroller');

router.get('/', getReviews); // public
router.get('/me', protect, getMyReview);
router.post('/', protect, submitReview);
router.delete('/me', protect, deleteMyReview);
router.delete('/:id', protect, admin, adminDeleteReview); // ADMIN — après /me pour éviter le conflit

module.exports = router;