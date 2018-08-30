const express = require("express");

const tappedout = require("./mtg-tappedout");
const mtgsdk = require("./mtg-sdk");
const scryfall = require("./mtg-scryfall");
const gatherer = require("./mtg-gatherer");
const deckmaster = require("./mtg-deckmaster");

const cache = [];

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

    if (cache[[name, set, lang]]) return Promise.resolve(cache[[name, set, lang]]);

    // Begin by searching Scryfall
    scryfall.search(name, set, lang)
    // Couldn't find card or something went wrong
    .catch(error => {
        // If looking for non-English card
        if (lang !== "en") {
            // Try finding English version
            return scryfall.search(name, set, "en")
            .then(card => {
                card.qualityImage = false;
                return card;
            });
        }
        // Otherwise, pass error along
        else throw error;
    })
    // Card found
    .then(card => {
        // All good, return the card
        if (card.qualityImage) return card;
        // Didn't find a good image
        else {
            // Should be able to use Gatherer to find language versions for non-promo cards
            // Use this to check if variations are missing (eg Plains BFZ ja)
            return ((lang !== "en" && set !== "PROMO") ? (
                // Get English multiverse ID if current card is non-English
                (card.language !== "en" ? scryfall.getCard(name, set) : Promise.resolve(card))
                // Get language printings from Gatherer
                .then(enCard => findGathererPrintings(enCard.multiverseId, card.set, lang, card.images))
                // If something went wrong here, use original image set 
                .catch(error => card.images)
            )
            : (set === "PROMO" ?
                mtgsdk.getPromoCard(name)
                .then(cards => 
                    cards.map(card => ({
                        set: card.promoSetCode,
                        language: lang,
                        collectorNumber: card.collectorNumber
                    })).concat(card.images)
                )
                .catch(error => card.images)
            // Otherwise, use original image set
            : Promise.resolve(card.images)))
            // Try to find other image sources
            .then(images =>
                Promise.all(images.map(img =>
                    // For each image variation:
                    // If collector number is available, try finding legacy magiccards.info scan on Scryfall
                    (img.collectorNumber ?
                        mtgsdk.getMCISetCode(img.set)
                        .then(set => scryfall.getMCIImage(lang, set.magicCardsInfoCode, img.collectorNumber))
                    : Promise.reject("No collector number"))
                    // If magiccards.info didn't work
                    .catch(error => {
                        // If the image's language matches the desired language, try Deckmaster
                        if (img.language === lang) return deckmaster.getImage(img.multiverseId, img.set);
                        // Otherwise, pass error along
                        else throw error;
                    })
                    // Fill in missing image properties if available
                    .then(newImg =>
                        Object.assign({}, img, newImg),
                    // Catch any errors to allow Promise.all to complete
                    error => error)
                )).then(newImgs => {
                    var valid = newImgs
                    .filter(img => img.url);
                    if (valid.length > 0) {
                        return valid;
                    }
                    else throw "No images found";
                })
            )
            // If successful, assign new images to card and return it
            .then(images => {
                card.images = images.concat(card.images);
                card.qualityImage = true;
                return card;
            },
            // Otherwise, catch errors and return card
            error => card);
        }
    },
    // Still couldn't find card, just return the default version of the card
    error => scryfall.getCard(name))
    // Sort card images
    .then(card => {
        card.images.sort((a, b) => {
            // Prioritize matching language
            if (a.language !== b.language) {
                if (a.language === lang) return -1;
                else if (b.language === lang) return 1;
                else return a.language < b.language ? -1 : 1;
            }
            else {
                // Then prioritize highres images
                if (a.highres !== b.highres) {
                    return b.highres - a.highres;
                }
                else {
                    // Sort by collector number
                    var diff = parseInt(a.collectorNumber) - parseInt(b.collectorNumber);
                    if (diff === 0) {
                        // Lexographically sort collector number variations (eg 250a)
                        diff = a.collectorNumber < b.collectorNumber ? -1 : 1;
                    }
                    return diff;
                }
            }
        });
        return card;
    })
    // Send the card off
    .then(card => {
        cache[[name, set, lang]] = card;
        res.send(card);
    },
    // At this point if we don't have a card something went wrong, so give up and return an error response
    error => errorHandler(error, res)
    );
});

function findGathererPrintings(multiverseId, set, lang, images) {
    // Get multiverse IDs for print variations
    return gatherer.getLanguages(multiverseId)
    // Add placeholder images for any missing variations of the desired language
    .then(languages => {
        if (!languages[lang]) throw "Language printings not found on Gatherer";
        var multiverseIds = languages[lang];
        if (images) {
            const existing = images.map(img => img.multiverseId);
            multiverseIds = multiverseIds.filter(multiverseId => !existing.includes(multiverseId));
        }
        return (images ? images : []).concat(
            multiverseIds.map(multiverseId => ({
                set: set,
                language: lang,
                multiverseId: multiverseId
            }))
        );
    });
}

function errorHandler(error, res) {
    res.status(500).send({
        error: error
    });
}

function formatErrorMessage(name, set, lang, error) {
    return `[${name}, ${set}, ${lang}] ${error}`;
}