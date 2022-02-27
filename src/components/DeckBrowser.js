import React, { useState } from 'react';
import { countCards, getCardHash } from './utils';
import RadioGroup from './RadioGroup';
import Scryfall from '../services/Scryfall';
import Field from './Field';

const confirmDelete = () => window.confirm('This cannot be undone! Are you sure?');

export default ({ decks, onAction: on, selected, config }) => {
	const [importMode, setImportMode] = useState('tappedout');
	const [importData, setImportData] = useState('');

	const scryfall = new Scryfall();

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

	return <div className={`browser page`}>
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
			<div style={{ display: 'none' }}>
				<h5>Import deck</h5>
					<RadioGroup name="import" direction="horizontal" options={[
						{ id: 'tappedout', label: 'TappedOut' },
						{ id: 'decklist', label: 'Decklist' },
						// { id: 'hash', label: 'Hash' },
					]} value={importMode} onChange={value => setImportMode(value)} />
					<form onSubmit={async e => {
						e.preventDefault();
					}} >
						{importMode === 'decklist' ?
							<textarea value={importData} onChange={e => setImportData(e.target.value)} /> :
							<input type="text" value={importData} onChange={e => setImportData(e.target.value)} />
						}
						<div className="flex buttons row">
							<input disabled type="submit" value="Load"/>
						</div>
					</form>
			</div>
			<div>
				<h5>Database</h5>
				<div className="flex gutter-right">
					<Field label="Key">
						<input type="text" value={config.db.key} onChange={e => on('config', { db: { key: e.target.value } })} />
						<div className="tip">Database {config.db.available ? 'available' : 'unavailable'}</div>
					</Field>
					<Field label="User">
						<input type="text" value={config.db.user} onChange={e => on('config', { db: { user: e.target.value } })} />
					</Field>
				</div>
			</div>
		</div>
	</div>;
}