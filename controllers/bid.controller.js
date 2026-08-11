const Bid = require("../models/Bid");
const Item = require("../models/Item");
const AutoBid = require("../models/AutoBid");

const MinIncr = 100;

async function processAutoBids(itemId, io) {
  const autoBids = await AutoBid.find({ item: itemId }).sort({
    maxLimit: -1,
    createdAt: 1,
  });

  if (autoBids.length === 0) return;

  let continueBidding = true;

  while (continueBidding) {
    continueBidding = false;

    // Get latest current leading bid
    const highestBid = await Bid.findOne({ item: itemId }).sort({ amount: -1 });
    const currentPrice = highestBid ? Number(highestBid.amount) : 0;
    const currentLeaderId = highestBid
      ? String(highestBid.bidder._id || highestBid.bidder)
      : null;

    const challenger = autoBids.find(
      (ab) => String(ab.user) !== currentLeaderId,
    );

    if (!challenger) break;

    const nextRequiredPrice = currentPrice + MinIncr;

    // Verify afford the $100 increment step
    if (nextRequiredPrice <= Number(challenger.maxLimit)) {
      const stepBid = await Bid.create({
        item: itemId,
        bidder: challenger.user,
        amount: nextRequiredPrice,
        isAutoBid: true,
        maxBidLimit: challenger.maxLimit,
      });

      await stepBid.populate("bidder", "username");
      await Item.findByIdAndUpdate(itemId, { currentPrice: nextRequiredPrice });

      if (io) {
        io.to(String(itemId)).emit("bid_updated", stepBid);
      }

      continueBidding = true;
    }
  }
}

async function createBid(req, res) {
  try {
    const bidderId = req.user._id;
    const { amount, isAutoBid, maxBidLimit } = req.body;
    const itemId = req.params.itemId;
    const io = req.app.get("io");

    // Verify item existence
    const targetItem = await Item.findById(itemId);
    if (!targetItem) {
      return res.status(404).json({ message: "Item not found" });
    }



    if (new Date(targetItem.auctionEnd).getTime() < Date.now()) {

      await Item.findByIdAndUpdate(targetItem._id , {status : "Ended"})
      // await targetItem.save();
    }

    // Check if auction is ended
    const isAuctionEnded =
      targetItem.status === "Ended" ||
      new Date(targetItem.endDate) <= new Date();

    if (isAuctionEnded) {
      return res.status(400).json({ message: "This auction has ended" });
    }

    // Prevent owner from bidding on their own item
    if (String(targetItem.owner) === String(bidderId)) {
      return res
        .status(400)
        .json({ message: "You cannot bid on your own item" });
    }

    // Determine minimum required initial bid
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
          : `Bid must be at least starting price ($${minimumRequiredBid}).`,
      });
    }

    // If auto-bid enabled, save or update record using AutoBid schema fields (`user`, `maxLimit`)
    if (isAutoBid) {
      if (!numericMaxBid || numericMaxBid < numericAmount) {
        return res.status(400).json({
          message:
            "Max bid limit must be equal to or greater than initial bid amount.",
        });
      }

      await AutoBid.findOneAndUpdate(
        { item: itemId, user: bidderId },
        { maxLimit: numericMaxBid },
        { upsert: true, new: true },
      );
    }

    // Create user's manual or starting bid entry
    const newBid = await Bid.create({
      item: itemId,
      bidder: bidderId,
      amount: numericAmount,
      isAutoBid: Boolean(isAutoBid),
      maxBidLimit: isAutoBid ? numericMaxBid : null,
    });

    await newBid.populate("bidder", "username");

    await Item.findByIdAndUpdate(itemId, { currentPrice: numericAmount });

    if (io) {
      io.to(String(itemId)).emit("bid_updated", newBid);
    }

    // Trigger incremental auto-bidding engine
    await processAutoBids(itemId, io);

    return res.status(201).json({
      success: true,
      message: "Bid placed successfully",
      data: newBid,
    });
  } catch (err) {
    console.error("Error creating bid:", err);
    return res.status(500).json({
      message: "Server error while placing bid",
      error: err.message,
    });
  }
}

async function getBidsByItem(req, res) {
  try {
    const itemId = req.params.itemId;
    const bids = await Bid.find({ item: itemId })
      .populate("bidder", "username")
      .sort({ createdAt: -1 });

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
  return res.status(201).json({ success: true });
}

module.exports = {
  createBid,
  getBidsByItem,
  placeBid,
  processAutoBids,
};
