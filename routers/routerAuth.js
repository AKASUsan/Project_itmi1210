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
    const title = "Sign In - Kaizen Ramen";
    const message = req.session.message;
    req.session.message = null; 
    
    res.render("auth/signin", { 
        message: message,
        title: title 
    });
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
      (await Member.findById(req.session.user._id).lean()) ||
      (await Employee.findById(req.session.user._id).lean());

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

    if (!email || !password) {
      req.session.message = "Please enter both email and password";
      return res.redirect("/signin");
    }

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
    const role = isEmployee ? user.role : "member";
    req.session.role = role;

    if (role === "admin") {
      return res.redirect("/dashboard"); 
    } else if (role === "staff") {
      return res.redirect("/pos");
    } else {
      return res.redirect("/");
    }
  } catch (err) {
    console.error(err);
    res.status(500).render("auth/signin", { error: "Error Sign in user" });
  }
});

auth.get("/myorders", async (req, res) => {
  try {
    const title = "Orders";
    const userId = req.session.userId;

    const orders = await Orders.find({ memberId: req.session.user?._id }).sort({
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
      cart.items.forEach((item) => {
        if (item.product) {
          const subtotal = (item.product.price || 0) * (item.quantity || 0);
          totalPrice += subtotal;
          populatedCart.push({
            _id: item.product._id,
            name: item.product.name,
            price: item.product.price,
            image: item.product.image,
            quantity: item.quantity,
            isBundle: false,
          });
        }
      });
    }

    if (req.session.cart && Array.isArray(req.session.cart)) {
      req.session.cart.forEach((promo) => {
        const subtotal = (promo.price || 0) * (promo.quantity || 0);
        totalPrice += subtotal;
        populatedCart.push({
          _id: promo._id,
          promoId: promo._id,
          name: promo.name,
          price: promo.price,
          image: promo.image,
          quantity: promo.quantity,
          isBundle: true,
        });
      });
    }

    res.render("auth/cart", {
      title: "Cart",
      cartItems: populatedCart,
      totalPrice: totalPrice,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error: " + error.message);
  }
});

auth.post("/cart/add", async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: "Please sign in to order!" });
  }
  try {
    const { productId, promoId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;
    const userId = req.session.user._id;

    if (promoId) {
      const Promotion = require("../models/promotion");
      const promo = await Promotion.findById(promoId);
      if (!promo)
        return res.json({ success: false, message: "Promotion not found" });

      if (!req.session.cart) req.session.cart = [];
      const existingIndex = req.session.cart.findIndex(
        (item) => item.promoId === promoId,
      );

      if (existingIndex > -1) {
        req.session.cart[existingIndex].quantity += qty;
      } else {
        req.session.cart.push({
          _id: promo._id,
          promoId: promo._id,
          name: promo.title,
          price: promo.discountedPrice,
          image: promo.imageFilename,
          quantity: qty,
          isBundle: true,
        });
      }
    } else if (productId) {
      let cart = await Cart.findOne({ user: userId });
      if (!cart) {
        cart = new Cart({ user: userId, items: [] });
      }

      const itemIndex = cart.items.findIndex(
        (p) => p.product.toString() === productId,
      );
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += qty;
      } else {
        cart.items.push({ product: productId, quantity: qty });
      }
      await cart.save();
    }

    const finalCart = await Cart.findOne({ user: userId });
    const dbCount = finalCart
      ? finalCart.items.reduce((acc, item) => acc + item.quantity, 0)
      : 0;
    const sessionCount = (req.session.cart || []).reduce(
      (acc, item) => acc + item.quantity,
      0,
    );

    res.json({
      success: true,
      message: "Added to cart successfully!",
      newCount: dbCount + sessionCount,
    });
  } catch (error) {
    console.error("Add to Cart Error:", error);
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

      const dbCount = cart.items.reduce((acc, i) => acc + i.quantity, 0);
      const sessionCount = (req.session.cart || []).reduce(
        (acc, i) => acc + i.quantity,
        0,
      );

      res.json({ success: true, newCount: dbCount + sessionCount });
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
    const userId = req.session.user._id;

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { product: productId } } },
      { returnDocument: "after" },
    );

    if (req.session.cart) {
      req.session.cart = req.session.cart.filter(
        (item) => item._id !== productId,
      );
    }

    const dbCount = cart
      ? cart.items.reduce((acc, i) => acc + i.quantity, 0)
      : 0;
    const sessionCount = (req.session.cart || []).reduce(
      (acc, i) => acc + i.quantity,
      0,
    );

    res.json({
      success: true,
      newCount: dbCount + sessionCount,
    });
  } catch (error) {
    console.error("Remove Error:", error);
    res.status(500).json({ success: false });
  }
});

module.exports = auth;