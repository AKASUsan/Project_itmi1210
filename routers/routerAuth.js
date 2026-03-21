const express = require("express");
const auth = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Member = require("../models/members");
const Employee = require("../models/employees");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const currentUser = req.session?.user || req.user;

    const folder =
      currentUser &&
      (currentUser.role === "admin" || currentUser.role === "staff")
        ? "./public/images/employeeProfile/"
        : "./public/images/profile/";

    cb(null, folder);
  },
  filename: function (req, file, cb) {
    const fileExt = file.originalname.split(".").pop();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + "." + fileExt);
  },
});

const upload = multer({ storage: storage });

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

auth.get("/profile", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }
  try {
    const title = "Profile";
    let user =
      (await Member.findById(req.session.user._id)) ||
      (await Employee.findById(req.session.user._id));

    if (!user) {
      req.session.destroy();
      return res.redirect("/signin");
    }
    res.render("auth/profile", {
      title: title,
      user: user,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

auth.post('/updateprofile', upload.single('image'), async (req, res) => {
    try {
        const currentUser = req.session?.user || req.user;
        
        if (!currentUser) {
            return res.status(401).send('Unauthorized');
        }

        const userId = currentUser._id; 
        const { name, phone, address } = req.body;
        let updateData = { name, phone, address };

        if (req.file) {
            updateData.image = req.file.filename; 
        }

        let TargetModel = Member;
        if (currentUser.role === 'admin' || currentUser.role === 'staff') {
            TargetModel = Employee;
        }

       const updatedUser = await TargetModel.findByIdAndUpdate(userId, updateData, { returnDocument: 'after' });

        if (req.session && req.session.user) {
            req.session.user = updatedUser;
        }

        res.redirect('/profile'); 

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
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
