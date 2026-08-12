const Notification = require('../models/Notification')
const User = require('../models/User')
const createTransporter = require('../middleware/nodemailer')


async function createNotification(req, res) {
    try {
        const { recipient, subject, message, item } = req.body

        const createdEmail = await Notification.create({
            recipient,
            subject,
            message,
            item
        })
        const getUser = await User.findById(recipient)

        const { transporter, user } = await createTransporter()

        const info = await transporter.sendMail({
            from: user,
            to: getUser.email,
            subject: createdEmail.subject,
            text: createdEmail.message,
            html: `<p>${createdEmail.message}</p>`,
        })

        console.log("Message sent: %s", info.messageId)

        return res.status(201).json({
            message: 'Notification created and email sent',
            notification: createdEmail,
            info
        })

    } catch (err) {
        return res.status(500).json({
            message: err.message
        })
    }
}

module.exports = { createNotification }