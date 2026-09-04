const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    hex: { type: String, required: true },
    image: { type: String, required: true }, // URL Cloudinary
    stockBySize: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['pants', 'hoodies', 'sweats', 'tshirts'],
    },
    sex: {
      type: String,
      required: true,
      enum: ['men', 'women', 'unisex'],
    },
    sizes: {
      type: [String],
      required: true,
    },
    colors: {
      type: [colorSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    isBestseller: {
      type: Boolean,
      default: false,
    },
    isPromo: {
      type: Boolean,
      default: false,
    },
    // Ancien prix affiché barré quand isPromo est true (facultatif)
    oldPrice: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);