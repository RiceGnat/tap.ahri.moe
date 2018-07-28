const mtgsdk = require("mtgsdk");

function GetCard(options) {
    const name = options.name;
    var set = options.set && options.set != '' ? options.set : '';
    var card = null;
    var isPromo = set == "000" || set == "PSG";
    var isSetDefined = set != '';

    return new Promise((resolve, reject) => {
        mtgsdk.card.where({ name: name, set: isPromo ? '' : set }).then((cards) => {
            var matchCards = function () {
                for (var i = 0; i < cards.length; i++) {
                    if (cards[i].name.toLowerCase() == name.toLowerCase() && (
                        isSetDefined && (cards[i].set == set || isPromo && cards[i].set.startsWith("p")) ||
                        !isSetDefined && cards[i].rarity != "Special")) {
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
                    border: result.set.border
                };

                resolve(ret);
            }, (error) => { reject(error); });
        }, (error) => { reject(error); });
    });
}

module.exports = {
    getCard: GetCard
}