const Item = require("../models/Item");
const router = require("express").Router();

async function createItem(req, res) {
  try {
    const {
      title,
      description,
      image,
      category,
      auctionStart,
      auctionEnd,
      startingPrice,
    } = req.body;

    const createdItem = await Item.create({
      title,
      description,
      image,
      category,
      auctionStart,
      auctionEnd,
      startingPrice,
      owner: req.user._id,
    });

    res.status(201).json(createdItem);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
}

async function getAllItems(req, res) {
  try {
    const allItems = await Item.find({ isDeleted: false, status: "Active" });

    res.status(200).json(allItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getItemById(req, res) {
  try {
    const item = await Item.findOne({ _id: req.params.id, isDeleted: false });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getMyItems(req, res) {
  try {
    const myItems = await Item.find({ owner: req.user._id, isDeleted: false });

    res.status(200).json(myItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function updateItem(req, res) {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.status(200).json(updatedItem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function deleteItem(req, res) {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    item.isDeleted = true;
    item.status = "Cancelled";
    await item.save();

    res.status(200).json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { createItem, getAllItems, getItemById, getMyItems, updateItem, deleteItem };
