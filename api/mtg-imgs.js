// DEPRECATED: magiccards.info merged into scryfall

const request = require("request");
const $ = require("cheerio");

const host = "https://magiccards.info";
const queryRoot = "/query?v=scan&s=cname&q=";

function GetImage(options) {
    const name = options.name.trim();
    const set = options.set ? options.set.trim().toUpperCase() : "";
    var lang = options.lang && options.lang.trim() != "" ? options.lang.trim().toLowerCase() : "en";

    return MakeRequest(name, set, lang);
}

function MakeRequest(name, set, lang, isRetry) {
    const isPromo = set == "PROMO";
    const isSetDefined = set != "";
    const isLangDefined = lang != "en";

    var query = encodeURIComponent(`++o!"${name}"`);
    
    if (isPromo) {
        query += "is:promo";
    }
    else if (set) {
        query += "+e:" + set;
    }
    else {
        query += "+not+r:special";
    }

    if (lang) {
        query += "+l:" + lang;
    }

    return new Promise((resolve, reject) => { 
        request.get(`${host}${queryRoot}${query}`, (err, resp, body) => {
            if (err) reject(err);
            else if (resp.statusCode != 200) reject(`Image request returned status code ${resp.statusCode}`);
            else {
                var results = [];
                $("img[src*='/scans']", body).each((i, element) => {
                    results[i] = {
                        name: $(element).attr("alt"),
                        url: `${host}${$(element).attr("src")}`
                    };
                });

                if (results.length == 0 && isLangDefined) {
                    MakeRequest(name, set, "en", true).then(
                        newResults => resolve(newResults),
                        error => reject(error)
                    );
                }
                else if (results.length == 0 && isSetDefined) {
                    MakeRequest(name, "", lang, true).then(
                        newResults => resolve(newResults),
                        error => reject(error)
                    );
                }
                else {
                    resolve({
                        exactMatch: !isRetry,
                        imgs: results
                    });
                }
            }
        });
    });
}

module.exports = {
    getImage: GetImage
}