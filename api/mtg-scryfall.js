const request = require("request");

const host = "https://api.scryfall.com";

var cache = {};

function GetCard(name, set) {
    const query = `${host}/cards/named?exact=${encodeURIComponent(name)}&set=${set}`;

    return new Promise((resolve, reject) => {
        if (cache[[name, set]])
            resolve(cache[[name, set]]);
        else {
            request.get({
                url: query,
                json: true
            }, (err, resp, body) => {
                if (err || resp.statusCode !== 200) return reject(`Scryfall request failed with : ${err ? err : resp.statusCode}`);

                const result = ExtractCardProps(body);
                cache[[name, set]] = result;
                resolve(result);
            });
        }
    });
}

function Search(name, set, lang) {
    const isPromo = set == "PROMO";
    const isMasterpiece = set.startsWith("MPS") || set.startsWith("EXP");
    const isSetDefined = set != "";

    // Set up query
    const query = `${host}/cards/search?q=!"${encodeURIComponent(name)}"+game:paper+lang:${lang}+${(isMasterpiece ? "is" : (isPromo ? "is" : (isSetDefined ? "s:" + set : "") + "+not") + ":promo+not") + ":masterpiece"}&order=released&unique=prints`;
    
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
                if (err || resp.statusCode !== 200) return reject(`Scryfall request failed with : ${err ? err : resp.statusCode}`);

                const result = ExtractCardProps(body);
                cache[[name, set, lang]] = result;
                resolve(result);
            });
        }
    });
}

function ExtractCardProps(body) {
    var card;
    var cards = [];
    var images = [];
    var backs = [];
    var highresImageFound = false;

    if (body.object === "list") {
        card = body.data[0];
        cards = body.data;
    }
    else {
        card = body;
        cards.push(card);
    }

    // Extract all image options
    for (var i = 0; i < cards.length; i++) {
        const url = cards[i].layout === "transform" ? cards[i].card_faces[0].image_uris.normal : cards[i].image_uris.normal;
        highresImageFound = highresImageFound || cards[i].highres_image;
        images.push({  // Front face only for now
            url: url,
            collectorNumber: cards[i].collector_number,
            set: cards[i].set,
            language: card.lang,
            highres: cards[i].highres_image,
            multiverseId: cards[i].multiverse_ids[0]
        });
        //backs.push(cards[i].card_faces[1].image_uris.normal)
    }

    images = images.sort((a, b) => {
        if (a.highres === b.highres) {
            var diff = parseInt(a.collectorNumber) - parseInt(b.collectorNumber);
            if (diff === 0) {
                diff = a.collectorNumber < b.collectorNumber ? -1 : 1;
            }
            return diff;
        }
        else return b.highres - a.highres;
    });

    // Extract relevant attributes into return object
    const type_line = (card.layout === "transform" ? card.card_faces[0].type_line : card.type_line).toLowerCase().split("—");
    const types = type_line[0].trim().split(" ");
    const subtypes = type_line[1] ? type_line[1].trim().split(" ") : [];
    return result = {
        id: card.oracle_id,
        name: card.name,
        //printedName: card.printed_name ? card.printed_name : card.name,
        types: types,
        subtypes: subtypes,
        cmc: card.cmc,
        colors: card.colors,
        oracleText: card.oracle_text,
        set: card.set.toUpperCase(),
        setName: card.set_name,
        border: card.set.toUpperCase() === "MP2" ? "borderless" : card.border_color,
        language: card.lang,
        images: images,
        //backImages: backs,
        //collectorNumber: card.collector_number,
        qualityImage: highresImageFound,
        multiverseId: card.multiverse_ids[0]
    };
}

var mciCache = {};
function GetMCIImage(lang, set, number) {
    const url = `https://img.scryfall.com/mci/scans/${lang.toLowerCase() === "ja" ? "jp" : lang}/${set}/${number}.jpg`;
    return new Promise((resolve, reject) => {
        if (mciCache[lang, set, number]) return resolve(mciCache[lang, set, number]);
        request({ 
            method: "HEAD",
            url: url
        }, (err, resp, body) => {
            if (err) return reject(err);
            
            if (resp.statusCode !== 200) {
                if (isNaN(number)) {
                    return reject(resp.statusCode);
                }
                else GetMCIVariations(lang, set, number, "a")
                    .then(results => {
                        mciCache[lang, set, number] = results;
                        resolve(results);
                    }, error => reject(error)
                )
            }
            else {
                const result = {
                    url: url,
                    collectorNumber: number,
                    set: set,
                    language: lang,
                    highres: true,
                    borderCrop: true
                };
                mciCache[lang, set, number] = result;
                resolve(result);
            }
        });
    });
}

function GetMCIVariations(lang, set, number, index) {
    return GetMCIImage(lang, set, number + index).then(result => 
        GetMCIVariations(lang, set, number, String.fromCharCode(index.charCodeAt() + 1))
        .then(nextResult => [result].concat(nextResult),
        error => [result])
    );
}

function GetMultiverseID(name, set) {
    const query = `${host}/cards/named?exact=${encodeURIComponent(name)}&set=${set}`;

    return new Promise((resolve, reject) => {
        request.get({
            url: query,
            json: true
        }, (err, resp, body) => {
            if (err || resp.statusCode !== 200) return reject(`Scryfall request failed with : ${err ? err : resp.statusCode}`);

            resolve(body.multiverse_id)
        });
    });
}

module.exports = {
    getCard: GetCard,
    getMCIImage: GetMCIImage,
    search: Search
}