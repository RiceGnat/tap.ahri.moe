const request = require("request");
const parse = require("csv-parse/lib/sync");
const $ = require("cheerio");

const host = "http://tappedout.net";
const deckRoot = "/mtg-decks/";
const userRoot = "/users/"
const printFlag = "fmt=printable";
const csvFlag = "fmt=csv";

const requestHeaders = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0"
};

function GetDeckInfo(slug) {
    const options = {
        url: `${host}${deckRoot}${slug}/?${printFlag}`,
        headers: requestHeaders
    };

    return new Promise((resolve, reject) => {
        request.get(options, (err, resp, body) => {
            if (err) reject(err);
            else if (resp.statusCode != 200) reject(`Request to ${options.url} returned status code ${resp.statusCode}`);
            else {
                var name = $("h2", body).first().text();
                var author = $("tr:contains(User) > td", body).last().text();

                var deck = {
                    name: name.substr(1, name.length - 2),
                    description: $("p", body).first().text(),
                    slug: slug,
                    url: `${host}${deckRoot}${slug}`,
                    author: author,
                    userpage: `${host}${userRoot}${author}`,
                    format: $("tr:contains(Format) > td", body).last().text(),
                    count: $("tr:contains(Cards) > td", body).last().text(),
                    commander: null
                };

                if (deck.format.includes("Commander")) {
                    deck.commander = [];
                    $("h2.snug:contains(Commander)", body).parent().contents().each(function (index, element) {
                        if (element.nodeType == 3) {
                            var match = $(element).text().match(/\d+x\s*(.+)/)
                            if (match) deck.commander.push(match[1]);
                        }
                    });
                }

                resolve(deck);
            }
        });
    });
}

function GetDeckCards(slug) {
    const options = {
        url: `${host}${deckRoot}${slug}/?${csvFlag}`,
        headers: requestHeaders
    };

    return new Promise((resolve, reject) => {
        request.get(options, (err, resp, body) => {
            if (err) reject(err);
            else if (resp.statusCode != 200) reject(`Request to ${options.url} returned status code ${resp.statusCode}`);
            else {
                // This is a typo from Tapped Out
                body = body.replace("Languange", "Language");

                var list = parse(body, { columns: true });
                var convertedList = [];

                for (var i = 0; i < list.length; i++) {
                    var card = list[i];
                    card.Language = card.Language.toLowerCase();
                    card.Printing = card.Printing.toLowerCase();
            
                    if (card.Language == "") card.Language = "en";

                    // Correcting non-standard set codes from Tapped Out
                    if (card.Printing == "un3") card.Printing = "ust";
                    else if (card.Printing == "akhmps") card.Printing = "mps_akh";
                    else if (card.Printing == "pds") card.Printing = "h09";
                    else if (card.Printing == "pfl") card.Printing = "pd2";
                    else if (card.Printing == "grv") card.Printing = "pd3";
                    else if (card.Printing == "000" || card.Printing == "psg") card.Printing = "promo";

                    convertedList[i] = {
                        name: card.Name,
                        board: card.Board.toLowerCase(),
                        quantity: card.Qty,
                        set: card.Printing,
                        foil: card.Foil !== "",
                        prerelease: card.Foil.includes("pre"),
                        alter: card.Alter !== "",
                        signed: card.Signed !== "",
                        language: card.Language
                    }
                }

                resolve(convertedList);
            }
        });
    });
}

function GetDeck(slug) {
    return new Promise((resolve, reject) => {
        Promise.all([GetDeckInfo(slug), GetDeckCards(slug)]).then(result => {
            var deck = result[0];
            deck.list = result[1];
            resolve(deck);
        }, error => reject(error));
    });
}

module.exports = {
    getDeck: GetDeck
}