import React from "react";
import ReactDOM from "react-dom";

const host = ".";

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        }
        
        this.deckLoaded = this.deckLoaded.bind(this);
    }

    deckLoaded(deck) {
        console.log(deck);
        this.setState({ deck: deck });
    }

    render() {
        return (
            <div className="container">
                <DeckLoader onDeckLoaded={this.deckLoaded} />
                <DeckView deck={this.state.deck} />
            </div>
        )
    }
}

class DeckLoader extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
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
        var slug = this.state.searchString.trim();
        this.setState({
            inProgress: true,
            searchString: slug
        });
        fetch(`${host}/api/deck/${slug}`)
            .then(res => res.json())
            .then(deck => {
                this.setState({
                    inProgress: false,
                    searchString: slug
                });
                this.props.onDeckLoaded(deck);
            }, error => {
                this.setState({
                    error: error,
                    inProgress: false,
                    searchString: slug
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
            totalCards: 0,
            loadedCards: 0
        }

        this.cardLoaded = this.cardLoaded.bind(this);
    }

    cardLoaded() {
        this.setState((prevState, props) => ({
            totalCards: prevState.totalCards,
            loadedCards: prevState.loadedCards + 1
        }));
    }

    render() {
        const deck = this.props.deck;
        if (deck) {
            var cards = [];
            deck.list.forEach(card => {
                cards.push(<Card card={card} onCardLoaded={this.cardLoaded} />);
            });
            
            return (
                <div className="deck-area">
                    <div className="header">
                        <h2>{deck.url ? <a href={deck.url} target="_blank">{deck.name}</a> : deck.name}</h2>
                        <ul id="deckInfo">
                            {deck.author ? <li><b>Creator</b>&ensp;<a href={deck.userpage} target="_blank">{deck.author}</a></li> : null}
                            {deck.format ? <li><b>Format</b>&ensp;{deck.format}</li> : null}
                            {deck.count ? <li><b>Cards</b>&ensp;{deck.count}</li> : null}
                            {deck.description ? <li style={{display: "block"}}><b>Description</b><br />{deck.description}</li> : null}
                        </ul>
                    </div>
                    <div id="defaultView" className="view card-area">
                        {cards}
                    </div>
                </div>
            )
        }
        else return null;
    }
}

class Card extends React.Component {
    constructor(props) {
        super(props);
        this.state = {}
    }

    imageLoaded() {
        $("img", this).removeClass("hidden");
    }

    componentDidMount() {
        const card = this.props.card;
        fetch(`${host}/api/scryfall?name=${encodeURIComponent(card.name)}&set=${card.set}&lang=${card.language}`)
            .then(res => res.json())
            .then(result => {
                this.setState({
                    card: result
                });
                this.props.onCardLoaded();
            });
    }

    render() {
        const card = this.props.card;
        const cardDetails = this.state.card;

        return (
            <div className="card">
                <div class="frame">
                    <div class="card-title">{card.name}</div>
                    <div class="card-info">
                        <div class="left">{card.set}&emsp;{card.language.toUpperCase()}&emsp;{card.signed ? "Signed" : ""}{card.foil ? " Foil" : ""}{card.alter ? " Alter" : ""}</div>
                        <div class="right"></div>
                    </div>
                    {cardDetails ? <img className="hidden" onLoad={this.imageLoaded} src={cardDetails.images[0]} alt={cardDetails.printedName} /> : null}
                </div>
            </div>
        )
    }
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);