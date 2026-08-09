const Item = require("../models/Item");
const router = require("express").Router();
const cloudinary = require('../middleware/cloudinary')

const uploadImage = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'eternal/items',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      }
    )

    uploadStream.end(fileBuffer)
  })
}

async function createItem(req, res) {

  try {
    
    if (!req.file) {
      return res.render('error.ejs', {
        msg: 'Please select an image.',
      })
    }
    
    const {
      title,
      description,
      image,
      category,
      auctionStart,
      auctionEnd,
      startingPrice,
    } = req.body;

    const uploadedImage = await uploadImage(req.file.buffer)

    const createdItem = await Item.create({
      title,
      description,
      image: {
        url: uploadedImage.secure_url,
        publicId: uploadedImage.public_id,
      },
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
    const allItems = await Item.find({ isDeleted: false });

    res.status(200).json(allItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getItemById(req, res) {
  try {
    const item = await Item.findOne({ _id: req.params.id, isDeleted: false }).populate("owner", "username");

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
