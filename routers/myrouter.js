const express = require("express");
const router = express.Router();

const connectDB = require("../config/db")
const Member = require("../models/members");
const Product = require("../models/products")

router.get("/",  async (req, res) => {
  const title = "Home";
  try{
    const products = await Product.find();
    res.render("index",{
      title: title,
      products: products
    });
  }catch (err) {
    res.status(500).json({message:"ServerError", error: err.message })
  }
});

module.exports = router;
