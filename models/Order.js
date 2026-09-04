const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String },
    size: { type: String, required: true },
    color: { type: String, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    total: {
      type: Number,
      required: true,
    },
    nomDestinataire: { type: String, required: true },
    telephone: { type: String, required: true },
    adresseLivraison: { type: String, required: true },
    ville: { type: String, required: true },
    notes: { type: String },
    statut: {
      type: String,
      enum: ['en_attente', 'confirmee', 'expediee', 'livree', 'annulee', 'retournee'],
      default: 'en_attente',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);