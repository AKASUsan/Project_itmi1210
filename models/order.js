const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    // เชื่อมไปยัง Member (ลูกค้าที่สั่ง)
    memberId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Member', 
        required: true 
    },
    
    // รายการอาหาร (เก็บเป็น Array เพราะสั่งหลายอย่างได้)
    items: [{
        menuName: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    
    totalAmount: { type: Number, required: true }, // ราคารวม
    
    // สถานะออเดอร์
    status: { 
        type: String, 
        enum: ['preparing', 'ready', 'served', 'cancelled'], 
        default: 'preparing' 
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model("Order", OrderSchema);