import axios from 'axios';

const API = '/api';

const headers = key => ({ headers: { 'Database-Key': key } });

export default class {
	constructor() {
		const client = axios.create({
			baseURL: API
		});
		this.check = db => client.get('/db', headers(db.key)).then(response => response.status === 200, () => false);
		this.getDecks = db => client.get(`/users/${db.user}/decks`, headers(db.key)).then(response => response.data);
		this.putDeck = (deck, db) => client.put(`/users/${db.user}/decks/${deck.id}`, deck, headers(db.key));
		this.deleteDeck = (deckId, db) => client.delete(`/users/${db.user}/decks/${deckId}`, headers(db.key));
	}
}