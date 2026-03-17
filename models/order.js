const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
   
    memberId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Member', 
        required: true 
    },
    
    
    items: [{
        menuName: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    
    totalAmount: { type: Number, required: true }, 
    
    
    status: { 
        type: String, 
        enum: ['preparing', 'ready', 'served', 'cancelled'], 
        default: 'preparing' 
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model("Order", OrderSchema);