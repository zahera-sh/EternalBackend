const mongoose = require("mongoose");

const autoBidSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    maxLimit: {
      type: Number,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);


autoBidSchema.index({ item: 1, user: 1 }, { unique: true });

const AutoBid = mongoose.model("AutoBid", autoBidSchema);

module.exports = AutoBid;
