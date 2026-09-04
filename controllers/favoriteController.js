const mongoose = require('mongoose');
const User = require('../models/User');

// GET /api/favorites — retourne les produits favoris complets de l'utilisateur
const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    res.json(user.favorites);
  } catch (error) {
    console.error('Erreur getFavorites:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/favorites/toggle/:productId — ajoute si absent, retire si présent
const toggleFavorite = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Identifiant produit invalide' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const alreadyFavorite = user.favorites.some((id) => id.toString() === productId);

    // Mise à jour atomique (ne revalide pas les autres champs du document,
    // contrairement à user.save() qui exige que TOUS les champs requis
    // soient présents sur l'instance en mémoire)
    let updatedUser;
    if (alreadyFavorite) {
      updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { favorites: productId } },
        { new: true }
      );
    } else {
      updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { favorites: productId } },
        { new: true }
      );
    }

    res.json({ isFavorite: !alreadyFavorite, favorites: updatedUser.favorites });
  } catch (error) {
    console.error('Erreur toggleFavorite:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getFavorites, toggleFavorite };