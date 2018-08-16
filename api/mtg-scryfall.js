const request = require("request");

const host = "https://api.scryfall.com";

var cache = {};

function GetCard(options) {
    const name = options.name.trim();
    const set = options.set ? options.set.trim().toUpperCase() : "";
    const lang = options.lang && options.lang.trim() != "" ? options.lang.trim().toLowerCase() : "en";
    
    return MakeRequest(name, set, lang);
}

function MakeRequest(name, set, lang) {
    const isPromo = set == "000" || set == "PSG";
    const isMasterpiece = set.startsWith("MPS");
    const isSetDefined = set != "";
    const isLangDefined = lang != "en";

    var card = null;

    // Set up query
    const query = `${host}/cards/search?q=!"${encodeURIComponent(name)}"+game:paper+lang:${lang}+${isMasterpiece ? "is:masterpiece" : (isPromo ? "is:promo" : "s:" + set)}&order=released&unique=prints`;

    return new Promise((resolve, reject) => {
        // Check cache first
        if (cache[[name, set, lang]])
            resolve(cache[[name, set, lang]]);
        else {
            // Perform request
            request.get({
                url: query,
                json: true
            }, (err, resp, body) => {
                if (err) reject(err);
                // Fallbacks in case of missing cards (looking at you, Anguished Unmaking)
                // If no card is found and lang is specified, try defaulting lang to English
                else if (resp.statusCode === 404 && isLangDefined) {
                    MakeRequest(name, set, "en").then(
                        results => resolve(results),
                        error => reject(error)
                    );
                }
                // If that didn't work, try removing set restriction
                else if (resp.statusCode === 404 && isSetDefined) {
                    MakeRequest(name, "", lang).then(
                        results => resolve(results),
                        error => reject(error)
                    );
                }
                // Give up
                else if (resp.statusCode !== 200) reject(`Scryfall request returned status code ${resp.statusCode}`);
                else {
                    
                    // Grab the first result in the list
                    card = body.data[0];

                    var images = [];
                    // Extract all image options if set specified; otherwise, get first only
                    for (var i = 0; i < (isSetDefined ? body.data.length : 1); i++) {
                        images.push(body.data[i].image_uris.normal);
                    }

                    // Extract relevant attributes into return object
                    const type_line = card.type_line.split("—");
                    const types = type_line[0].trim().split(" ");
                    const subtypes = type_line[1] ? type_line[1].trim().split(" ") : [];
                    const result = {
                        id: card.oracle_id,
                        name: card.name,
                        printedName: card.printed_name ? card.printed_name : card.name,
                        types: types,
                        subtypes: subtypes,
                        cmc: card.cmc,
                        colors: card.colors,
                        oracleText: card.oracle_text,
                        set: card.set.toUpperCase(),
                        setName: card.set_name,
                        border: card.border_color,
                        images: images
                    };

                    // Cache result
                    cache[[name, set, lang]] = result;
                    
                    resolve(result);
                }
            });
        }
    });
}

module.exports = {
    getCard: GetCard
}