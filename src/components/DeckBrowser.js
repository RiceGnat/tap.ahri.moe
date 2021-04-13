import React, { useState } from 'react';
import { countCards, getCardHash } from './utils';
import RadioGroup from './RadioGroup';
import Api from '../services/Api';
import Scryfall from '../services/Scryfall';

const confirmDelete = () => window.confirm('This cannot be undone! Are you sure?');

export default ({ decks, onAction: on, selected }) => {
	const [importMode, setImportMode] = useState('tappedout');
	const [importData, setImportData] = useState('');

	const scryfall = new Scryfall();
	const api = new Api();

	const loadDeck = async deck => {
		if (!selected || deck.id !== selected) {
			if (deck.cards.length > 0) {
				const cards = (await scryfall.collection(deck.cards
					.map(({ data }) => data))
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
	}

	const importDeck = async () => {
		switch (importMode) {
			case 'tappedout':
				const deck = await api.deck(importData);

				// Scryfall collection endpoint only returns English cards
				let cards = (await scryfall.collection(deck.cards
					.map(card => card.set ? { name: card.name, set: card.set } : { name: card.name }))
				).reduce((o, card) => ({ ...o, [`${card.card_faces ? card.card_faces[0].name : card.name}${card.set}`]: card }), {});

				const missing = [];

				deck.cards = (await Promise.all(deck.cards.map(async card => {
					let data = cards[`${card.name}${card.set}`];
					
					// Non-English and promo cards have to be searched individually
					if (card.lang !== 'en' || (card.tappedOutProps && (card.tappedOutProps.promo || card.tappedOutProps.prerelease))) {
						data = await scryfall.findCard(card);
					}

					if (!data) {
						missing.push(card);
						return;
					}

					return {
						...card,
						board: card.board == 'main' || card.board == 'side' ? card.board : 'extra',
						set: data.set,
						hash: getCardHash(data, card),
						data
					};
				}))).filter(card => card);

				if (missing.length > 0) {
					alert(`The following cards could not be loaded:\n${missing.map(({ name }) => name).join('\n')}`);
				}

				deck.id = Date.now();

				return deck;
			default: return;
		}
	};

	return <div className={`browser page`}>
		<div className="container">
			<h4 className="noselect">Decks</h4>
			<button type="button" className="top noselect" onClick={_ => on('new')}>
				<span>+</span>
			</button>
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
				<span className="tip">{decks.length} decks in local storage</span>
			</div>
			<div className="row">
				<input type="reset" value="Clear local decks" onClick={e => {
					e.preventDefault();
					if (confirmDelete()) on('clear');
				}} />
			</div>
			<h5>Import deck</h5>
			<div className="row">
				<RadioGroup name="import" direction="horizontal" options={[
					{ id: 'tappedout', label: 'TappedOut' },
					{ id: 'decklist', label: 'Decklist' },
					// { id: 'hash', label: 'Hash' },
				]} value={importMode} onChange={value => setImportMode(value)} />
				<form onSubmit={async e => {
					e.preventDefault();
					on('load', await importDeck());
				}} >
					{importMode === 'decklist' ?
						<textarea value={importData} onChange={e => setImportData(e.target.value)} /> :
						<input type="text" value={importData} onChange={e => setImportData(e.target.value)} />
					}
					<div className="flex buttons row">
						<input type="submit" value="Load"/>
					</div>
				</form>
			</div>
		</div>
	</div>;
}