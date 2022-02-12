const mysql = require("mysql");

class Database {
    constructor(uri) {
        this.db = mysql.createPool(uri);
    }

    getDecks = userId => new Promise((resolve, reject) => {
        this.db.query("select id, title, format, description, cards from decks where userId = ?", [userId],
            function (error, results, fields) {
                if (error) reject(error);
                else resolve(results);
            });
    });

    getDeck = (userId, deckId) => new Promise((resolve, reject) => {
        this.db.query("select id, title, format, description, cards from decks where userId = ? and id = ?", [userId, deckId],
            function (error, results, fields) {
                if (error) reject(error);
                else resolve(results.length > 0 ? results[0] : null);
            });
    });

    saveDeck = (userId, deck) => new Promise((resolve, reject) => {
        this.db.query("select id from decks where userId = ? and id = ?", [userId, deck.id],
            function (error, results, fields) {
                if (error) reject(error);
                else if (results.length > 0) this.db.query("update decks set title = ?, format = ?, description = ?, cards = ? where userId = ? and id = ?",
                    [deck.title, deck.format, deck.description, deck.cards, userId, id],
                    function (error, results, fields) {
                        if (error) reject(error);
                        else resolve(false);
                    });
                else this.db.query("insert into decks (id, userId, title, format, description, cards) values (?, ?, ?, ?, ?, ?)",
                    [deck.id, userId, deck.title, deck.format, deck.description, deck.cards],
                    function (error, results, fields) {
                        if (error) reject(error);
                        else resolve(true);
                    });
            });
    });
}

module.exports = {
    connect: (uri, errHandler) => {
        try {
            return new Database(uri);
        }
        catch (err) {
            errHandler(err);
        }
    }
}