const express = require("express");

const api = require("./api");

module.exports = express.Router()

.use("/", express.static("build"))

.use("/api", api)
