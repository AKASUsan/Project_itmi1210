const express = require("express");
const auth = express.Router();
const bcrypt = require("bcryptjs");

const Member = require("../models/members");
const Employee = require("../models/employees");

auth.get("/register", (req, res) => {
  res.render("auth/register");
});

auth.get("/signin", (req, res) => {
  const message = req.session.message;
  req.session.message = null;
  res.render("auth/signin", { message: req.session.message });
});

auth.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/signin");
  });
});

auth.post("/register", async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body;
  const oldData = { name, email, phone };

  if (password !== confirmPassword) {
    req.session.old = oldData;
    return res.render("auth/register", {
      error: "Password do not match",
      old: oldData,
    });
  }
  try {
    const existingMember = await Member.findOne({ email: email });
    if (existingMember) {
      return res.render("auth/register", {
        error: "Email already exists",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newMember = new Member({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    const savedMember = await newMember.save();
    req.session.user = {
      _id: savedMember._id,
      name: savedMember.name,
      email: savedMember.email,
      image: savedMember.image,
    };

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.render("auth/register", { error: "Error registering user" });
  }
});

auth.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await Member.findOne({ email });
    let isEmployee = false;

    if (!user) {
      user = await Employee.findOne({ email });
      if (user) isEmployee = true;
    }

    if (!user || !(await user.comparePassword(password))) {
      req.session.message = "Invalid email or password";
      return res.redirect("/signin");
    }

    req.session.user = user;
    req.session.role = isEmployee ? user.role : "member";

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).json("auth/signin", { error: "Error Sign in user" });
  }
});

module.exports = auth;
