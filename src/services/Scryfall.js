import ServiceClient from './ServiceClient';
import { safeJoin } from '../components/utils';

const HOST = 'https://api.scryfall.com';

const sorts = function* (a, b) {
	yield new Date(b.released_at) - new Date(a.released_at);
	yield parseInt(a.collector_number) - parseInt(b.collector_number);
	yield a.collector_number.localeCompare(b.collector_number);
	yield a.promo && !b.promo ? 1 : (!a.promo && b.promo ? -1 : 0);
};

const sortCards = (a, b) => {
	const compare = sorts(a, b);
	let c = 0;
	while (!compare.done && c === 0) {
		c = compare.next().value;
	}
	return c;
}

export default class {
	constructor() {
		const client = new ServiceClient(HOST);

		const getAll = url => client.get(url)
			.then(async ({ has_more, next_page, data }) =>
				has_more ? data.concat(await getAll(next_page)) : data
			);

		this.autocomplete = query => client.get(`/cards/autocomplete?q=${query}`)
			.then(({ data }) => data);

		this.named = query => client.get(`/cards/named?exact=${query}`);

		this.setsFor = name => getAll(`/cards/search?q=!"${name}"+game:paper&unique=prints&include_variations=true`)
			.then(cards => {
				const sorted = cards.sort(sortCards);
				const sets = sorted
					.map(({ set, set_name }) => ({ code: set, name: set_name }))
					.filter((set, i, sets) => sets.findIndex(({ code }) => code === set.code) === i)
					.map(set => ({ ...set, cards: cards.filter(card => card.set === set.code) }));
				sets.default = sorted.find(({ promo }) => !promo);
				return sets;
			});

		this.languagesFor = (name, set) => getAll(`/cards/search?q=!"${name}"+e:${set}+game:paper&unique=prints&include_variations=true&include_multilingual=true`)
			.then(cards => cards
				.sort(sortCards)
				.reduce((o, card) => ({ ...o, [card.lang]: [...(o[card.lang] || []), card] }), {})
			);

		this.collection = async ids => {
			const remaining = [...ids];
			let cards = [];
			do {
				const identifiers = remaining.splice(0, 75);
				cards = [...cards, ...await client.post(`/cards/collection`, { identifiers }).then(({ data }) => data)];
			} while (remaining.length > 0);

			return cards;
		};

		this.findCard = ({ name, set, lang, tappedOutProps: { promo, prerelease } = {} }) => getAll(`/cards/search?q=${
			safeJoin('', `!"${name}"`, set && `+e:${set}`, promo && `+is:promo`, prerelease && `+is:prerelease`)
			}+game:paper&unique=prints&include_multilingual=true`).then(cards => cards.find(card => card.lang === lang) || cards[0]);

		this.cancel = () => client.cancel();

		this.error = () => console.log('An error occurred fetching data from Scryfall');
	}
}
