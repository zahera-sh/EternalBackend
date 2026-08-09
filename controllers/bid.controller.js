const Bid = require("../models/Bid");
const Item = require("../models/Item");

const createBid = async (req, res) => {
  try {
    const { itemId, amount, isAutoBid, maxBidLimit } = req.body;
    const bidderId = req.user._id;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found " });
    }

    if (
      item.isClosed ||
      Math.sign(new Date(item.endDate).getTime() - Date.now()) === -1
    ) {
      {
        return res.status(400).json({ message: "This auction has ended " });
      }
    }

    // Prevent owner bidding on their own item
    if (item.owner.toString() === bidderId.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot bid on your own item " });
    }

    // Find current highest bid
    const highestBid = await Bid.findOne({ item: itemId }).sort({ amount: -1 });
    const currentHighestAmount = highestBid
      ? highestBid.amount
      : item.startingPrice || 0;

    // Validate bid amount
    if (amount <= currentHighestAmount) {
      return res.status(400).json({
        message: `Bid must be strictly higher than the current highest bid of $${currentHighestAmount}`,
      });
    }
    const MinIncrrement = 100;
    const minimumRequiredBid = currentHighestAmount + MinIncrrement;

    if (amount < minimumRequiredBid) {
      return res.status(400).json({
        message: `Bid must be at least $${MINIMUM_INCREMENT} higher than the current highest bid. Minimum required bid is $${minimumRequiredBid}.`,
      });
    }
    // Validate Auto-Bid parameters if applicable
    if (isAutoBid) {
      if (!maxBidLimit || maxBidLimit <= amount) {
        return res.status(400).json({
          message:
            "Max bid limit must be greater than your initial bid amount.",
        });
      }
    }

    // Create and save the new bid
    const newBid = await Bid.create({
      item: itemId,
      bidder: bidderId,
      amount,
      isAutoBid: Boolean(isAutoBid),
      maxBidLimit: isAutoBid ? maxBidLimit : null,
    });

    // Update Item with the latest bid reference/price

    item.currentPrice = amount;
    await item.save();

    return res.status(201).json({
      success: true,
      message: "Bid placed successfully",
      data: newBid,
    });
  } catch (error) {
    console.error("Error creating bid:", error);
    return res.status(500).json({
      message: "Server error while placing bid ",
      error: error.message,
    });
  }
};

module.exports = { createBid };
