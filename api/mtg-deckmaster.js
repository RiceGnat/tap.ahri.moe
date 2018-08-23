const request = require("request");

const host = "https://deckmaster.info";

var cache = {};

function GetImage(multiverseId, set) {
    const url = `${host}/images/cards/${set}/${multiverseId}-hr.jpg`;
    return new Promise((resolve, reject) => {
        if (cache[multiverseId, set]) return resolve(cache[multiverseId, set]);

        request({ 
            method: "HEAD",
            url: url
        }, (err, resp, body) => {
            if (err || resp.statusCode !== 200) return reject(err || resp.statusCode);

            const result = {
                url: url,
                set: set,
                highres: true,
                multiverseId: multiverseId
            };
            cache[multiverseId, set] = result;
            resolve(result);
        });
    });
}

module.exports = {
    getImage: GetImage
}