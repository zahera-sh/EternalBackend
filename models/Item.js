const mongoose = require("mongoose");


const itemSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    image: {
        url: {
            type: String,
            required: true,
        },
        publicId: {
            type: String,
            required: true,
        },
    },

    category: {
        type: String,
        enum: ["Watches", "Jewelry", "Art", "Bags", "Coins", "Collectibles"]
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    auctionStart: {
        type: Date,
        required: true
    },

    auctionEnd: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        enum: ["Active", "Ended", "Cancelled", "Sold", "Starting Soon"],
        default: "Active"
    },

    isDeleted: {
        type: Boolean,
        default: false
    },

    startingPrice: {
        type: Number,
        min: 0
    },

    latestBid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bid"
    },

    favourites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]

}, { timestamps: true });


const Item = mongoose.model("Item", itemSchema);

module.exports = Item;