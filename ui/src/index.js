import React from "react";
import ReactDOM from "react-dom";

const host = ".";

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            deck: null,
            deckVisible: false,
            waiting: false,
            bufferedDeck: null
        }
        
        this.deckLoaded = this.deckLoaded.bind(this);
    }

    deckLoaded(deck) {
        // If we are mid-transition, defer to buffer
        if (this.state.waiting) {
            this.setState({
                bufferedDeck: deck
            });
        }
        // Unload current deck
        else if (this.state.deck) {
            this.setState({
                deckVisible: false,
                waiting: true,
                bufferedDeck: deck
            });
            setTimeout(() => {
                this.setState({
                    deck: this.state.bufferedDeck,
                    deckVisible: this.state.bufferedDeck ? true : false,
                    waiting: false,
                    bufferedDeck: null
                })
            }, 500);
        }
        // If no current deck, load immediately
        else {
            this.setState({
                deck: deck,
                deckVisible: true
            });
        }
    }

    render() {
        return (
            <div className="container">
                <DeckLoader onDeckLoaded={this.deckLoaded} />
                <DeckView visible={this.state.deckVisible} deck={this.state.deck} />
            </div>
        )
    }
}

class DeckLoader extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: null,
            inProgress: false,
            searchString: ""
        }

        this.loadDeck = this.loadDeck.bind(this);
        this.searchUpdated = this.searchUpdated.bind(this);
    }

    searchUpdated(e) {
        this.setState({
            inProgress: this.state.inProgress,
            searchString: e.target.value
        });
    }

    loadDeck(e) {
        this.props.onDeckLoaded(null);
        var slug = this.state.searchString.trim();
        this.setState({
            error: null,
            inProgress: true,
        });
        fetch(`${host}/api/deck/${slug}`)
            .then(res => res.json())
            .then(deck => {
                this.setState({
                    error: null,
                    inProgress: false,
                });
                this.props.onDeckLoaded(deck);
            }, error => {
                this.setState({
                    error: error,
                    inProgress: false,
                });
            });
        e.preventDefault();
    }

    render() {
        const error = this.state.error ? <div className="error">{this.state.error}</div> : null;
        return (
            <div>
                <form id="searchForm" onSubmit={this.loadDeck}>
                    <input type="text" autocomplete="off" value={this.state.value} onChange={this.searchUpdated} /> <input type="submit" value="Load deck" disabled={this.state.inProgress} />
                </form>
                {error}
            </div>
        )
    }
}

class DeckView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            cards: null,
            loadedCards: 0,
            loaded: false,
            view: "default"
        }

        this.cardLoaded = this.cardLoaded.bind(this);
    }

    cardLoaded() {
        this.setState((prevState) => ({
            loadedCards: prevState.loadedCards + 1
        }));
    }

    componentDidMount() {
        this.setState({});
    }

    componentDidUpdate(prevProps) {
        const deck = this.props.deck;
        if (prevProps.deck !== deck) {
            this.setState({
                cards: null,
                loadedCards: 0
            });
        }
        else if (deck) {
            if (!this.state.cards) {
                var cards = [];
                deck.list.forEach(card => {
                    for (var i = 0; i < card.quantity; i++) {
                        cards.push(<Card card={card} onCardLoaded={this.cardLoaded} />);
                    }
                });
                this.setState({
                    cards: cards
                });
            }
            else if (!this.state.loaded && this.state.cards.length == this.state.loadedCards) {
                this.setState({
                    loaded: true
                });
                ChangeView("#sortedView", () => { SortCards(deck); });
            }
        }
    }

    render() {
        const deck = this.props.deck;
        return (
            <div className={"deck-area" + (!this.props.visible ? " hidden" : "")}>
                {deck ?
                <div className="header">
                    <h2 id="deckTitle">{deck.url ? <a href={deck.url} target="_blank">{deck.name}</a> : deck.name}</h2>
                    <ul id="deckInfo">
                        {deck.author ? <li><b>Creator</b>&ensp;<a href={deck.userpage} target="_blank">{deck.author}</a></li> : null}
                        {deck.format ? <li><b>Format</b>&ensp;{deck.format}</li> : null}
                        {deck.count ? <li><b>Cards</b>&ensp;{deck.count}</li> : null}
                        {deck.description ? <li style={{display: "block"}}><b>Description</b><br />{deck.description}</li> : null}
                    </ul>
                </div>
                : null}
                <div id="defaultView" className={"view card-area" + (!this.state.cards ? " hidden" : "")}>
                    {this.state.cards}
                </div>
                <div id="sortedView" className="view hidden">
                    <div className="main section">
                        <h3>Main<span className="count"></span></h3>
                        <div className="commander section">
                            <h4>Commander<span className="count"></span></h4>
                            <div className="card-area"></div>
                        </div>
                        <div className="creature section">
                            <h4>Creatures<span className="count"></span></h4>
                            <div className="card-area"></div>
                        </div>
                        <div className="sorcery section">
                            <h4>Sorceries<span className="count"></span></h4>
                            <div className="card-area"></div>
                        </div>
                        <div className="instant section">
                            <h4>Instants<span className="count"></span></h4>
                            <div className="card-area"></div>
                        </div>
                        <div className="artifact section">
                            <h4>Artifacts<span className="count"></span></h4>
                            <div className="card-area"></div>
                        </div>
                        <div className="enchantment section">
                            <h4>Enchantments<span className="count"></span></h4>
                            <div className="card-area"></div>
                        </div>
                        <div className="planeswalker section">
                            <h4>Planeswalkers<span className="count"></span></h4>
                            <div className="card-area"></div>
                        </div>
                        <div className="land section">
                            <h4>Lands<span className="count"></span></h4>
                            <div className="card-area"></div>
                        </div>
                        <div className="other section">
                            <h4>Other<span className="count"></span></h4>
                            <div className="card-area"></div>
                        </div>
                    </div>
                    <div className="side section">
                        <h3>Sideboard<span className="count"></span></h3>
                        <div className="card-area"></div>
                    </div>
                    <div className="maybe section">
                        <h3>Maybe<span className="count"></span></h3>
                        <div className="card-area"></div>
                    </div>
                    <div className="acquire section">
                        <h3>Acquire<span className="count"></span></h3>
                        <div className="card-area"></div>
                    </div>
                </div>
            </div>
        )
    }
}

class Card extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            card: null,
            imgLoaded: false
        }

        this.imageLoaded = this.imageLoaded.bind(this);
    }

    imageLoaded() {
        this.setState({
            imgLoaded: true
        })
    }

    componentDidMount() {
        this.setState({});
    }

    componentDidUpdate(prevProps) {
        const card = this.props.card;
        if (prevProps.card !== card) {
            this.setState({
                card: null,
                imgLoaded: false
            });
        }
        else if (!this.state.card) {
            fetch(`${host}/api/scryfall?name=${encodeURIComponent(card.name)}&set=${card.set}&lang=${card.language}`)
                .then(res => res.json())
                .then(result => {
                    this.setState({
                        card: result
                    });
                    this.props.onCardLoaded();

                    if (!result.qualityImage) {
                        fetch(`${host}/api/img?name=${encodeURIComponent(card.name)}&set=${card.set}&lang=${card.language}`)
                            .then(res => res.json())
                            .then(newImg => {
                                this.setState({
                                    imgLoaded: false
                                });

                                setTimeout(() => {
                                    result.images.unshift(newImg[0].url);
                                    result.imageBorderCropped = true;
                                    this.setState({});
                                }, 500);
                            });
                    }
                });
        }
    }

    render() {
        const card = this.props.card;
        const cardDetails = this.state.card;

        var cardClasses = ["card", card.board.toLowerCase()];
        if (cardDetails) cardClasses.push(cardDetails.types.join(" ").toLowerCase());

        var imgClasses = [];
        if (cardDetails && cardDetails.imageBorderCropped) imgClasses.push("border-crop");
        if (!this.state.imgLoaded) imgClasses.push("hidden");

        return (
            <div className={cardClasses.join(" ")}>
                <div class="frame">
                    <div class="card-title">{card.name}</div>
                    <div class="card-info">
                        <div class="left">{card.set && cardDetails ? cardDetails.set : card.set}&emsp;{card.language.toUpperCase()}&emsp;{card.signed ? "Signed" : ""}{card.foil ? " Foil" : ""}{card.alter ? " Alter" : ""}</div>
                        <div class="right"></div>
                    </div>
                    {cardDetails ? <img className={imgClasses.join(" ")} onLoad={this.imageLoaded} src={cardDetails.images[0]} alt={cardDetails.printedName} /> : null}
                    {cardDetails && card.foil ? <div class='foil layer'></div> : null}
                </div>
            </div>
        )
    }
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);