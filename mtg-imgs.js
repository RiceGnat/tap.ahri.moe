const request = require("request");
const $ = require("cheerio");

const host = "https://magiccards.info";
const queryRoot = "/query?v=scan&s=cname&q=";

function GetImage(options) {
    var name = options.name;
    var set = options.set;
    var lang = options.lang;

    var query = encodeURIComponent(`++o!"${name}"`);
    
    if (set) {
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

                if (results.length == 0 && options.lang != "") {
                    options.lang = "";
                    GetImage(options).then(
                        newResults => resolve(newResults),
                        error => reject(error)
                    );
                }
                else if (results.length == 0 && options.set != "") {
                    options.set = "";
                    GetImage(options).then(
                        newResults => resolve(newResults),
                        error => reject(error)
                    );
                }
                else {
                    resolve(results);
                }
            }
        });
    });
}

module.exports = {
    getImage: GetImage
}