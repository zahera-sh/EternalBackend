const User = require("../models/User");
const Item = require("../models/Item");
const Bid = require("../models/Bid");


async function getAllProfile(req, res) {

    try {

        const user = await User.findById(req.user._id);
        if (!user || user.isDeleted) { return res.status(404).json({ message: "User not found" }); }

        const myItems = await Item.find({ owner: req.user._id, isDeleted: false })
            .populate("owner", "username").populate("latestBid");

        const favouritedItems = await Item.find({ favourites: req.user._id, isDeleted: false })
            .populate("owner", "username").populate("latestBid");

        const myBids = await Bid.find({ bidder: req.user._id })
            .populate("item", "title image startingPrice auctionStart auctionEnd status owner").populate("bidder", "username");

        res.status(200).json({user, myItems, favouritedItems, myBids});

    } catch (err) {

        res.status(500).json({ message: err.message });

    }
}


module.exports = {
    getAllProfile,
};