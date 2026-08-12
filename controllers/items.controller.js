const Item = require("../models/Item");
const router = require("express").Router();
const cloudinary = require("../middleware/cloudinary");
const Notification = require('../models/Notification')
const Bid = require('../models/Bid')
const createTransporter = require('../middleware/nodemailer')

async function updateStatusByDate(item) {

    if (new Date(item.auctionEnd).getTime() <= Date.now()) {
        await Item.findByIdAndUpdate(item._id, { status: "Ended" })
    }

    if (new Date(item.auctionStart).getTime() >= Date.now()) {
        await Item.findByIdAndUpdate(item._id, { status: "Starting Soon" })
    }

    if (new Date(item.auctionEnd).getTime() < Date.now()) {
        const lastBid = await Bid.findOne({ item: item._id })
            .sort({ amount: -1 });

        if (lastBid) {
            await Item.findByIdAndUpdate(item._id, {
                status: "Sold",
                latestPrice: lastBid.bidder
            });
        }
    }
}
const uploadImage = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "eternal/items",
                resource_type: "image",
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            },
        );

        uploadStream.end(fileBuffer);
    });
};

async function createItem(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please select an image." });
        }

        const {
            title,
            description,
            category,
            auctionStart,
            auctionEnd,
            startingPrice,
        } = req.body;

        const uploadedImage = await uploadImage(req.file.buffer);

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

        if (new Date(createdItem.auctionStart).getTime() > Date.now()) {
            createdItem.status = "Starting Soon";
            await createdItem.save();
        }

        const email = await Notification.create({
            recipient: req.user._id,
            item: createdItem._id,
            subject: "Your Item Has Been Listed",
            message: `
        <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 40px;
            color: #2c2c2c;
            background-color: #faf9f6;
        ">
            <div style="
                text-align: center;
                margin-bottom: 30px;
            ">
                <h1 style="
                    margin: 0;
                    font-size: 28px;
                    font-weight: 500;
                    letter-spacing: 2px;
                ">
                    ETERNAL
                </h1>

                <p style="
                    margin: 8px 0 0;
                    font-size: 12px;
                    letter-spacing: 2px;
                    color: #777;
                ">
                    PIECES BEYOND TIME
                </p>
            </div>

            <div style="
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e5e1da;
                text-align: center;
            ">
                <h2 style="
                    margin: 0 0 15px;
                    font-size: 22px;
                    font-weight: 500;
                ">
                    Your Item Has Been Listed
                </h2>

                <p style="
                    font-size: 15px;
                    line-height: 1.7;
                    color: #555;
                    margin: 0 0 20px;
                ">
                    Your item
                    <strong>"${createdItem.title}"</strong>
                    has been successfully listed on Eternal.
                </p>

                <p style="
                    margin: 0;
                    font-size: 13px;
                    color: #888;
                ">
                    Your auction is now ready for bidders.
                </p>
            </div>

            <p style="
                text-align: center;
                margin-top: 30px;
                font-size: 12px;
                color: #999;
            ">
                Thank you for choosing Eternal.
            </p>
        </div>
    `
        });
        const { transporter, user } = await createTransporter()

        const info = await transporter.sendMail({
            from: user,
            to: req.user.email,
            subject: email.subject,
            text: email.message,
            html: `<p>${email.message}</p>`,
        })


        res.status(201).json(createdItem);
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: err.message,
        });
    }
}

async function getAllItems(req, res) {
    try {
        const allItems = await Item.find({ isDeleted: false }).populate('owner')

        res.status(200).json(allItems);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

async function getItemById(req, res) {
    try {
        const item = await Item.findOne({
            _id: req.params.id,
            isDeleted: false,
        }).populate("owner");

        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        updateStatusByDate(item)

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

async function favItem(req, res) {

    const item = await Item.findById(req.params.id);

    if (!item.favourites.some(id => id.equals(req.user._id))) {
        item.favourites.push(req.user._id);
    }

    await item.save();
    res.json(item);

}

async function UnfavItem(req, res) {

    const item = await Item.findById(req.params.id);
    const allIdButUserId = item.favourites.filter((oneId) => !oneId.equals(req.user._id));

    item.favourites = allIdButUserId

    await item.save();
    res.json(item);

}

async function filterItems(req, res) {
    try {
        const filter = {};

        if (req.query.category) {
            filter.category = req.query.category;
        }

        if (req.query.title) {
            filter.title = { $regex: req.query.title, $options: "i" };
        }

        const allItems = await Item.find({ ...filter, isDeleted: false }).populate("owner");

        res.status(200).json(allItems);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}


module.exports = {
    createItem,
    getAllItems,
    getItemById,
    getMyItems,
    deleteItem,
    favItem,
    UnfavItem,
    filterItems,
};
