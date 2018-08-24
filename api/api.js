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
    scryfall.search(name, set, lang).then(card => 
        // All good, return the card
        card.qualityImage ? card
        // No high-res images
        : Promise.all(card.images.map(img =>
            // For each image variation:
            // Try finding legacy magiccards.info scan on Scryfall
            mtgsdk.getMCISetCode(card.set)
            .then(set => scryfall.getMCIImage(lang, set.magicCardsInfoCode, img.collectorNumber))
            // If magiccards.info didn't work, try Deckmaster
            .catch(error => deckmaster.getImage(img.multiverseId, card.set))
            // Fill in missing properties for new image if one was found
            .then(newImg => {
                if (Array.isArray(newImg)) {
                    return newImg.map(imgVar => Object.assign({}, img, imgVar));
                }
                else return Object.assign({}, img, newImg);
            },
            // Catch any errors
            error => error)
        )).then(newImgs => {
            // Update card with any new images
            checkImagesAndMerge(newImgs.reduce((flat, current) => flat.concat(current)), card);
            return card;
        // Catch any errors and return unmodified card
        }, error => card),
    error => {
        // Card wasn't found
        // Should be able to use Gatherer to find language versions for non-promo cards
        if (lang !== "en" && set !== "PROMO")
            // Find the English card
            return scryfall.search(name, set, "en").then(card =>
                // Get language printings from Gatherer
                gatherer.getLanguages(card.multiverseId)
                .then(languages => Promise.all(languages[lang].sort((a,b) => a-b).map(multiverseId =>
                    // Try to find each image on Deckmaster
                    deckmaster.getImage(multiverseId, set)
                    // Catch any errors
                    .catch(error => error)
                )))
                .then(newImgs => {
                    // Update card with any new images
                    checkImagesAndMerge(newImgs, card);
                    return card;
                // Catch any errors and return English card instead
                }, error => card)
            );
        // Otherwise, probably looking for a non-English promo
        else if (lang !== "en")
            // Try to find the English version; no real options for locating non-English promos
            return scryfall.search(name, set, "en");
        // The chance of not finding an English non-promo card is slim, probably bad parameters
        else
            // Could try a different source, but it's very unlikely so just throw
            throw error;
    })
    // If still no results, just return any set
    .catch(error => scryfall.getCard(name))
    // Send the card as the response
    .then(card => res.send(card),
    // If something went wrong, give up and return an error response
    error => errorHandler(error, res)
    );
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