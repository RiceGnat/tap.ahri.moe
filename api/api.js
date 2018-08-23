const express = require("express");

const tappedout = require("./mtg-tappedout");
const mtgsdk = require("./mtg-sdk");
const scryfall = require("./mtg-scryfall");
const gatherer = require("./mtg-gatherer");
const deckmaster = require("./mtg-deckmaster");

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

.get("/card", (req, res) => {
    const name = req.query.name.trim();
    const set = req.query.set ? req.query.set.trim().toUpperCase() : "";
    const lang = req.query.lang && req.query.lang.trim() != "" ? req.query.lang.trim().toLowerCase() : "en";

    // Begin by searching Scryfall
    scryfall.search(name, set, lang).then(card => {
        if (!card.qualityImage) {
            // No high-res image found

            // Try finding legacy magiccards.info scans on Scryfall
            Promise.all(card.images.map(img =>
                new Promise((resolve, reject) => {
                    mtgsdk.getMCISetCode(card.set).then(set => {
                        scryfall.getMCIImage(lang, set.magicCardsInfoCode, img.collectorNumber).then(newImg => {
                            if (newImg.url) {
                                newImg.multiverseId = img.multiverseId;
                            }
                            resolve(newImg);
                        }, error => reject(error));
                    }, error => reject(error));
                })
            )).then(newImgs => {
                // See if any hits
                var imgs = newImgs.filter(img => img.url);
                if (imgs.length > 0) {
                    // Found some!
                    card.qualityImage = true;
                    imgs.push.apply(imgs, card.images);
                    card.images = imgs;
                    res.send(card);
                }
                else {
                    // Still no luck

                    res.send(card);
                }
            }, error => {
                // Something went wrong with magiccards.info lookup
                res.send(card);
            });
            
        }
        // All good, send it off
        else res.send(card);
    }, error => {
        // Card wasn't found (or something went wrong)

        if (lang !== "en") {
            // Try for English cards only
            scryfall.search(name, set, "en").then(card => {
                // Found the card, but not in the desired language
                res.send(card);

                // gatherer.getLanguages(card.multiverseId).then(languages => {
                //     Promise.all(languages[lang].sort((a,b) => a-b).map(multiverseId => deckmaster.getImage(multiverseId, set)))
                //     .then(results => {
                //         card.images = results.filter(item => item.url).map(item => item.url);;
                //         res.send(card);
                //     }, () => res.send(card));
                // }, error => errorHandler(error, res));
            }, error => errorHandler(error, res));
        }
        else {
            // Try with only name
            errorHandler(error, res)
        }
    });
/*
    if (lang !== "en" && set !== "PROMO") {
        scryfall.getCard(name, set).then(card => {
            gatherer.getLanguages(card.multiverseId).then(languages => {
                Promise.all(languages[lang].sort((a,b) => a-b).map(multiverseId => deckmaster.getImage(multiverseId, set)))
                .then(results => {
                    card.images = results.filter(item => item.url).map(item => item.url);;
                    res.send(card);
                }, () => res.send(card));
            }, error => errorHandler(error, res));
        }, error => errorHandler(error, res));
    }
    else {
        scryfall.getCard(name, set, lang).then(card => {
            if (!card.qualityImage) {
                mtgsdk.getMCISetCode(card.set).then(set => {
                    scryfall.getMCIImage(lang, set.magicCardsInfoCode, card.collectorNumber).then(img => {
                        card.images.unshift(img.url);
                        card.imageBorderCropped = true;
                        card.qualityImage = true;
                        res.send(card);
                    }, () => res.send(card));
                }, () => res.send(card));
            }
            else res.send(card);
        }, error => errorHandler(error, res));
    }*/
})

function errorHandler(error, res) {
    res.status(500).send(error);
}