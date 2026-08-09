const mongoose = require("mongoose");


const notificationSchema = new mongoose.Schema({

    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item"
    },

    subject: {
        type: String,
        required: true
    },

    message: {
        type: String,
        required: true
    },

    sentAt: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });


const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;