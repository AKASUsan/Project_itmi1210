const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EmployeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String, default: 'default-employee.png' },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    
    role: { type: String, enum: ['staff', 'admin'], default: 'staff' },
    salary: { type: Number },
    isActive: { type: Boolean, default: true } 
});

EmployeeSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Employee", EmployeeSchema);