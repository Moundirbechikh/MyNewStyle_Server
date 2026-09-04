const Product = require('../models/Product');

// GET /api/products — PUBLIC, ne montre que les produits actifs
const getProducts = async (req, res) => {
  try {
    const { sex, category, mode, search, limit } = req.query;
    const filter = { active: true };

    if (sex && sex !== 'all') filter.sex = sex;
    if (category && category !== 'all') filter.category = category;
    if (mode === 'bestseller') filter.isBestseller = true;
    if (mode === 'promo') filter.isPromo = true;

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { description: regex }];
    }

    let query = Product.find(filter).sort({ createdAt: -1 });
    if (limit) query = query.limit(Number(limit));

    const products = await query;
    res.json(products);
  } catch (error) {
    console.error('Erreur getProducts:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/products/admin/all — ADMIN, montre TOUT (actifs et désactivés)
const getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Erreur getAllProductsAdmin:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/products/:id — public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/products — ADMIN uniquement
const createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Erreur createProduct:', error);
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/products/:id — ADMIN uniquement (infos générales, promo, bestseller, actif...)
const updateProduct = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Produit non trouvé' });
    res.json(updated);
  } catch (error) {
    console.error('Erreur updateProduct:', error);
    res.status(400).json({ message: error.message });
  }
};

// PATCH /api/products/:id/stock — ADMIN uniquement
// body: { colorName, size, quantity }
// Mise à jour rapide et ciblée d'UNE seule case de stock, sans renvoyer tout le produit
const updateStock = async (req, res) => {
  try {
    const { colorName, size, quantity } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });

    const colorObj = product.colors.find((c) => c.name === colorName);
    if (!colorObj) return res.status(404).json({ message: 'Couleur non trouvée sur ce produit' });

    colorObj.stockBySize.set(size, Math.max(Number(quantity) || 0, 0));
    product.markModified('colors');
    await product.save();

    res.json(product);
  } catch (error) {
    console.error('Erreur updateStock:', error);
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/products/:id — ADMIN uniquement
const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Produit non trouvé' });
    res.json({ message: 'Produit supprimé' });
  } catch (error) {
    console.error('Erreur deleteProduct:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getAllProductsAdmin,
  getProductById,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
};