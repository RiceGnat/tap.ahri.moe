const express = require("express");

const tappedout = require("./mtg-tappedout.js");
const mtgimg = require("./mtg-imgs.js");
const mtgora = require("./mtg-sdk.js");
const scryfall = require("./mtg-scryfall.js");

module.exports = express.Router()

.use((req, res, next) => {
    res.append("Access-Control-Allow-Origin", ["*"]);
    res.append("Access-Control-Allow-Methods", "GET");
    res.append("Access-Control-Allow-Headers", "Content-Type");
    next();
})

.get("/deck/:slug", (req, res) => {
    tappedout.getDeck(req.params.slug).then(deck => {
        res.send(deck);
    }, error => errorHandler(error, res));
})

.get("/oracle", (req, res) => {
    mtgora.getCard(req.query).then(card => {
        res.send(card);
    }, error => errorHandler(error, res));
})

.get("/img", (req, res) => {
    mtgimg.getImage(req.query).then(results => {
        res.send(results);
    }, error => errorHandler(error, res));
})

.get("/card", (req, res) => {
    scryfall.getCard(req.query).then(card => {
        res.send(card);
    }, error => errorHandler(error, res));
})

function errorHandler(error, res) {
    res.status(500).send(error);
}