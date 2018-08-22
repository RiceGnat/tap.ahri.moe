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
                // Set deck to null first to force card cleanup
                this.setState({
                    deck: null
                });
                // Load buffered deck if ready
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
                deckVisible: deck ? true : false
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
            view: "default",
            cardsSorted: {}
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
        // If deck has changed, reset cards
        if (prevProps.deck !== deck) {
            this.setState({
                cards: null,
                loaded: false,
                loadedCards: 0,
                view: "default",
                cardsSorted: {}
            });
        }
        // Deck is loaded
        else if (deck) {
            // If cards have not been loaded yet
            if (!this.state.cards) {
                var cards = [];
                deck.list.forEach((card) => {
                    for (var i = 0; i < card.quantity; i++) {
                        cards.push(card);
                    }
                });
                this.setState({
                    cards: cards
                });
                console.log("cards initialized");
            }
            else {
                if (!this.state.cardsSorted.boardsSorted || !this.state.cardsSorted["main"][this.state.view]) {
                    console.log(`sorting cards for ${this.state.view} view`);
                    this.sortCards();
                }

                if (!this.state.loaded && this.state.loadedCards === deck.list.length) {
                    console.log("cards loaded");
                    console.log(deck);
                    this.setState({
                        loaded: true,
                        view: "types"
                    })
                }
            }
        }
    }

    sortCards() {
        const deck = this.props.deck;
        const view = this.state.view;
        var sorted = this.state.cardsSorted;
        const types = ["creature", "sorcery", "instant", "artifact", "enchantment", "planeswalker", "land", "other"];

        if (!sorted.boardsSorted) {
            sorted.showBoards = false;
            sorted["main"] = {};
        }
        
        sorted["main"][view] = view === "default" ? [] : {};
        this.state.cards.forEach(card => {
            if (card.board === "main") {
                if (!sorted.boardsSorted && deck.commander && deck.commander.includes(card.name)) {
                    if (!sorted[card.board]["commander"]) 
                        sorted[card.board]["commander"] = [];
                    sorted[card.board]["commander"].push(card);
                    return;
                }
                switch (view) {
                    case "default":
                        sorted[card.board][view].push(card);
                        break;
                    case "types":
                        types.some((type) => {
                            if (card.details.types.includes(type) || type === "other") {
                                if (!sorted[card.board][view][type])
                                    sorted[card.board][view][type] = [];
    
                                sorted[card.board][view][type].push(card);
                                return true;
                            }
                            else return false;
                        });
                        break;
                }
            }
            else if (!sorted.boardsSorted) {
                if (!sorted[card.board]) {
                    sorted[card.board] = [];
                }
                sorted[card.board].push(card);
                sorted.showBoards = true;
            }
        });
        sorted.boardsSorted = true;

        this.setState({
            cardsSorted: sorted
        });
    }

    renderCards() {
        const cards = this.state.cards;
        const cardsSorted = this.state.cardsSorted;
        const view = this.state.view;
        const boards = ["side", "maybe", "acquire"];
        const boardLabels = ["Sideboard", "Maybe", "Acquire"];

        if (!cardsSorted.boardsSorted) {
            return (
                <div className="view card-area">
                    {cards.map((card) => 
                    <Card card={card} onCardLoaded={this.cardLoaded} />)}
                </div>
            );
        }
        else if (cardsSorted["main"][view]) {
            var sections = [];
            if (cardsSorted["main"]["commander"]) {
                sections.push(
                    <div className="commander section">
                        <h4>Commander<span className="count">{cardsSorted["main"]["commander"].length}</span></h4>
                        <div className="card-area">
                            {cardsSorted["main"]["commander"].map((card) => 
                            <Card card={card} onCardLoaded={this.cardLoaded} />)}
                        </div>
                    </div>
                )
            }

            var main;
            switch (view) {
                case "default":
                    main =
                        <div className="card-area">
                            {cardsSorted["main"][view].map((card) => 
                            <Card card={card} onCardLoaded={this.cardLoaded} />)}
                        </div>
                    break;
                case "types":
                    const types = ["creature", "sorcery", "instant", "artifact", "enchantment", "planeswalker", "land", "other"]
                    const typeLabels = ["Creatures", "Sorceries", "Instants", "Artifacts", "Enchantments", "Planeswalkers", "Lands", "Other"]

                    main = types.map((type, i) => {
                        if (cardsSorted["main"][view][type]) return ( 
                            <div className={type + " section"}>
                                <h4>{typeLabels[i]}<span className="count">{cards.filter((card) => card.board === "main" && card.details.types.includes(type)).length}</span></h4>
                                <div className="card-area">
                                    {cardsSorted["main"][view][type].map((card) => 
                                    <Card card={card} onCardLoaded={this.cardLoaded} />)}
                                </div>
                            </div>
                        );
                    });
                    break;
            }
            console.log(cardsSorted);
            sections.push(
                <div className="main section">
                    {cardsSorted.showBoards ?
                    <h3>Main<span className="count">{Object.values(cardsSorted["main"][view]).reduce((sum, type) => sum + type.length, 0)}</span></h3>
                    : null}
                    {main}
                </div>
            );
            if (cardsSorted.showBoards) {
                boards.map((board, i) => {
                    if (cardsSorted[board])
                        sections.push(
                            <div className={board + " section"}>
                                <h3>{boardLabels[i]}<span className="count">{cardsSorted[board].length}</span></h3>
                                <div className="card-area">
                                    {cardsSorted[board].map((card) => 
                                    <Card card={card} onCardLoaded={this.cardLoaded} />)}
                                </div>
                            </div>
                        );
                });
            }
            return (
                <div className={"sorted view" + (this.props.deck.commander ? " commander" : "")}>
                    {sections}
                </div>
            );
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
                {deck && this.state.cards ? this.renderCards() : null}
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
        const card = this.props.card;

        // Small bit of cheating by changing prop so we don't fetch for copies
        if (!card.hasOwnProperty("details")) {
            console.log(fetch);
            fetch(`${host}/api/card?name=${encodeURIComponent(card.name)}&set=${card.set}&lang=${card.language}`)
            .then(res => res.json())
            .then(result => {
                card.details = result;

                // Should probably update prop with handler, but is extra pointless code
                this.props.onCardLoaded();
            });
            card.details = null;
        }
        else {

        }
    }

    render() {
        const card = this.props.card;
        const details = this.props.card.details;

        var cardClasses = ["card", card.board];
        if (details) cardClasses.push(details.types.join(" "));

        var imgClasses = [];
        if (details && details.imageBorderCropped) imgClasses.push("border-crop");
        if (!this.state.imgLoaded) imgClasses.push("hidden");

        return (
            <div className={cardClasses.join(" ")}>
                <div class={"frame" + (details && (details.border === "borderless" || details.border === "silver") ? " borderless" : "")}>
                    <div class="card-title">{card.name}</div>
                    <div class="card-info">
                        <div class="left">{card.set && details ? details.set : card.set}&emsp;{card.language.toUpperCase()}&emsp;{card.signed ? "Signed" : ""}{card.foil ? " Foil" : ""}{card.alter ? " Alter" : ""}</div>
                        <div class="right"></div>
                    </div>
                    {details ? <img className={imgClasses.join(" ")} onLoad={this.imageLoaded} src={details.images[0]} alt={details.printedName} /> : null}
                    {details && card.foil ? <div class='foil layer'></div> : null}
                </div>
            </div>
        )
    }
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);