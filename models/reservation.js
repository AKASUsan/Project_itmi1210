const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
    
    memberId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Member', 
        required: true 
    },
    
   
    reserveDate: { type: Date, required: true },
    guestCount: { type: Number, required: true, min: 1 }, 
    tableNumber: { type: String },
    
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'completed', 'cancelled'], 
        default: 'pending' 
    },
    
    specialRequest: { type: String } 
}, { 
    timestamps: true 
});

module.exports = mongoose.model("Reservation", ReservationSchema);