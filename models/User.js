const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({

    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },

    hashedPassword: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    role: {
        type: String,
        enum: ["User", "Admin"],
        required: true,
        default: "User"
    },

    isVerifiedSeller: {
        type: Boolean,
        default: false
    },

    isDeleted: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });


userSchema.set("toJSON", {

    transform: (document, returnedObject) => {
        delete returnedObject.hashedPassword;
    }

});


const User = mongoose.model("User", userSchema);

module.exports = User;