const express = require("express");
const router = express.Router();
const multer = require('multer');

const connectDB = require("../config/db");
const Reservations = require("../models/reservation")
const Promotion = require("../models/promotion");
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

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/product')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + ".png")
    }
});

const promotionStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/promotions')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "jpg")
    }
});

const upload = multer({
  storage: storage,
});
const uploadPromotion = multer({ storage: promotionStorage });

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

router.get('/members', async (req,res) =>{
  try{
    const title = "Member List"
    const members = await Member.find();
    res.render('Dashboard/member/members',{title,members})
  }catch(err){
    res.status(500).json({message:"Server Error", error:err.message})
  }
})

router.get('/reservations', async (req,res) =>{
  try{
    const title = "Reservations"
    const reservations = Reservations.find();
    res.render('Dashboard/reservation/reservations', {title,reservations})
  }catch(err){
    res.status(500).json({message:"Server Error", error:err.message})
  }
})

router.get('/promotions', async (req,res) =>{
  try{
    try {
        const title = "Promotion Management";
        const promotions = await Promotion.find().sort({ createdAt: -1 });
        res.render('Dashboard/promotion/promotion', { title, promotions });
    } catch (err) {
        res.status(500).send(err.message);
    }
  }catch(err){
  res.status(500).json({message:"Server Error", error:err.message})
  }
})

router.get('/promotions/add',async (req,res) =>{
  try{
    const title = "Add Promotion"
    res.render('Dashboard/promotion/promotionsform', { title });
  }catch(err){
  res.status(500).json({message:"Server Error", error:err.message})
  }
})

router.post('/promotions/add', uploadPromotion.single('imageFilename'), async (req, res) => {
    try {
        const newPromotion = new Promotion({
            title: req.body.title,
            description: req.body.description,
            imageFilename: req.file.filename,
            isActive: req.body.isActive === 'on',
            startDate: req.body.startDate,
            endDate: req.body.endDate
        });
        
        await newPromotion.save();
        res.redirect('/promotions');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/promotions/delete/:id', async (req, res) => {
    try {
        await Promotion.findByIdAndDelete(req.params.id);
        res.redirect('/promotions');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/menus', async (req, res) => {
    try {
        const title = "Menu Management"
        const menus = await Product.find();
        res.render('Dashboard/menu/menu', { menus,title});
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/menus/add', (req,res) =>{
  try{
    const title = "Menu Form";
    res.render("Dashboard/menu/menuform",{title})
  }catch(err){
    res.status(500).json({message:"Server Error", error: err.message})
  }
});

router.get('/menus/edit/:id', async (req, res) => {
    try {
        const title = "Menu Edit"
        const menu = await Product.findById(req.params.id);
        res.render('Dashboard/menu/menuedit', { menu,title });
    } catch (err) { res.status(500).send(err.message); }
});

router.post('/menus/add',upload.single('image') ,async (req, res) => {
    try {
        req.body.isAvailable = req.body.isAvailable === 'on';
        if (req.file) {
            req.body.image = req.file.filename;
        } else {
            req.body.image = 'default-menu.png';
        }
        await new Product(req.body).save();
        res.redirect('/menus');
    } catch (err) { res.status(500).send(err.message); }
});

router.post('/menus/edit/:id', upload.single('image'),async (req, res) => {
    try {
        req.body.isAvailable = req.body.isAvailable === 'on';
        if (req.file) {
            req.body.image = req.file.filename;
        }
        await Product.findByIdAndUpdate(req.params.id, req.body);
        res.redirect('/menus');
    } catch (err) { res.status(500).send(err.message); }
});

router.post('/menu/delete/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/menus');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/orders', async (req, res) => {
    try {
        const title = "Order Use"
        const orders = await Order.find().sort({ createdAt: -1 });
        res.render('Dashboard/order/orders', { orders,title });
    } catch (err) { res.status(500).send(err.message); }
});

router.get('/orders/view/:id', async (req, res) => {
    try {
        const title = "Order Views";
        let order = await Order.findById(req.params.id).lean();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        if (order.items && order.items.length > 0) {
            for (let item of order.items) {
                const productInfo = await Product.findOne({ name: item.menuName });
                item.image = productInfo ? productInfo.image : null;
            }
        }
    
        res.render('Dashboard/order/orderviews', { order, title });
    } catch (err) { 
        res.status(500).send(err.message); 
    }
});

router.post('/orders/delete/:id', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.redirect('/orders');
    } catch (err) { res.status(500).json({message:"Server Error", message:err.message}); }
});

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
