const express = require("express");
const router = express.Router();

const connectDB = require("../config/db");
const Employee = require("../models/employees");
const Product = require("../models/products");
const Member = require("../models/members");
const Order = require("../models/order");

router.get("/", async (req, res) => {
  const title = "Home";
  try {
    const products = await Product.find();
    res.render("index", {
      title: title,
      products: products,
    });
  } catch (err) {
    res.status(500).json({ message: "ServerError", error: err.message });
  }
});

router.get("/dashboard", async (req, res) => {
    const title = "Dashboard";

    try {
        const employee = await Employee.findOne();

      
        const allOrders = await Order.find()
            .select("totalAmount createdAt status memberId")
            .populate('memberId', 'name')
            .sort({ createdAt: -1 });

       
        let totalRevenue = 0;
        let pendingCount = 0;

        allOrders.forEach(order => {
            totalRevenue += order.totalAmount;
            if (order.status === "preparing") pendingCount++;
        });

        const totalMembers = await Member.countDocuments();

        const avgBill = allOrders.length
            ? Math.round(totalRevenue / allOrders.length)
            : 0;

        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const revenueMap = {};

        allOrders.forEach(order => {
            const date = order.createdAt.toISOString().split('T')[0];
            revenueMap[date] = (revenueMap[date] || 0) + order.totalAmount;
        });

        const revenueData = last7Days.map(date => revenueMap[date] || 0);

        const dashboardData = {
            stats: {
                revenue: totalRevenue,
                orders: allOrders.length,
                members: totalMembers,
                pending: pendingCount,
                avgBill: avgBill
            },
            charts: {
                labels: last7Days,
                data: revenueData
            },
            recentOrders: allOrders.slice(0, 8)
        };

        res.render("Dashboard/dashboard", {
            employee,
            data: dashboardData,
            title
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error");
    }
});
module.exports = router;
