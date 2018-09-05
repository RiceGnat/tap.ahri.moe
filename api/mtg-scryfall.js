const request = require("request");

const host = "https://api.scryfall.com";

function GetCard(name, set) {
    set = set || "";
    const query = `${host}/cards/named?exact=${encodeURIComponent(name)}&set=${set}`;
    console.log(query);
    return new Promise((resolve, reject) => {
        request.get({
            url: query,
            json: true
        }, (err, resp, body) => {
            if (err || resp.statusCode !== 200) return reject(`Scryfall request failed with : ${err ? err : resp.statusCode}`);

            const result = ExtractCardProps(body);
            resolve(result);
        });
    });
}

function Search(name, set, lang) {
    const isPromo = set == "promo";
    const isMasterpiece = set.startsWith("mps") || set.startsWith("exp");
    const isSetDefined = set != "";

    // Set up query
    const query = `${host}/cards/search?q=!"${encodeURIComponent(name)}"+game:paper+lang:${lang}${(isMasterpiece ? "+is" : (isPromo ? "+is:promo" : (isSetDefined ? "+s:" + set : "")) + "+not") + ":masterpiece"}&order=released&unique=prints`;
    console.log(query);
    return new Promise((resolve, reject) => {
        // Perform request
        request.get({
            url: query,
            json: true
        }, (err, resp, body) => {
            if (err || resp.statusCode !== 200) return reject(`Scryfall request failed with : ${err ? err : resp.statusCode}`);

            const result = ExtractCardProps(body);
            resolve(result);
        });
    });
}

function ExtractCardProps(body) {
    var card;
    var cards = [];
    var images = [];
    var backs = [];
    var highresImageFound = false;

    if (body.object === "list") {
        card = body.data[0]
        cards = body.data;
    }
    else {
        card = body;
        cards.push(body);
    }

    const getBorder = card =>
        card.set === "mp2" ||
        card.set === "ust" && card.type_line.includes("Basic") ? "borderless"
        : card.border_color;

    // Extract all image options
    for (var i = 0; i < cards.length; i++) {
        // Front face only for now
        const url = cards[i].layout === "transform" ? cards[i].card_faces[0].image_uris.normal : cards[i].image_uris.normal;
        highresImageFound = highresImageFound || cards[i].highres_image;
        images.push({
            url: url,
            collectorNumber: cards[i].collector_number,
            set: cards[i].set,
            language: cards[i].lang,
            border: getBorder(cards[i]),
            frame: cards[i].frame,
            highres: cards[i].highres_image,
            multiverseId: cards[i].multiverse_ids[0]
        });
        //backs.push(cards[i].card_faces[1].image_uris.normal)
    }

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
        set: card.set,
        language: card.lang,
        border: getBorder(card),
        frame: card.frame,
        images: images,
        //backImages: backs,
        //collectorNumber: card.collector_number,
        qualityImage: highresImageFound,
        collectorNumber: card.collector_number,
        multiverseId: card.multiverse_ids[0]
    };
}



function GetMCIImage(lang, set, number, noAdjust) {
    const matches = number.match(/(\d+)([a-z]*)/);
    var suffix = matches[2];
            
    // If suffix specified, increment it since MCI is offset by one letter
    if (suffix !== "" && !noAdjust)
        suffix = String.fromCharCode(suffix.charCodeAt() + 1);

    const url = `https://img.scryfall.com/mci/scans/${lang.toLowerCase() === "ja" ? "jp" : lang}/${set}/${matches[1]}${suffix}.jpg`;
    return new Promise((resolve, reject) => {
        request({ 
            method: "HEAD",
            url: url
        }, (err, resp, body) => {
            if (err || (resp.statusCode !== 200 && suffix !== "")) return reject(`Scryfall MCI request failed with : ${err}`);

            // If lookup failed and no collector number suffix specified
            if (resp.statusCode !== 200 && suffix == "") {
                // Try looking for suffix "a" (ie ZEN and BFZ lands are ###a and ###b for full art and regular)
                GetMCIImage(lang, set, number + "a", true)
                .then(result => resolve(result),
                error => reject(error));
                return;
            }

            // Don't use MCI set and number
            const result = {
                url: url,
                language: lang,
                highres: true,
                borderCrop: true
            };
            resolve(result);
        });
    });
}

module.exports = {
    getCard: GetCard,
    getMCIImage: GetMCIImage,
    search: Search
}