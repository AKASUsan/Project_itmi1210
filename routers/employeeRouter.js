const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");

const Employee = require("../models/employees");

const authadmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === "admin") {
    return next();
  }
  if(req.session && req.session.user && req.session.user.role === "staff"){
   return res.redirect("/pos");
  }
  res.redirect("/");
};

router.get("/employee",authadmin, async (req,res) =>{
  try{
    const title = "Employee Management";
    const employees = await Employee.find();
    res.render('Dashboard/employee/employee',{
      employees,
      title
    })
  }catch (err){
    res.status(500).json({message: "Server Error", error:err.message})
  }
})
router.get('/employee/add',authadmin, (req, res) => {
    const title = "Add Employee"
    res.render('Dashboard/employee/empform', {title});
});

router.post('/employee/add', async (req, res) => {
    try {
        const { name, email, phone, password, role, salary, isActive } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newEmployee = new Employee({
            name,
            email,
            phone,
            password: hashedPassword,
            role: role || 'staff',
            salary: salary || 0,
            isActive: isActive === 'on'
        });

        await newEmployee.save();
        res.redirect('/employee');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/employee/edit/:id',authadmin, async (req, res) => {
    try {
        const title = "Edit Employees"
        const employee = await Employee.findById(req.params.id);
        res.render('Dashboard/employee/empEdit', { employee,title });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/employee/edit/:id',authadmin, async (req, res) => {
    try {
        const { name, email, phone, role, salary, isActive, password } = req.body;
        let updateData = {
            name,
            email,
            phone,
            role,
            salary,
            isActive: isActive === 'on'
        };

        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await Employee.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/employee');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/employee/delete/:id',authadmin, async (req, res) => {
    try {
        await Employee.findByIdAndDelete(req.params.id);
        res.redirect('/employee');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;