import React, { Component, Fragment } from 'react';
import Scryfall from '../services/Scryfall';
import Field from './Field';
import Fieldset from './Fieldset';
import Checkbox from './Checkbox';
import MTGIO from '../services/MTGIO';
import Card from './Card';
import Loading from './Loading';
import { countCards, getCardHash, getLanguageName, getPrintedLanguageCode, getCardName } from './utils';
import { languages, boards } from '../static/constants.json';

const SEARCH_DELAY = 100;

export default class extends Component {
	constructor(props) {
		super(props);

		this.scryfall = new Scryfall();
		this.mtgio = new MTGIO();
		this.timestamp = Date.now();

		this.state = {
			deck: this.getInitialDeck(),
			formats: JSON.parse(localStorage.getItem('formats')) || [''],
			formatsUpdated: false,
			query: '',
			autocomplete: [],
			searchTimer: 0,
			card: null,
			sets: [],
			setsLoading: false,
			languages: {},
			languagesLoading: false,
			count: 1,
			foil: false,
			signed: false,
			alter: false,
			commander: false,
			board: 'main',
			editingImage: null
		};
	}

	getInitialDeck = () => this.props.deck || {
		id: '',
		title: '',
		creator: '',
		format: '',
		description: '',
		cards: []
	};

	componentDidMount = async () => {
		window.addEventListener('click', this.clearAutocomplete);

		try {
			this.setState({ formats: await this.mtgio.formats(), formatsUpdated: true },
				() => localStorage.setItem('formats', JSON.stringify(this.state.formats)));
		} catch (error) { this.mtgio.error(error); }
	}

	componentWillUnmount = () => {
		window.removeEventListener('click', this.clearAutocomplete);

		this.scryfall.cancel();
		this.mtgio.cancel();
	}

	componentDidUpdate = prev => {
		const { deck } = this.props;
		if ((deck !== null && deck.id !== this.state.deck.id) || (deck === null && prev.deck !== null)) {
			this.setState({ deck: this.getInitialDeck() });
		}
	}

	setDeckProperty = (key, value) => {
		const deck = this.state.deck;
		deck[key] = value;
		this.setState({ deck });
	}

	onSearch = query => {
		// checking timer reduces outgoing autocomplete requests during typing
		if (this.state.searchTimer !== 0) {
			clearInterval(this.state.searchTimer);
		}

		// using a nonce prevents delayed older responses from overwriting newer ones
		let nonce = Date.now();
		this.onSearch.nonce = nonce;

		const trimmed = query.trim();

		this.setState({
			query,
			searchTimer: setTimeout(async () => {
				try {
					const autocomplete = await this.scryfall.autocomplete(trimmed);

					if (this.onSearch.nonce === nonce) {
						this.setState({ autocomplete });

						// trigger card lookup automatically if the query matches a card name
						if (autocomplete.find(value => value.toLowerCase() === trimmed.toLowerCase())) {
							this.findCard(trimmed);
						}
					}
				} catch (error) { this.scryfall.error(error); }
			}, SEARCH_DELAY)
		});
	}

	onSuggestionSelected = value => {
		const newCard = this.state.query.toLowerCase() !== value.toLowerCase();
		this.setState({
			query: value,
			autocomplete: []
		}, () => {
			if (newCard) this.findCard(this.state.query)
		});
	}

	findCard = async name => {
		let nonce = Date.now();
		this.findCard.nonce = nonce;

		try {
			const card = await this.scryfall.named(name);

			if (this.findCard.nonce === nonce) {
				// do not set card here because /named endpoint can return non-paper sets
				this.setState({
					sets: [],
					languages: {},
					count: 1,
					foil: false,
					signed: false,
					alter: false,
					commander: false
				});
				this.findSets(card.name);
			}
		} catch (error) { this.scryfall.error(error); }
	}

	findSets = async name => {
		let nonce = Date.now();
		this.findSets.nonce = nonce;

		this.setState({ setsLoading: true });

		try {
			const sets = await this.scryfall.setsFor(name);

			if (this.findSets.nonce === nonce) {
				// set search filters by paper, so safe to set initial card now
				const languages = sets.reduce((o, set) => ({ ...o, [set.code]: { data: { en: set.cards } } }), {});
				this.setState({ sets, languages, card: sets.default, setsLoading: false });
				this.findLanguages(name, this.state.card.set);
			}
		} catch (error) { this.scryfall.error(error); }
	}

	findLanguages = async (name, set) => {
		if (!this.state.languages[set].loaded) {
			const languages = this.state.languages;
			this.setState({ languagesLoading: true });

			try {
				languages[set].data = await this.scryfall.languagesFor(name, set);
				languages[set].loaded = true;
				this.setState({ languages, languagesLoading: false });
			} catch (error) { this.scryfall.error(error); }
		}
	}

	clearAutocomplete = () => this.setState({ autocomplete: [] });

	onSetChanged = code => {
		this.setState({ card: this.state.sets.find(set => set.code === code).cards[0] }, () =>
			this.findLanguages(this.state.card.name, code)
		);
	}

	onLanguageChanged = lang => {
		this.setState({ card: this.state.languages[this.state.card.set].data[lang][0] });
	}

	onVersionChanged = number => {
		this.setState({ card: this.state.languages[this.state.card.set].data[this.state.card.lang].find(card => card.collector_number === number) });
	}

	getFoilValue = () => this.state.card !== null && this.state.card.foil && (!this.state.card.nonfoil || this.state.foil);

	addCard = () => {
		const hash = getCardHash(this.state.card, {
			...this.state,
			foil: this.getFoilValue()
		});
		const count = parseInt(this.state.count);
		const cards = this.state.deck.cards;
		const existing = cards.find(card => card.hash === hash);

		if (existing) {
			existing.count += count;
		}
		else {
			cards.push({
				hash,
				count,
				name: this.state.card.name,
				set: this.state.card.set,
				lang: this.state.card.lang,
				foil: this.getFoilValue(),
				signed: this.state.signed,
				alter: this.state.alter,
				commander: this.state.commander,
				board: this.state.board,
				data: this.state.card
			})
		}

		this.setDeckProperty('cards', cards);
	}

	setCardProperty = (card, key, value) => {
		if (value) {
			card[key] = value;
		}
		else delete card[key];
		this.setDeckProperty('cards', this.state.deck.cards);
	}

	render = () => <div className="editor page">
		<div className="container">
			<h4 className="noselect">Deck editor</h4>
			<button type="button" className="top noselect" onClick={() => {
				if (typeof this.props.onClose === 'function') this.props.onClose();
			}}>
				<span>&times;</span>
			</button>
			<section>
				<Fieldset label="Deck">
					<div className="gutter-right">
						<div className="flex">
							<Field label="Title" className="title">
								<input type="text" value={this.state.deck.title} onChange={e => this.setDeckProperty('title', e.target.value)} />
							</Field>
							<Field label="Creator" className="creator">
								<input type="text" value={this.state.deck.creator} onChange={e => this.setDeckProperty('creator', e.target.value)} />
							</Field>
							<Field label={<Fragment>Format{!this.state.formatsUpdated && <Loading />}</Fragment>}>
								<select value={this.state.deck.format} onChange={e => this.setDeckProperty('format', e.target.value)}>
									{this.state.formats.map(format =>
										<option key={format} value={format.toLowerCase()}>{format}</option>
									)}
								</select>
							</Field>
						</div>
						<Field label="Description">
							<textarea rows="4" value={this.state.deck.description} onChange={e => this.setDeckProperty('description', e.target.value)} />
						</Field>
					</div>
				</Fieldset>
				<Fieldset label="Card">
					<div className="flex">
						<form className="card-details fill" onSubmit={e => {
							e.preventDefault();
							this.addCard();
						}}>
							<div className="flex">
								<Field label="Name" className="fill">
									<div className="search container">
										{this.state.autocomplete.length > 0 &&
											<ul className="autocomplete">
												{this.state.autocomplete.map((value, i) =>
													<li key={i} onClick={e => {
														e.stopPropagation();
														this.onSuggestionSelected(e.target.childNodes[0].nodeValue);
													}}>{value}</li>
												)}
											</ul>
										}
										<input type="text" value={this.state.query} onChange={e => {
											const query = e.target.value;
											if (query.length >= 2) this.onSearch(query);
											else this.setState({ query });
										}} />
									</div>
								</Field>
								<Field label="Count" className="count">
									<input type="number" min={1}
										value={this.state.count}
										onChange={e => this.setState({ count: e.target.value })} />
								</Field>
							</div>
							<Field label={<Fragment>Set{this.state.setsLoading && <Loading />}</Fragment>}>
								{this.state.card && this.state.sets.length > 0 ?
									<select value={this.state.card.set} onChange={e => this.onSetChanged(e.target.value)}>
										{this.state.sets.map(({ code, name }) =>
											<option key={code} value={code}>{`${name} (${code.toUpperCase()})`}</option>
										)}
									</select>
									: <select disabled></select>
								}
							</Field>
							<div className="flex">
								<Field label={<Fragment>Language{this.state.languagesLoading && <Loading />}</Fragment>} className="fill">
									{this.state.card && this.state.languages[this.state.card.set] ?
										<select value={this.state.card.lang} onChange={e => this.onLanguageChanged(e.target.value)}>
											{Object.keys(this.state.languages[this.state.card.set].data || {}).map(lang =>
												<option key={lang} value={lang}>{getLanguageName(lang)}</option>
											)}
										</select>
										: <select disabled></select>
									}
								</Field>
								<Field label="Version" className="number">
									{this.state.card && this.state.languages[this.state.card.set] ?
										<select value={this.state.card.collector_number} onChange={e => this.onVersionChanged(e.target.value)}>
											{((this.state.languages[this.state.card.set].data || {})[this.state.card.lang] || []).map(({ collector_number }) =>
												<option key={collector_number}>{collector_number}{}</option>
											)}
										</select>
										: <select disabled></select>
									}
								</Field>
							</div>
							<div className="flex">
								<Checkbox right size="large" label="Foil" id="foil"
									checked={this.getFoilValue()}
									onChange={e => this.setState({ foil: e.target.checked })}
									disabled={!this.state.card || (this.state.card.foil ? !this.state.card.nonfoil : this.state.card.nonfoil)} />
								<Checkbox right size="large" label="Signed" id="signed"
									checked={this.state.signed}
									onChange={e => this.setState({ signed: e.target.checked })}
									disabled={!this.state.card} />
								<Checkbox right size="large" label="Alter" id="alter"
									checked={this.state.alter}
									onChange={e => this.setState({ alter: e.target.checked })}
									disabled={!this.state.card} />
								{['commander', 'brawl', 'duel'].includes(this.state.deck.format) &&
									<Checkbox right size="large" label="Commander" id="commander"
										checked={this.state.commander}
										onChange={e => this.setState({ commander: e.target.checked })}
										disabled={!this.state.card} />
								}
							</div>
							<div className="flex buttons">
								<input type="submit" className="hidden" disabled={!this.state.card} />
								<input type="button" value="Add card" onClick={() => this.addCard()} disabled={!this.state.card} />
							</div>
						</form>
						<div className="card-preview noselect">
							<Card simple card={this.state.card} options={{ foil: this.getFoilValue() }} />
						</div>
					</div>
				</Fieldset>
				{this.state.deck.id &&
					<div className="metadata row flex tip">
						<span>Deck ID {this.state.deck.id}</span>
						<span>Created {new Date(this.state.deck.id).toUTCString()}</span>
					</div>
				}
				<div className="flex buttons row">
					<input type="submit" value="Save deck" onClick={e => {
						e.preventDefault();
						if (typeof this.props.onSave === 'function') this.props.onSave(this.state.deck);
					}} />
					<input type="reset" value="Reset changes" onClick={e => {
						e.preventDefault();
						this.setState({ deck: this.getInitialDeck() })
					}} />
				</div>
			</section>
			<section className="deck-preview">
				<ul className="nav horizontal">
					{boards.map(({ name, value }) => {
						const count = countCards(this.state.deck.cards.filter(({ board }) => board === value));
						return <li key={value} className={this.state.board === value ? 'current' : null}>
							<h5>
								<a href={`#${value}`} onClick={e => {
									e.preventDefault();
									this.setState({ board: value });
								}}>{name}</a>
								{count > 0 && <span className="tip">{count}</span>}
							</h5>
						</li>
					})}
				</ul>
				<table>
					<thead>
						<tr>
							<th className="thumbnail"></th>
							<th className="name">Card</th>
							<th className="count">Count</th>
							<th className="lang">Language</th>
							<th className="delete"></th>
						</tr>
					</thead>
					<tbody>
						{this.state.deck.cards.filter(({ board }) => board === this.state.board).map((card) => <tr key={card.hash}>
							<td className="thumbnail noselect">
								<div onContextMenu={e => {
									e.preventDefault();
									this.setState({ editingImage: this.state.editingImage === card.hash ? null : card.hash });
								}}>
									<Card simple card={card.data} options={card} />
								</div>
							</td>
							<td className="name">
								<div>
									{getCardName(card.data)}{card.commander && <span className="commander tip">commander</span>}<br />
									<span className="tip">
										{[card.data.set, getPrintedLanguageCode(card.data.lang), card.data.collector_number].join(' · ')}
										<span className="options">{['foil', 'signed', 'alter'].filter(n => card[n]).join(' ')}</span>
									</span>
								</div>
								{this.state.editingImage === card.hash &&
									<div className="image-editor">
										<div>
											<input type="text" placeholder="Image override" value={card.image} onChange={e => this.setCardProperty(card, 'image', e.target.value)} />
											&emsp;
											<input type="number" placeholder="Border" value={card.imageBorder} onChange={e => this.setCardProperty(card, 'imageBorder', e.target.value)} />
										</div>
										{Array.isArray(card.data.card_faces) && 
											<div>
												<input type="text" placeholder="Back override" value={card.imageBack} onChange={e => this.setCardProperty(card, 'imageBack', e.target.value)} />
												&emsp;
												<input type="number" placeholder="Border" value={card.imageBackBorder} onChange={e => this.setCardProperty(card, 'imageBackBorder', e.target.value)} />
											</div>
										}
									</div>
								}
							</td>
							<td className="count">
								<input type="number" value={card.count} onChange={e => {
									card.count = parseInt(e.target.value);
									this.setDeckProperty('cards', this.state.deck.cards);
								}} />
							</td>
							<td className="lang">
								{languages.find(({ code }) => code === card.lang) ?
									<select value={card.lang} onChange={e => {
										card.hash = getCardHash(card.data, card);
										card.lang = e.target.value;
										this.setDeckProperty('cards', this.state.deck.cards);
									}}>
										{languages.filter(({ special }) => !special).map(({ name, code }) => <option key={code} value={code}>{name}</option>)}
									</select>
									: getLanguageName(card.lang)
								}
							</td>
							<td className="delete">
								<button type="button" onClick={e => this.setDeckProperty('cards', this.state.deck.cards.filter(({ hash }) => hash !== card.hash))}>
									<span>&times;</span>
								</button>
							</td>
						</tr>)}
					</tbody>
				</table>
			</section>
		</div>
	</div>
}