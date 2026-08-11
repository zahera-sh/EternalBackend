const Bid = require("../models/Bid");
const Item = require("../models/Item");
const MinIncr = 100;

async function processAutoBids(itemId, io) {
  try {
    const autoBids = await Bid.find({
      item: itemId,
      isAutoBid: true,
    }).sort({ maxBidLimit: -1, createdAt: 1 });

    if (autoBids.length < 2) return;

    const topAutoBid = autoBids[0]; //(Winner)
    const runnerUpAutoBid = autoBids[1]; //  (Loser)

    // If top 2 auto-bids belong to the same user, stop
    if (String(topAutoBid.bidder) === String(runnerUpAutoBid.bidder)) return;

    const highestCurrentBid = await Bid.findOne({ item: itemId }).sort({
      amount: -1,
    });
    const currentPrice = highestCurrentBid
      ? Number(highestCurrentBid.amount)
      : 0;

    const proposedWinnerPrice = Math.min(
      Number(runnerUpAutoBid.maxBidLimit) + MinIncr,
      Number(topAutoBid.maxBidLimit),
    );

    if (proposedWinnerPrice <= currentPrice) return;

    const loserBid = await Bid.create({
      item: itemId,
      bidder: runnerUpAutoBid.bidder,
      amount: Number(runnerUpAutoBid.maxBidLimit),
      isAutoBid: true,
      maxBidLimit: runnerUpAutoBid.maxBidLimit,
    });
    await loserBid.populate("bidder", "username");

    const winnerBid = await Bid.create({
      item: itemId,
      bidder: topAutoBid.bidder,
      amount: proposedWinnerPrice,
      isAutoBid: true,
      maxBidLimit: topAutoBid.maxBidLimit,
    });
    await winnerBid.populate("bidder", "username");

    await Item.findByIdAndUpdate(itemId, { currentPrice: proposedWinnerPrice });

    if (io) {
      const room = String(itemId);
      io.to(room).emit("bid_updated", loserBid);
      io.to(room).emit("bid_updated", winnerBid);
    }

    // Resolve any auto-bid conflicts
    await processAutoBids(itemId, io);

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

async function createBid(req, res) {
  try {
    const bidderId = req.user._id;
    const { amount, isAutoBid, maxBidLimit } = req.body;
    const itemId = req.params.itemId;

    // 1. Verify target item existence
    const targetItem = await Item.findById(itemId);
    if (!targetItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 2. Check if auction is ended
    const isAuctionEnded =
      targetItem.status === "Ended" ||
      new Date(targetItem.endDate) <= new Date();

    if (isAuctionEnded) {
      return res.status(400).json({ message: "This auction has ended" });
    }

    // 3. Prevent owner from bidding on their own item
    if (String(targetItem.owner) === String(bidderId)) {
      return res
        .status(400)
        .json({ message: "You cannot bid on your own item" });
    }

    // 4. Calculate minimum bid required
    const highestBid = await Bid.findOne({ item: itemId }).sort({ amount: -1 });
    const minimumRequiredBid = highestBid
      ? Number(highestBid.amount) + MinIncr
      : Number(targetItem.startingPrice) || 0;

    const numericAmount = Number(amount);
    const numericMaxBid = maxBidLimit ? Number(maxBidLimit) : null;

    if (numericAmount < minimumRequiredBid) {
      return res.status(400).json({
        message: highestBid
          ? `Bid must be at least $${MinIncr} higher than current bid ($${highestBid.amount}). Minimum required bid is $${minimumRequiredBid}.`
          : `Bid must be at least the starting price ($${minimumRequiredBid}).`,
      });
    }

    // Validate max bid limit if auto-bidding is enabled
    if (isAutoBid && (!numericMaxBid || numericMaxBid < numericAmount)) {
      return res.status(400).json({
        message:
          "Maximum bid limit must be equal to or greater than initial bid amount.",
      });
    }

    // 5. Create new bid document
    const newBid = await Bid.create({
      item: itemId,
      bidder: bidderId,
      amount: numericAmount,
      isAutoBid: Boolean(isAutoBid),
      maxBidLimit: isAutoBid ? numericMaxBid : null,
    });

    await newBid.populate("bidder", "username");

    // 6. Update item current price
    await Item.findByIdAndUpdate(
      itemId,
      { currentPrice: numericAmount },
      { new: true },
    );

    // 7. Emit live socket update to room
    const io = req.app.get("io");
    if (io) {
      io.to(String(itemId)).emit("bid_updated", newBid);
    }
  } catch (err) {}
}

async function getBidsByItem(req, res) {
  try {
    const itemId = req.params.itemId;
    const bids = await Bid.find({ item: itemId })
      .populate("bidder", "username")
      .sort({ amount: -1 });

    return res.status(200).json(bids);
  } catch (error) {
    console.error("Error fetching bids:", error);
    return res.status(500).json({ message: "Server error fetching bids" });
  }
}

async function placeBid(req, res) {
  const io = req.app.get("io");
  if (io) {
    io.to(String(req.params.itemId)).emit("bid_updated", {});
  }
  res.status(201).json({ success: true });
}

module.exports = {
  createBid,
  getBidsByItem,
  placeBid,
  processAutoBids,
};
