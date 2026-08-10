const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const adminController = require('../controllers/admin.controller')
const isAdmin = require('../middleware/isAdmin')

router.get('/all-users', verifyToken, isAdmin, adminController.allUsers)
router.get('/all-bids', verifyToken, isAdmin, adminController.getAllBids)
router.put('/verify/:userId', verifyToken, isAdmin, adminController.verifyUsers)
router.put('/delete/:userId', verifyToken, isAdmin, adminController.deleteUser)

module.exports = router