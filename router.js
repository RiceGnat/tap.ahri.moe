const express = require("express");
const path = require("path");

const tappedout = require("./tappedout.js");
const mtgimg = require("./mtg-imgs.js");
const mtgora = require("./mtg-oracle.js");

module.exports = express.Router()

.use((req, res, next) => {
    res.append("Access-Control-Allow-Origin", ["*"]);
    res.append("Access-Control-Allow-Methods", "GET");
    res.append("Access-Control-Allow-Headers", "Content-Type");
    next();
})

.get("/api/deck/:slug", (req, res) => {
    tappedout.getDeck(req.params.slug).then(deck => {
        res.send(deck);
    }, error => errorHandler(error, res));
})

.get("/api/oracle", (req, res) => {
    mtgora.getCard(req.query).then(card => {
        res.send(card);
    }, error => errorHandler(error, res));
})

.get("/api/img", (req, res) => {
    mtgimg.getImage(req.query).then(results => {
        res.send(results);
    }, error => errorHandler(error, res));
})

.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname + "/index.html"));
})

function errorHandler(error, res) {
    res.status(500).send(error);
}