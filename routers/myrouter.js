const express = require("express");
const router = express.Router();

const connectDB = require("../config/db");
const Employee = require("../models/employees");
const Product = require("../models/products");
const Member = require("../models/members");
const Order = require("../models/order");
const Cart = require('../models/cart');

const authemployee = (req, res, next) => {
    if (req.session && req.session.user && (req.session.user.role === 'admin')) {
        return next();
    }
    res.redirect("/");
};
const auth = (req,res, next) =>{
  if (req.session && req.session.user) {
        return next();
    }
    res.redirect("/signin");
}
router.use(async (req, res, next) => {
    try {
        let count = 0;
        if (req.session.user) {
            const Cart = require('../models/cart'); 
            const cart = await Cart.findOne({ user: req.session.user._id });
            
            if (cart && cart.items.length > 0) {
                count = cart.items.reduce((acc, item) => acc + item.quantity, 0);
            }
        }
        res.locals.cartCount = count;
        next();
    } catch (error) {
        res.locals.cartCount = 0;
        next();
    }
});

router.get("/", async (req, res) => {
  try {
    const title = "Home";
    const products = await Product.find();
    res.render("index", {
      title: title,
      products: products,
    });
  } catch (err) {
    res.status(500).json({ message: "ServerError", error: err.message });
  }
});

 router.get("/menu", async (req,res) =>{
    try{
        const title = "Menu";
        const products = await Product.find();
        res.render("menu",{
            title:title,
            products:products
        })
    }catch(err) {
        res.status(500).json({message:"ServerError", error:err.message});
    }
 })

router.get("/checkout", auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.session.user._id }).populate('items.product');
        
        let cartItems = [];
        let subtotal = 0;

        if (cart && cart.items) {
            cartItems = cart.items.map(item => {
                const product = item.product;
                const qty = item.quantity;
                subtotal += (product.price * qty);
                
                return {
                    _id: product._id,
                    name: product.name,
                    image: product.image,
                    price: product.price,
                    quantity: qty
                };
            });
        }

        res.render("auth/checkout", {
            title: "Checkout",
            cartItems: cartItems,
            subtotal: subtotal,
            total: subtotal,
            user: req.session.user || {}
        });
    } catch (error) {
        res.redirect("/cart");
    }
});

router.post("/checkout/process", auth, async (req, res) => {
    try {
        const { name, phone, address, paymentMethod } = req.body;
        
        const cart = await Cart.findOne({ user: req.session.user._id }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.redirect("/cart");
        }

        let subtotal = 0;
        const orderItems = cart.items.map(item => {
            const product = item.product;
            const qty = item.quantity;
            subtotal += (product.price * qty);
            
            return {
                menuName: product.name,
                quantity: qty,
                price: product.price
            };
        });

        const newOrder = new Order({
            memberId: req.session.user._id,
            items: orderItems,
            totalAmount: subtotal,
            customerName: name,
            phoneNumber: phone,
            shippingAddress: address,
            paymentMethod: paymentMethod,
            status: "preparing"
        });

        await newOrder.save();

        cart.items = [];
        await cart.save();

        res.redirect("/order-success/" + newOrder._id);
        
    } catch (error) {
        console.error(error);
        res.status(500).send("Order Processing Failed");
    }
});

router.get("/dashboard", authemployee , async (req, res) => {
  try {
    const title = "Dashboard";
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    const [employee, productCount, staffCount, allOrders] = await Promise.all([
      Employee.findById(req.session.user._id),
      Product.countDocuments(),
      Employee.countDocuments(),
      Order.find().populate("memberId").sort({ createdAt: -1 }),
    ]);

    if (!employee) return res.redirect("/login");

    const todayOrders = allOrders.filter((o) => o.createdAt >= startOfToday);
    const revenueToday = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const completedToday = todayOrders.filter((o) => o.status === "completed").length;

    const hourStats = new Array(24).fill(0);
    const productAnalysis = {};

    allOrders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      hourStats[hour]++;
      order.items?.forEach((item) => {
        const name = item.name;
        if (!productAnalysis[name]) productAnalysis[name] = { count: 0, pairings: {} };
        productAnalysis[name].count += item.quantity || 1;
        order.items.forEach((p) => {
          if (p.name !== name) {
            productAnalysis[name].pairings[p.name] = (productAnalysis[name].pairings[p.name] || 0) + 1;
          }
        });
      });
    });

    const topProducts = Object.entries(productAnalysis)
      .map(([name, val]) => ({
        name,
        count: val.count,
        suggested: Object.entries(val.pairings).sort((a, b) => b[1] - a[1])[0]?.[0] || "No extra",
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const formatChart = (items, type) => {
      const dataMap = {};
      items.forEach((o) => {
        let key;
        const d = new Date(o.createdAt);
        if (type === "day") key = d.toISOString().split("T")[0];
        else if (type === "month") key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        dataMap[key] = (dataMap[key] || 0) + o.totalAmount;
      });
      const sortedKeys = Object.keys(dataMap).sort();
      return { labels: sortedKeys, values: sortedKeys.map((k) => dataMap[k]) };
    };

    res.render("Dashboard/dashboard", {
      employee,
      title,
      user: req.session.user,
      data: {
        stats: {
          menus: productCount,
          staff: staffCount,
          completed: completedToday,
          revenue: revenueToday,
          pending: allOrders.filter((o) => o.status === "preparing").length,
        },
        charts: {
          daily: formatChart(allOrders.slice(0, 100), "day"),
          monthly: formatChart(allOrders, "month"),
          peakHours: hourStats,
        },
        topProducts,
        recentOrders: allOrders.slice(0, 5),
      },
    });
  } catch (error) {
    res.status(500).send("Error");
  }
});

router.get("/order-success/:id", auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.redirect("/");
        }

        res.render("auth/order-success", {
            title: "Order Success",
            order: order,
            user: req.session.user || {}
        });
    } catch (error) {
        res.redirect("/");
    }
});

module.exports = router;
