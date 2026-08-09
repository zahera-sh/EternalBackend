// imports
const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const morgan = require("morgan");
const cors = require("cors");

// Routes Import
const authRoutes = require("./routes/auth.routes");
const itemRoutes = require("./controllers/items.controller");
const notiRoutes = require('./routes/notification.routes')

const dns = require("dns")
dns.setServers(["8.8.8.8", "1.1.1.1"])
// Middleware
app.use(

    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
    })

);

app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/auth", authRoutes);
app.use("/item", itemRoutes);
app.use("/Notification", notiRoutes);

module.exports = app;