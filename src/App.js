import React, { Component } from 'react';
import DeckEditor from "./components/DeckEditor";
import './scss/App.scss';
import DeckBrowser from './components/DeckBrowser';
import DeckViewer from './components/DeckViewer';

export default class extends Component {
	constructor(props) {
		super(props);

		this.state = {
			deck: null,
			decks: this.loadDecksFromStorage().map(compressed => compressed.startsWith("{") ? JSON.parse(compressed) : JSON.parse(window.LZString.decompressFromBase64(compressed))),
			showEditor: false
		}
	}

	loadDecksFromStorage = () => JSON.parse(localStorage.getItem('decks')) || [];

	compressDeck = deck => {
		const stripped = {
			...deck,
			cards: deck.cards.map(card => ({
				...card,
				name: null,
				hash: null,
				data: {
					id: card.data.id
				}
			}))
		}
		return [window.LZString.compressToBase64(JSON.stringify(stripped)), stripped];
	}

	newDeck = () => this.setState({ deck: null, showEditor: true });

	saveDeck = deck => {
		if (!deck.id) deck.id = Date.now();

		const { decks } = this.state;
		const existing = decks.findIndex(({ id }) => id === deck.id);
		const [compressed, stripped] = this.compressDeck(deck);
		const storage = this.loadDecksFromStorage();

		if (existing > -1) {
			decks[existing] = stripped;
			storage[existing] = compressed;
		}
		else {
			decks.push(stripped);
			storage.push(compressed);
		}

		this.setState({ deck, decks });
		localStorage.setItem('decks', JSON.stringify(storage));
	}

	deleteDeck = () => {
		const decks = this.state.decks;
		const storage = this.loadDecksFromStorage();
		const index = decks.findIndex(({ id }) => id === this.state.deck.id);

		if (index >= 0) {
			decks.splice(index, 1);
			storage.splice(index, 1);
			this.setState({ deck: null, decks });
			localStorage.setItem('decks', JSON.stringify(storage));
		}
	}

	clearDecks = () => {
		this.setState({ decks: [] })
		localStorage.setItem('decks', '[]');
	}

	toggleEditor = () => this.setState({ showEditor: !this.state.showEditor });

	browserActionHandler = (action, ...args) => {
		switch (action) {
			case 'new': return this.newDeck();
			case 'load': return this.setState({ deck: args[0] }, () => console.log(this.state.deck));
			case 'edit': return this.toggleEditor();
			case 'delete': return this.deleteDeck();
			case 'clear': return this.clearDecks();
			default: return;
		}
	}

	render = () =>
		<div className="root container flex">
			<div className="dark collapsible browser-container">
				<DeckBrowser decks={this.state.decks} selected={this.state.deck && this.state.deck.id}
					onAction={this.browserActionHandler} />
			</div>
			<div className={`dark collapsible editor-container${this.state.showEditor ? '' : ' collapsed'}`}>
				{this.state.showEditor && <DeckEditor deck={this.state.deck}
					onSave={this.saveDeck}
					onClose={() => this.setState({ showEditor: false })} />
				}
			</div>
			{this.state.deck && <DeckViewer deck={this.state.deck} />}
		</div>
}