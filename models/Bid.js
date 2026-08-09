const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },

    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    amount: {
      type: Number,
      min: 1,
    },

    isAutoBid: {
      type: Boolean,
      default: false,
    },

    maxBidLimit: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true },
);

const Bid = mongoose.model("Bid", bidSchema);

module.exports = Bid;
