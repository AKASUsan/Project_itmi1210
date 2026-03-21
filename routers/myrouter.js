const express = require("express");
const router = express.Router();

const connectDB = require("../config/db");
const Employee = require("../models/employees");
const Product = require("../models/products");
const Member = require("../models/members");
const Order = require("../models/order");

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


router.get("/dashboard", async (req, res) => {
  try {
    const title = "Dashboard";
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    const [employee, productCount, staffCount, allOrders] = await Promise.all([
      Employee.findOne(),
      Product.countDocuments(), // ใช้ Product Model ตามที่คุณส่งมา
      Employee.countDocuments(),
      Order.find().populate("memberId").sort({ createdAt: -1 }),
    ]);

    const todayOrders = allOrders.filter((o) => o.createdAt >= startOfToday);
    const revenueToday = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const completedToday = todayOrders.filter(
      (o) => o.status === "completed",
    ).length;

    const hourStats = new Array(24).fill(0);
    const productAnalysis = {};

    allOrders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      hourStats[hour]++;

      order.items?.forEach((item) => {
        const name = item.name; // หรือ item.productId.name ถ้า populate มา
        if (!productAnalysis[name])
          productAnalysis[name] = { count: 0, pairings: {} };
        productAnalysis[name].count += item.quantity || 1;

        order.items.forEach((p) => {
          if (p.name !== name) {
            productAnalysis[name].pairings[p.name] =
              (productAnalysis[name].pairings[p.name] || 0) + 1;
          }
        });
      });
    });

    const topProducts = Object.entries(productAnalysis)
      .map(([name, val]) => ({
        name,
        count: val.count,
        suggested:
          Object.entries(val.pairings).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          "No extra",
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const formatChart = (items, type) => {
      const dataMap = {};
      items.forEach((o) => {
        let key;
        const d = new Date(o.createdAt);
        if (type === "day") key = d.toISOString().split("T")[0];
        else if (type === "month")
          key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        dataMap[key] = (dataMap[key] || 0) + o.totalAmount;
      });
      const sortedKeys = Object.keys(dataMap).sort();
      return { labels: sortedKeys, values: sortedKeys.map((k) => dataMap[k]) };
    };

    res.render("Dashboard/dashboard", {
      employee,
      title,
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
module.exports = router;
