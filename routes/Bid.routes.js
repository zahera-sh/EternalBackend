const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const bidController = require("../controllers/bid.controller");
const { createBid } = require("../controllers/bid.controller");

router.post("/bid", verifyToken, createBid);

module.exports = router;
