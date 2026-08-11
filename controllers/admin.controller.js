const User = require('../models/User')
const Bid = require('../models/Bid')
const Item = require('../models/Item')

async function allUsers(req, res) {
    try {
        const users = await User.find({ role: 'User' })
        return res.status(200).json({ users })

    } catch (error) {
        return res.status(400).json({ message: 'Could not get all users, try again!' })
    }
}

async function deleteUser(req, res) {
    try {
        const user = await User.findById(req.params.userId)

        if (!user) {
            return res.status(400).json({ message: 'Invalid User, try again!' })
        }

        const deletedUser = await User.findByIdAndUpdate(req.params.userId, { isDeleted: true }, { new: true })
        const hideItems = await Item.updateMany(
            { owner: deletedUser._id },
            { isDeleted: true }
        );
        return res.status(200).json({ deletedUser })

    } catch (error) {
        return res.status(400).json({ message: 'Could not delete user, try again!' })
    }
}

async function getAllBids(req, res) {
    try {
        const bids = await Bid.find({}).populate('item bidder')

        return res.status(200).json({ bids })

    } catch (error) {
        return res.status(400).json({ message: 'Could not get all bids, try again!' })
    }
}

async function verifyUsers(req, res) {
    try {
        const verifiedUser = await User.findByIdAndUpdate(req.params.userId, { isVerifiedSeller: true }, { new: true })

        return res.status(200).json({ verifiedUser })

    } catch (error) {
        return res.status(400).json({ message: 'Could not verify user, try again!' })
    }
}
module.exports = { allUsers, deleteUser, getAllBids, verifyUsers }