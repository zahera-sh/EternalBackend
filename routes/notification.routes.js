const router = require("express").Router();
const notificationController = require('../controllers/notifications.controller')

router.post('/', notificationController.createNotification)

module.exports = router