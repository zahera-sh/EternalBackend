const mongoose = require("mongoose");
const Bid = require("../models/Bid");
const Item = require("../models/Item");

async function createBid(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bidderId = req.user._id;
    const { amount, isAutoBid, maxBidLimit, item: itemId } = req.body;

    const targetItem = await Item.findById(itemId).session(session);
    if (!targetItem) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Item not found" });
    }

    // Check auction status

    const isAuctionEnded =
      targetItem.status === "Ended" ||
      new Date(targetItem.endDate) <= new Date();
    if (isAuctionEnded) {
      await session.abortTransaction();
      return res.status(400).json({ message: "This auction has ended" });
    }

    // Prevent owner from bidding on their own item

    if (targetItem.owner.toString() === bidderId.toString()) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "You cannot bid on your own item" });
    }

    // Get current highest bid

    const highestBid = await Bid.findOne({ item: itemId })
      .sort({ amount: -1 })
      .session(session);

    const currentHighestAmount = highestBid
      ? highestBid.amount
      : targetItem.startingPrice || 0;

    //  Validate minimum increment
    const MinIncr = 100;
    const minimumRequiredBid = currentHighestAmount + MinIncr;
    if (amount < minimumRequiredBid) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Bid must be at least $${MinIncr} higher than current bid ($${currentHighestAmount}). Minimum required bid is $${minimumRequiredBid}.`,
      });
    }

    // // Validate Auto-Bid parameters

    // if (isAutoBid && (!maxBidLimit || maxBidLimit <= amount)) {
    //   await session.abortTransaction();
    //   return res.status(400).json({
    //     message: "Max bid limit must be greater than your initial bid amount.",
    //   });
    // }

    const newBid = await Bid.create(
      [
        {
          item: itemId,
          bidder: bidderId,
          amount,
          isAutoBid: Boolean(isAutoBid),
          maxBidLimit: isAutoBid ? maxBidLimit : null,
        },
      ],
      { session },
    );

    targetItem.currentPrice = amount;
    await targetItem.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: "Bid placed successfully",
      data: newBid[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating bid:", error);
    return res.status(500).json({
      message: "Server error while placing bid",
      error: error.message,
    });
  }
}

module.exports = {
  createBid,
};
