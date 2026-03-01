const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    console.log("Hello")
  res.render("index");
});

module.exports = router;
