const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const itemsController = require(`../controllers/items.controller`);
const upload = require("../middleware/multer");

router.post(
  "/",
  upload.single("image"),
  verifyToken,
  itemsController.createItem,
);
router.get("/", itemsController.getAllItems);
router.get("/filter", itemsController.filterItems);
router.get("/my-items", verifyToken, itemsController.getMyItems);
router.get("/:id", itemsController.getItemById);
router.delete("/:id", verifyToken, itemsController.deleteItem);
router.post("/:id/like", verifyToken, itemsController.favItem);
router.post("/:id/dislike", verifyToken, itemsController.UnfavItem);

module.exports = router;
