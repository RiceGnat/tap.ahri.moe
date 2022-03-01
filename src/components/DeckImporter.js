import React, { useState } from 'react';
import { getCardHash } from './utils';
import Scryfall from '../services/Scryfall';

export default ({ onAction: on }) => {
	const [importData, setImportData] = useState('');

	const scryfall = new Scryfall();

	const loadDecklist = async text => {
		const failures = [];
		let cards = await text.toLowerCase()
			.split('sideboard')
			.reduce(async (out, chunk, i) => [...await out,
				...[...chunk.matchAll(/^(?<count>\d+)?x? *(?<name>[^(*#\n]+)(?:\((?<set>\w+)\)(?: *(?<number>\d+\S*))?)? *(?<lang>\w{2,3})? *(?:\*(?<flags>[fsac]+)\*)*.*$/gm)]
					.map(matches => ({
						...matches.groups,
						name: matches.groups.name.trim(),
						board: i ? 'side' : 'main',
						input: matches[0]
					}))
			], []);

		const results = await scryfall.collection(cards.map(card => ({ name: card.name, set: card.set })));
		cards = Object.values(await cards.reduce(async (out, card) => {
			const flags = card.flags || '';
			const matchIndex = results.findIndex(({ name, set }) => card.name === name.toLowerCase() && ((card.set && card.set === set) || !card.set));
			let data;

			if (matchIndex > -1) {
				data = results.splice(matchIndex, 1)[0];
				
				try {
					if (card.set && card.number) {
						data = await scryfall.card(card.set, card.number, card.lang);
					}
					else if (card.lang) {
						data = await scryfall.findCard(card);
					}
				}
				catch {}
			}
			else {
				try {
					data = await scryfall.named(card.name);
				}
				catch {
					failures.push(card.input);
					return await out;
				}
			}

			card = {
				name: data.name,
				set: data.set,
				lang: card.lang || data.lang,
				foil: flags.includes('f'),
				signed: flags.includes('s'),
				alter: flags.includes('a'),
				commander: flags.includes('c'),
				count: card.count ? parseInt(card.count) : 1,
				board: card.board,
				data
			};

			card.hash = getCardHash(data, card);

			const o = await out;

			if (o[card.hash]) o[card.hash].count += card.count;
			else o[card.hash] = card;

			return o;
		}, {}));

		on('load', { cards });
	};

	return <div>
		<h5 className="noselect">Import</h5>
		<form onSubmit={async e => {
			e.preventDefault();
			loadDecklist(importData);
		}} >
			<textarea value={importData} onChange={e => setImportData(e.target.value)} />
			<div className="flex buttons row">
				<input type="submit" value="Load" />
			</div>
		</form>
	</div>;
}