import React, { useState } from 'react';
import { countCards, getCardHash } from './utils';
import Scryfall from '../services/Scryfall';

const confirmDelete = () => window.confirm('This cannot be undone! Are you sure?');

export default ({ decks, onAction: on, selected }) => {
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

		console.log(cards);

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

		console.log(cards);

		on('load', { cards });
	};

	const loadDeck = async deck => {
		if (!selected || deck.id !== selected) {
			if (deck.cards.length > 0) {
				const cards = (await scryfall.collection(deck.cards.map(({ data }) => data))
				).reduce((o, card) => ({ ...o, [card.id]: card }), {});

				return {
					...deck,
					cards: deck.cards.map(card => ({
						...card,
						name: cards[card.data.id].name,
						hash: getCardHash(cards[card.data.id], card),
						data: cards[card.data.id]
					}))
				};
			}
			else return deck;
		}
		else return null;
	};

	return <div className="browser page">
		<div className="container">
			<h4 className="noselect">Decks</h4>
			<button type="button" className="top noselect" onClick={_ => on('new')}>
				<span>+</span>
			</button>
			<div>
				<div className="row">
					<input type="submit" className="editor-btn" value="Editor" onClick={e => {
						e.preventDefault();
						on('edit');
					}} />
				</div>
				<div className="row">
					<ul className="deck-list">
						{decks.length > 0 ? decks.map(deck => <li key={deck.id} onClick={async _ => on('load', await loadDeck(deck))} className={deck.id === selected ? 'selected' : undefined}>
							<div className="container">
								<div className="h6 flex">
									<span className="title fill">{deck.title || <i>{deck.id}</i>}</span>
									<span className="tip">{countCards(deck.cards)}</span>
								</div>
								<div className="flex tip">
									<span className="creator fill">{deck.creator}</span>
									<span className="capitalize">{deck.format}</span>
								</div>
							</div>
						</li>)
							: <li className="empty">
								<div className="container">
									<span className="tip">No decks</span>
								</div>
							</li>
						}
					</ul>
				</div>
				<div className="flex buttons row">
					<input type="button" value="New deck" onClick={_ => on('new')} />
					<input type="reset" value="Delete deck" disabled={!selected} onClick={e => {
						e.preventDefault();
						if (confirmDelete()) on('delete');
					}} />
				</div>
				<div className="row">
					<span className="tip">{decks.length} decks ({decks.filter(({ db }) => !db).length} in local storage)</span>
				</div>
				<div className="row">
					<input type="reset" value="Clear local decks" onClick={e => {
						e.preventDefault();
						if (confirmDelete()) on('clear');
					}} />
				</div>
			</div>
			<div>
				<h5>Decklist</h5>
					<form onSubmit={async e => {
						e.preventDefault();
						loadDecklist(importData);
					}} >
						<textarea value={importData} onChange={e => setImportData(e.target.value)} />
						<div className="flex buttons row">
							<input type="submit" value="Load" />
						</div>
					</form>
			</div>
		</div>
	</div>;
}