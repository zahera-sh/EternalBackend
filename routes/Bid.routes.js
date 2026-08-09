const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const bidController = require("../controllers/bid.controller");

router.post("/", verifyToken, bidController.createBid);

module.exports = router;
