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
        // All good, send it off
        if (card.qualityImage) return card;
        // No high-res images
        else return Promise.all(card.images.map(img =>
            // For each image variation:
            // Try finding legacy magiccards.info scan on Scryfall
            mtgsdk.getMCISetCode(card.set).then(set => 
                scryfall.getMCIImage(lang, set.magicCardsInfoCode, img.collectorNumber)
            ).catch(error => 
                // magiccards.info didn't work, try Deckmaster
                deckmaster.getImage(img.multiverseId, card.set)
            ).then(newImg =>
                // Fill in missing properties for new image
                newImg.url ? Object.assign({}, img, newImg) : newImg
            // Catch any errors
            , error => ({error: error}))
        )).then(newImgs => {
            // Update card with any new images
            checkImagesAndMerge(newImgs, card);
            return card;
        // Catch any errors and return unmodified card
        }, error => card);
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
    }).then(card => res.send(card));
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
});

function checkImagesAndMerge(imgs, card) {
    var valid = imgs.filter(img => img.url);
    if (valid.length > 0) {
        card.qualityImage = true;
        valid.push.apply(valid, card.images);
        card.images = valid;
        return true;
    }
    return false;
}

function errorHandler(error, res) {
    res.status(500).send(error);
}