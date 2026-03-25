const express = require("express");
const auth = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");

const Member = require("../models/members");
const Employee = require("../models/employees");
const Orders = require("../models/order");
const Cart = require("../models/cart");
const Product = require("../models/products");
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
    cb(null, uniqueSuffix + "." + fileExt);
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

auth.post("/updateprofile", upload.single("image"), async (req, res) => {
  try {
    const currentUser = req.session?.user || req.user;

    if (!currentUser) {
      return res.status(401).send("Unauthorized");
    }

    const userId = currentUser._id;
    const { name, phone, address } = req.body;
    let updateData = { name, phone, address };

    if (req.file) {
      updateData.image = req.file.filename;
    }

    let TargetModel = Member;
    if (currentUser.role === "admin" || currentUser.role === "staff") {
      TargetModel = Employee;
    }

    const updatedUser = await TargetModel.findByIdAndUpdate(
      userId,
      updateData,
      { returnDocument: "after" },
    );

    if (req.session && req.session.user) {
      req.session.user = updatedUser;
    }

    res.redirect("/profile");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
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

auth.get("/myorders", async (req, res) => {
  try {
    const title = "Orders";
    const userId = req.session.userId;

    const orders = await Orders.find({ userId: userId }).sort({
      createdAt: -1,
    });
    res.render("auth/orders", { title: title, orders: orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

auth.get("/cart", async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/signin");

    const cart = await Cart.findOne({ user: req.session.user._id }).populate(
      "items.product",
    );
    let populatedCart = [];
    let totalPrice = 0;

    if (cart && cart.items.length > 0) {
      populatedCart = cart.items.map((item) => {
        const subtotal = item.product.price * item.quantity;
        totalPrice += subtotal;
        return {
          _id: item.product._id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
        };
      });
    }

    res.render("auth/cart", {
      title: "Cart",
      cartItems: populatedCart,
      totalPrice: totalPrice,
    });
  } catch (error) {
    res.status(500).send("Error");
  }
});

auth.post("/cart/add", async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: "Please sign in to order!" });
  }
  try {
    const { productId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;
    const userId = req.session.user._id;

    let cart = await Cart.findOne({ user: userId });

    if (cart) {
      const itemIndex = cart.items.findIndex(
        (p) => p.product.toString() === productId,
      );
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += qty;
      } else {
        cart.items.push({ product: productId, quantity: qty });
      }
      await cart.save();
    } else {
      cart = await Cart.create({
        user: userId,
        items: [{ product: productId, quantity: qty }],
      });
    }

    const newCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);

    res.json({ 
      success: true, 
      message: "Added to cart successfully!", 
      newCount: newCount 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
auth.post("/cart/update", async (req, res) => {
  try {
    const { productId, action } = req.body;
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ user: userId });

    if (!cart) return res.json({ success: false });

    const item = cart.items.find((i) => i.product.toString() === productId);
    if (item) {
      if (action === "increase") item.quantity += 1;
      else if (action === "decrease") {
        if (item.quantity > 1) item.quantity -= 1;
        else
          cart.items = cart.items.filter(
            (i) => i.product.toString() !== productId,
          );
      }
      await cart.save();
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

auth.post("/cart/remove", async (req, res) => {
  try {
    const { productId } = req.body;
    await Cart.findOneAndUpdate(
      { user: req.session.user._id },
      { $pull: { items: { product: productId } } },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

module.exports = auth;
