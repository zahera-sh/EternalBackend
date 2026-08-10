const router = require("express").Router();
const userConroller = require("../controllers/user.controller");
const verifyToken = require("../middleware/verifyToken")

router.get("/dashboard", verifyToken, userConroller.getAllProfile);

module.exports = router;