const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: String,
    description: String,

    category: { type: String, default: "Ramen" },
    brothType: {
      type: String,
      enum: ["Tonkotsu", "Shoyu", "Miso", "Shio", "Other"],
    },
    noodleType: {
      type: String,
      enum: ["Thin", "Standard", "Thick"],
    },
    spicyLevel: { type: Number, min: 0, max: 5, default: 0 },
    toppings: [String],

    allergens: [String],
    isVegetarian: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

const Product = mongoose.model("Product", ProductSchema);
module.exports = Product;

module.exports.saveProduct = async function (data) {
  try {
    const newProduct = new Product(data);
    return await newProduct.save();
  } catch (error) {
    throw new Error("Error saving product: " + error.message);
  }
};
