const request = require('request');
const parse = require('csv-parse/lib/sync');
const $ = require('cheerio');

const host = 'http://tappedout.net';
const deckRoot = '/mtg-decks/';
const userRoot = '/users/'
const printFlag = 'fmt=printable';
const csvFlag = 'fmt=csv';

const requestHeaders = {
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0'
};

function GetDeckInfo(slug) {
    const options = {
        url: `${host}${deckRoot}${slug}/?${printFlag}`,
        headers: requestHeaders
    };

    return new Promise((resolve, reject) => {
        request.get(options, (err, resp, body) => {
            if (err) reject(err);
            else if (resp.statusCode != 200) reject(`Request to ${options.url} returned status code ${resp.statusCode}`);
            else {
                var name = $('h2', body).first().text();
                var author = $('tr:contains(User) > td', body).last().text();

                var deck = {
                    title: name.substr(1, name.length - 2),
                    description: $('p', body).first().text(),
                    slug: slug,
                    url: `${host}${deckRoot}${slug}`,
                    creator: author,
                    userpage: `${host}${userRoot}${author}`,
                    format: $('tr:contains(Format) > td', body).last().text().toLowerCase,
				};
				
				// Adjust format names
				if (deck.format.startsWith('commander')) deck.format = 'commander';

                if (deck.format.includes('commander')) {
                    deck.commander = [];
                    $('h2.snug:contains(Commander)', body).parent().contents().each(function (index, element) {
                        if (element.nodeType == 3) {
                            var match = $(element).text().match(/\d+x\s*(.+)/)
                            if (match) deck.commander.push(match[1]);
                        }
                    });
                }

                resolve(deck);
            }
        });
    });
}

function GetDeckCards(slug) {
    const options = {
        url: `${host}${deckRoot}${slug}/?${csvFlag}`,
        headers: requestHeaders
    };

    return new Promise((resolve, reject) => {
        request.get(options, (err, resp, body) => {
            if (err) reject(err);
            else if (resp.statusCode != 200) reject(`Request to ${options.url} returned status code ${resp.statusCode}`);
            else {
                // This is a typo from Tapped Out
                body = body.replace('Languange', 'Language');

                var list = parse(body, { columns: true });
                var convertedList = [];

                for (var i = 0; i < list.length; i++) {
                    var card = list[i];
                    let lang = card.Language.toLowerCase();
                    let set = card.Printing.toLowerCase();
            
                    if (lang === '') lang = 'en';

                    // Correcting non-standard set codes from Tapped Out
                    if (set === 'un3') set = 'ust';
                    else if (set === 'akhmps') set = 'mp2';
                    else if (set === 'pds') set = 'h09';
                    else if (set === 'pfl') set = 'pd2';
                    else if (set === 'grv') set = 'pd3';
                    else if (set === '000' || set == 'psg') set = undefined;

                    convertedList[i] = {
                        name: card.Name,
                        board: card.Board.toLowerCase(),
                        count: parseInt(card.Qty),
                        set,
                        foil: card.Foil !== '',
                        alter: card.Alter !== '',
                        signed: card.Signed !== '',
						lang,
						tappedOutProps: {
							promo: card.Printing == '000' || card.Printing == 'psg',
							prerelease: card.Foil.includes('pre')
						}
                    }
                }

                resolve(convertedList);
            }
        });
    });
}

function GetDeck(slug) {
    return new Promise((resolve, reject) => {
        Promise.all([GetDeckInfo(slug), GetDeckCards(slug)]).then(result => {
            var deck = result[0];
            deck.cards = result[1].map(card => ({ ...card, commander: deck.commander && deck.commander.includes(card.name) }));
            resolve(deck);
        }, error => reject(error));
    });
}

module.exports = {
    getDeck: GetDeck
}