const mongoose = require("mongoose");

const PromotionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    imageFilename: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    applicableItem: { type: String },    
    originalPrice: { type: Number },       
    discountPercent: { type: Number },   
    discountedPrice: { type: Number }
    

}, { timestamps: true });

module.exports = mongoose.model("Promotion", PromotionSchema);