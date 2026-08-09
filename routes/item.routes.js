const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const itemsController = require(`../controllers/items.controller`);


router.post("/", verifyToken, createItem);

router.get("/", getAllItems);

router.get("/my-items", verifyToken, getMyItems);

router.get("/:id", getItemById);

router.put("/:id", verifyToken, updateItem);

router.delete("/:id", verifyToken, deleteItem);


module.exports = router;