import React, { Component } from 'react';
import DeckBrowser from './components/DeckBrowser';
import DeckEditor from './components/DeckEditor';
import DeckViewer from './components/DeckViewer';
import Settings from './components/Settings';
import Database from './services/Database';
import './scss/App.scss';

const db = new Database();

export default class extends Component {
	constructor(props) {
		super(props);

		this.state = {
			deck: null,
			decks: [],
			showEditor: false,
			config: {
				viewer: {
					animateFoil: true
				},
				db: {
					key: null,
					user: null,
					available: false
				},
				...(JSON.parse(localStorage.getItem('config')) || {})
			}
		}
	}

	componentDidMount = async () => this.setState({ decks: await this.loadDecks() });

	loadDecks = async () =>
		[
			...this.loadDecksFromStorage(),
			...await this.loadDecksFromDatabase()
		].sort((a, b) => a.id - b.id);

	loadDecksFromStorage = () => (JSON.parse(localStorage.getItem('decks')) || []).map(deck => ({ ...(deck.cards /* temp */ ? deck : this.decompressDeck(deck.compressed || deck)), db: false }));

	loadDecksFromDatabase = async () => {
		try {
			if (this.state.config.db.available)
				return (await db.getDecks(this.state.config.db)).map(deck => ({ ...deck, db: true }));
			else return [];
		}
		catch (err) {
			console.log('Error fetching decks from database:');
			console.log(err);
			return [];
		}
	}
	
	decompressDeck = compressed => compressed.startsWith("{") ? JSON.parse(compressed) : JSON.parse(window.LZString.decompressFromBase64(compressed));

	compressDeck = deck => {
		const stripped = {
			...deck,
			cards: deck.cards.map(card => {
					const c = {
						...card,
						data: {
							id: card.data.id
						}
					};
					delete c.name;
					delete c.hash;
					return c;
				})
		}

		delete stripped.db;

		return [window.LZString.compressToBase64(JSON.stringify(stripped)), stripped];
	}

	newDeck = () => this.setState({ deck: null, showEditor: true });

	saveDeck = async deck => {
		if (!deck.id) deck.id = Date.now();
		
		const isDb = deck.db;
		const [compressed, stripped] = this.compressDeck(deck);
		const storage = this.loadDecksFromStorage(); // change later after storage converted
		const existing = this.state.decks.findIndex(({ id }) => id === deck.id);

		if (isDb) {
			try {
				await db.putDeck(stripped, this.state.config.db);
				if (existing > -1) {
					storage.splice(existing, 1);
					localStorage.setItem('decks', JSON.stringify(storage));
				}
			}
			catch (err) {
				console.log('Error occurred saving deck');
				console.log(err);
				alert('An error occured while saving the deck to the database! Changes may not have been saved.');
			}
		}
		else {
			if (existing > -1) {
				storage[existing] = { id: deck.id, compressed };
			}
			else {
				storage.push({ id: deck.id, compressed });
			}

			if (this.state.config.db.available) {
				await db.deleteDeck(deck.id, this.state.config.db);
			}

			localStorage.setItem('decks', JSON.stringify(storage));
		}

		this.setState({ deck, decks: await this.loadDecks() });
	}

	deleteDeck = async () => {
		const isDb = this.state.deck.db;
		
		if (isDb) {
			try {
				await db.deleteDeck(this.state.deck.id, this.state.config.db);
			}
			catch (err) {
				console.log('Error occurred deleting deck');
				console.log(err);
			}
		}
		else {
			const storage = this.loadDecksFromStorage();
			const index = storage.findIndex(({ id }) => id === this.state.deck.id);
	
			if (index >= 0) {
				storage.splice(index, 1);
				localStorage.setItem('decks', JSON.stringify(storage));
			}
		}

		this.setState({ deck: null, decks: await this.loadDecks() });
	}

	clearDecks = () => {
		this.setState({ decks: [] })
		localStorage.setItem('decks', '[]');
	}

	toggleEditor = () => this.setState({ showEditor: !this.state.showEditor });

	setConfig = async config => {
		const newConfig = {
			viewer: {
				...this.state.config.viewer,
				...config.viewer
			},
			db: {
				...this.state.config.db,
				...config.db
			}
		};

		if (newConfig.db.key !== this.state.config.db.key) {
			newConfig.db.available = await db.check(newConfig.db);
		}
		
		this.setState({ config: newConfig }, async () => this.setState({ decks: await this.loadDecks() }));
		localStorage.setItem('config', JSON.stringify(newConfig));
	}

	actionHandler = (action, ...args) => {
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
					onAction={this.actionHandler} />
				<Settings config={this.state.config}
					onChange={this.setConfig} />
			</div>
			<div className={`dark collapsible editor-container${this.state.showEditor ? '' : ' collapsed'}`}>
				{this.state.showEditor && <DeckEditor deck={this.state.deck}
					config={this.state.config}
					onSave={this.saveDeck}
					onClose={() => this.setState({ showEditor: false })} />
				}
			</div>
			{this.state.deck && <DeckViewer deck={this.state.deck} config={this.state.config.viewer} />}
		</div>
}