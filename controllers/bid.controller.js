const Bid = require("../models/Bid");
const Item = require("../models/Item");

async function createBid(req, res) {
  try {
    const bidderId = req.user._id;
    const { amount, isAutoBid, maxBidLimit } = req.body;
    const itemId = req.params.itemId;
    //  || req.body.item;
    console.log("ITEM ID:", req.params.itemId);
    console.log("REQ BODY:", req.body);
    console.log("USER:", req.user?._id);

    const targetItem = await Item.findById(itemId);
    if (!targetItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    const isAuctionEnded =
      targetItem.status === "Ended" ||
      new Date(targetItem.endDate) <= new Date();

    if (isAuctionEnded) {
      return res.status(400).json({ message: "This auction has ended" });
    }

    // Prevent owner from bidding on their own item
    if (targetItem.owner.toString() === bidderId.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot bid on your own item" });
    }

    // Get current highest bid
    const highestBid = await Bid.findOne({ item: itemId }).sort({ amount: -1 });

    // Validate minimum bid required
    const MinIncr = 100;
    const minimumRequiredBid = highestBid
      ? highestBid.amount + MinIncr
      : targetItem.startingPrice || 0;

    if (amount < minimumRequiredBid) {
      return res.status(400).json({
        message: highestBid
          ? `Bid must be at least $${MinIncr} higher than current bid ($${highestBid.amount}). Minimum required bid is $${minimumRequiredBid}.`
          : `Bid must be at least the starting price ($${minimumRequiredBid}).`,
      });
    }

    // Create the new bid document
    const newBid = await Bid.create({
      item: itemId,
      bidder: bidderId,
      amount,
      isAutoBid: Boolean(isAutoBid),
      maxBidLimit: isAutoBid ? maxBidLimit : null,
    });

    // Update item current price
    await Item.findByIdAndUpdate(
      itemId,
      { currentPrice: amount },
      { new: true },
    );
    // targetItem.currentPrice = amount;
    // await targetItem.save();

    return res.status(201).json({
      success: true,
      message: "Bid placed successfully",
      data: newBid,
    });
  } catch (error) {
    console.error("Error creating bid:", error);
    return res.status(500).json({
      message: "Server error while placing bid",
      error: error.message,
    });
  }
}

async function getBidsByItem(req, res) {
  try {
    const itemId = req.params.itemId;
    const bids = await Bid.find({ item: itemId })
      .populate("bidder", "username email")
      .sort({ amount: -1 });

    return res.status(200).json(bids);
  } catch (error) {
    console.error("Error fetching bids:", error);
    return res.status(500).json({ message: "Server error fetching bids" });
  }
}

module.exports = {
  createBid,
  getBidsByItem,
};
