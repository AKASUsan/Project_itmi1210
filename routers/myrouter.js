const express = require("express");
const router = express.Router();

const connectDB = require("../config/db")

router.get("/", (req, res) => {
  res.render("index");
});

module.exports = router;
