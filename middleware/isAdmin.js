const User = require("../models/User");


async function isAdmin(req, res, next) {

    try {

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (user.role !== "Admin") {
            return res.status(403).json({
                message: "Unauthorized."
            });
        }

        next();

    } catch (err) {

        res.status(500).json({ message: err.message });

    }
}


module.exports = isAdmin;