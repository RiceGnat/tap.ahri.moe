const mtgsdk = require("mtgsdk");
const request = require("request");

function GetCard(options) {
    const name = options.name;
    var set = options.set && options.set != '' ? options.set : '';
    var card = null;
    var isPromo = set == "000" || set == "PSG";
    var isSetDefined = set != '';

    return new Promise((resolve, reject) => {
        mtgsdk.card.where({ name: name, set: isPromo ? '' : set }).then((cards) => {
            var matchCards = function () {
                // Sort by descending multiverse id (most recent first)
                cards.sort((a,b) => {
                    var aId = a.multiverseid ? a.multiverseid : 0;
                    var bId = b.multiverseid ? b.multiverseid : 0;
                    return (aId < bId) ? 1 : ((aId > bId) ? -1 : 0);
                });

                for (var i = 0; i < cards.length; i++) {
                    if (cards[i].name.toLowerCase() == name.toLowerCase() && (
                        isSetDefined && (cards[i].set == set || isPromo && cards[i].set.startsWith("p")) ||
                        !isSetDefined && cards[i].rarity != "Special" && !cards[i].setName.startsWith("Un"))) {
                            
                        card = cards[i];
                        break;
                    }
                }
            }

            matchCards();

            // Workaround for case where card is not found (eg Anguished Unmaking promo)
            if (card == null) {
                set = '';
                isSetDefined = false;
                isPromo = false;
                matchCards();
            }

            if (card == null) {
                // Bad input
                reject("Card not found");
            }

            mtgsdk.set.find(card.set).then(result => {
                var ret = {
                    name: card.name,
                    supertypes: card.supertypes,
                    types: card.types,
                    subtypes: card.subtypes,
                    colors: card.colors,
                    cmc: card.cmc,
                    set: card.set,
                    imgset: result.set.magicCardsInfoCode,
                    border: card.border ? card.border : result.set.border
                };

                // Borderless cards
                if (ret.set == "MPS_AKH")
                    ret.border = "borderless";

                resolve(ret);
            }, (error) => { reject(error); });
        }, (error) => { reject(error); });
    });
}

function GetMCISetCode(set) {
    const query = `https://api.magicthegathering.io/v1/sets/${set}`;
    return new Promise((resolve, reject) => {
        request.get({
            url: query,
            json: true
        }, (err, resp, body) => {
            if (err || resp.statusCode !== 200) reject(`MTG SDK request failed with ${err ? err : resp.statusCode}`);
            else {
                resolve({
                    magicCardsInfoCode: body.set.magicCardsInfoCode
                });
            }
        });
    });
}

function GetPromoCard(name) {
    const query = `https://api.magicthegathering.io/v1/cards?name="${name}"`;
    return new Promise((resolve, reject) => {
        request.get({
            url: query,
            json: true
        }, (err, resp, body) => {
            if (err || resp.statusCode !== 200) reject(`MTG SDK request failed with ${err ? err : resp.statusCode}`);
            else {
                resolve(body.cards
                .filter(card => card.set.startsWith("p"))
                .map(card => ({
                    promoSetCode: card.set,
                    collectorNumber: card.number
                })));
            }
        });
    });
}

module.exports = {
    getCard: GetCard,
    getMCISetCode: GetMCISetCode,
    getPromoCard: GetPromoCard
}