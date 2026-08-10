const express = require("express");
const router = express.Router({ mergeParams: true });
const verifyToken = require("../middleware/verifyToken");
const bidController = require("../controllers/bid.controller");

router.post("/:itemId/bids", verifyToken, bidController.createBid);

router.get("/:itemId/bids", bidController.getBidsByItem);

module.exports = router;
