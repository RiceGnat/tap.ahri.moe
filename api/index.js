const express = require("express");

const db = require("../db").connect(process.env.DB_URL,
    err => {
        console.log("Failed to connect to database. Database API unavailable.");
        console.log(err);
    });


const cache = [];

module.exports = express.Router()

.use((req, res, next) => {
    res.append("Access-Control-Allow-Origin", ["*"]);
    res.append("Access-Control-Allow-Methods", "GET");
    res.append("Access-Control-Allow-Headers", "Content-Type");
    next();
})

.get("/db", withDb((req, res) => {
    res.status(200).send("Database key confirmed");
}))

.get("/users/:userId/decks", withDb((req, res) => {
    db.getDecks(req.params.userId).then(
        results => res.status(200).send(results),
        err => handleError(err, "database", res)
    );
}))

.get("/users/:userId/decks/:deckId", withDb((req, res) => {
    db.getDeck(req.params.userId, req.params.deckId).then(
        result => {
            if (result) res.status(200).send(result);
            else res.status(404).send();
        },
        err => handleError(err, "database", res)
    );
}))

.put("/users/:userId/decks/:deckId", withDb((req, res) => {
    db.saveDeck(req.params.userId, { ...req.body, id: req.params.deckId }).then(
        created => res.status(created ? 201 : 200).send(),
        err => handleError(err, "database", res)
    );
}))

.delete("/users/:userId/decks/:deckId", withDb((req, res) => {
    db.deleteDeck(req.params.userId, req.params.deckId).then(
        () => res.status(204).send(),
        err => handleError(err, "database", res)
    );
}));

function withDb(handler) {
    return (req, res) => {
        if (!db) res.status(503).send("Database unavailable");
        else if (process.env.DB_KEY && req.header("Database-Key") !== process.env.DB_KEY) res.status(403).send("Invalid database key");
        else handler(req, res);
    }
}

function handleError(err, source, res) {
    console.log(`Service (${source}) error: ${err}`);
    res.status(500).send(`An error occured in a service (${source})`);
}
