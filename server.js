const app = require('./app.js');
const connectToDB = require('./config/db.js');

async function startServer() {

    const PORT = process.env.PORT || 3000;
    await connectToDB();

    app.listen(PORT, () => {

        console.log(`App is running on port ${PORT}`);

    });
}

startServer();