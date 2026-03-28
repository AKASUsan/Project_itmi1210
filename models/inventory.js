const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  quantity: { type: Number, default: 0, min: 0 },
  unit: { type: String, default: 'pcs' },
  minThreshold: { type: Number, default: 10 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ingredient', ingredientSchema);