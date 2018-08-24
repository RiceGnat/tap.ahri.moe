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
    const useGatherer = true; // Placeholder for future query option

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
            (lang !== "en" && set !== "PROMO") ? (
                // Get English multiverse ID if current card is non-English
                card.language !== "en" ? scryfall.getCard(name, set) : Promise.resolve(card)
                // Get language printings from Gatherer
                .then(enCard => findGathererPrintings(enCard.multiverseId, lang, images))
                // If something went wrong here, use original image set 
                .catch(error => card.images)
            )
            // Otherwise, use original image set
            : Promise.resolve(card.images)
            // Try to find other image sources
            .then(images =>
                Promise.all(images.map(img =>
                    // For each image variation:
                    // If collector number is available, try finding legacy magiccards.info scan on Scryfall
                    img.collectorNumber ?
                        mtgsdk.getMCISetCode(img.set)
                        .then(set => scryfall.getMCIImage(lang, set.magicCardsInfoCode, img.collectorNumber))
                    : Promise.resolve(img)
                    // If magiccards.info didn't work
                    .catch(error => {
                        // If the image's language matches the desired language, try Deckmaster
                        if (img.language === lang) return deckmaster.getImage(img.multiverseId, img.set);
                        // Otherwise, pass error along
                        else throw error;
                    })
                    // Standardize image properties
                    .then(newImg => mergeImageProperties(img, newImg),
                    // Catch any errors to allow Promise.all to complete
                    error => error)
                )).then(newImgs => {
                    var valid = newImgs.filter(img => img.url);
                    if (valid.length > 0) {
                        valid.push.apply(valid, images);
                        return valid;
                    }
                    else throw "No images found";
                })
            )
            // If successful, assign new images to card and return it
            .then(images => {
                card.images = images;
                card.qualityImage = true;
                return card;
            },
            // Otherwise, catch errors and return card
            error => card);
        }
    },
    // Still couldn't find card, just return the default version of the card
    error => scryfall.getCard(name))
    // Send the card off
    .then(card => res.send(card),
    // At this point something went wrong, so give up and return an error response
    error => errorHandler(error, res)
    );
});

function findGathererPrintings(multiverseId, lang, images) {
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
        
        return multiverseIds.map(multiverseId => ({
            set: card.set,
            language: lang,
            multiverseId: multiverseId
        }))
        .concat(images ? images : []);;
    });
}

function mergeImageProperties(img, newImg) {
    return Array.isArray(newImg) ? 
    newImg.map(imgVar => Object.assign({}, img, imgVar))
    : Object.assign({}, img, newImg);
}

function errorHandler(error, res) {
    res.status(500).send({
        error: error
    });
}

function formatErrorMessage(name, set, lang, error) {
    return `[${name}, ${set}, ${lang}] ${error}`;
}