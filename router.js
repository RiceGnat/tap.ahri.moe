const express = require("express");

const api = require("./api/api.js");

module.exports = express.Router()

.use("/", express.static("build"))

.use("/api", api)

.get("/:slug", (req, res) => {
    req.url = "/";
    module.exports.handle(req, res);
})