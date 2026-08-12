const nodemailer = require('nodemailer');
async function createTransporter() {

    const testAccount = await nodemailer.createTestAccount();

    const transporter = await nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })

    return { transporter, user: process.env.SMTP_USER }
}

module.exports = createTransporter;

