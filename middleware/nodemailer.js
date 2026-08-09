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

    // const transporter = await nodemailer.createTransport({
    //     host: testAccount.smtp.host,
    //     port: testAccount.smtp.port,
    //     secure: testAccount.smtp.secure,
    //     auth: {
    //         user: testAccount.user,
    //         pass: testAccount.pass
    //     }
    // })

    return { transporter, user: process.env.SMTP_USER }
}

module.exports = createTransporter;

