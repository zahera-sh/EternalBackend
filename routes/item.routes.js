const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const itemsController = require(`../controllers/items.controller`);
const upload = require('../middleware/multer')

// router.post("/", verifyToken, createItem);
router.post("/", upload.single('image'), itemsController.createItem);

router.get("/", itemsController.getAllItems);

router.get("/my-items", verifyToken, itemsController.getMyItems);

router.get("/:id", itemsController.getItemById);

router.put("/:id", verifyToken, itemsController.updateItem);

router.delete("/:id", verifyToken, itemsController.deleteItem);


module.exports = router;