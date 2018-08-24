const request = require("request");
const $ = require("cheerio");
const iso6391 = require("iso-639-1");

var cache = {};

function GetLanguages(multiverseid) {
    const query = `http://gatherer.wizards.com/Pages/Card/Languages.aspx?multiverseid=${multiverseid}`;
    return new Promise((resolve, reject) => {
        if (cache[multiverseid]) return resolve(cache[multiverseid]);

        request.get(query, (err, resp, body) => {
            if (err || resp.statusCode !== 200) return reject(`Gatherer request failed with : ${err ? err : resp.statusCode}`);

            const href = $(".pagingControls a:last-child", body).first().attr("href");
            const maxPage = href ? parseInt(href.match(/page=(\d+)/)[1]) : 0;
            
            var $rows = $(".cardList tr.cardItem", body);

            if (maxPage > 0) {
                GetNextPage(query, 1, maxPage).then(($results) => {
                    cache[multiverseid] = ExtractMultiverseIDs($rows.add($results));
                    resolve(cache[multiverseid]);
                }, (error) => reject(error));
            }
            else {
                cache[multiverseid] = ExtractMultiverseIDs($rows);
                resolve(cache[multiverseid]);
            }
        });
    });
}

function GetNextPage(query, page, maxPage) {
    return new Promise((resolve, reject) => {
        request.get(`${query}&page=${page}`, (err, resp, body) => {
            if (err || resp.statusCode !== 200) return reject(err ? err : resp.statusCode);
            
            const $rows = $(".cardList tr.cardItem", body);

            if (page < maxPage) GetNextPage(query, page + 1, maxPage).then(($results) => {
                resolve($rows.add($results));
            }, (error) => reject(error));
            else resolve($rows);
        });
    });
}

function ExtractMultiverseIDs($rows) {
    var languages = {};
    $rows.each((i, row) => {
        const language = $("td:nth-child(2)", row).text().trim();
        const mvid = parseInt($("td:first-child a", row).attr("href").match(/multiverseid=(\d+)/)[1]);
        var code;
        console.log(language, mvid);

        if (language === "Chinese Simplified") code = "zhs";
        else if (language === "Chinese Traditional") code = "zht";
        else if (language.startsWith("Portuguese")) code = iso6391.getCode("Portuguese");
        else code = iso6391.getCode(language);

        if (!languages[code]) languages[code] = [];
        languages[code].push(mvid);
    });
    return languages;
}

module.exports = {
    getLanguages: GetLanguages
}