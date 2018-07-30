const express = require("express");

const api = require("./api/api.js");

module.exports = express.Router()

.use("/", express.static("ui/dist"))

.use("/api", api);