const Review = require('../models/Review');

// GET /api/reviews — public, derniers avis (avec le nom de l'auteur)
// query optionnel : ?limit=100 (admin veut souvent tout voir)
const getReviews = async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const reviews = await Review.find()
      .populate('user', 'nom email')
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(reviews);
  } catch (error) {
    console.error('Erreur getReviews:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reviews/me — protégé, mon avis actuel s'il existe (null sinon)
const getMyReview = async (req, res) => {
  try {
    const review = await Review.findOne({ user: req.user._id });
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/reviews — protégé, crée OU met à jour l'avis de l'utilisateur (upsert)
const submitReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'La note doit être comprise entre 1 et 5' });
    }
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ message: 'Merci de laisser un commentaire' });
    }

    const review = await Review.findOneAndUpdate(
      { user: req.user._id },
      { rating, comment: comment.trim() },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate('user', 'nom');

    res.status(201).json(review);
  } catch (error) {
    console.error('Erreur submitReview:', error);
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/reviews/me — protégé, supprime mon propre avis
const deleteMyReview = async (req, res) => {
  try {
    await Review.findOneAndDelete({ user: req.user._id });
    res.json({ message: 'Avis supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/reviews/:id — ADMIN uniquement, supprime n'importe quel avis
const adminDeleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Avis non trouvé' });
    res.json({ message: 'Avis supprimé' });
  } catch (error) {
    console.error('Erreur adminDeleteReview:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getReviews,
  getMyReview,
  submitReview,
  deleteMyReview,
  adminDeleteReview,
};