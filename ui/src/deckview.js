import React from "react";
import Card from "./Card";

export default class DeckView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            cards: null,
            loadedCards: 0,
            loaded: false,
            view: "default",
            cardsSorted: {},
            cardsVisible: true,
            status: null
        }

        this.cardLoaded = this.cardLoaded.bind(this);
    }

    cardLoaded() {
        this.setState((prevState) => ({
            loadedCards: prevState.loadedCards + 1,
            status: `Loading cards... ${((prevState.loadedCards + 1)/this.props.deck.list.length*100).toFixed()}%`
        }));
    }

    componentDidMount() {
        this.setState({});
    }

    componentDidUpdate(prevProps, prevState) {
        const deck = this.props.deck;
        // If deck has changed, reset cards
        if (prevProps.deck !== deck) {
            this.setState({
                cards: null,
                loaded: false,
                loadedCards: 0,
                view: "default",
                cardsSorted: {},
                status: "Loading..."
            });
        }

        if (prevState.view !== this.state.view) {
            this.setState({
                cardsVisible: true
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
            }
            else {
                // If the current view has not been sorted yet
                if (!this.state.cardsSorted.boardsSorted || !this.state.cardsSorted["main"][this.state.view]) {
                    this.sortCards();
                }

                // All cards have been loaded
                if (!this.state.loaded && this.state.loadedCards === deck.list.length) {
                    this.setState({
                        loaded: true,
                        cardsVisible: false
                    });
                    setTimeout(() => {
                        this.setState({
                            view: "types",
                            status: null
                        });
                    }, 500);
                }
            }
        }
    }

    sortCards() {
        const deck = this.props.deck;
        const view = this.state.view;
        var sorted = this.state.cardsSorted;
        const types = ["creature", "sorcery", "instant", "artifact", "enchantment", "planeswalker", "land", "other"];

        // First time sort
        if (!sorted.boardsSorted) {
            sorted.showBoards = false;
            sorted["main"] = {};
        }
        
        // Assume if this function is called, we need to initialize view
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

    stackCards(cards, i, key) {
        if (i === cards.length - 1) {
            return <Card key={key} card={cards[i]} onCardLoaded={this.cardLoaded} />
        }
        else {
            return <Card key={key} card={cards[i]} childCard={this.stackCards(cards, i + 1, key + 1)} onCardLoaded={this.cardLoaded} />
        }
    }

    mapCards(array, stack) {
        if (!stack) {
            return array.map((card, i) => 
            <Card key={i} card={card} onCardLoaded={this.cardLoaded} />)
        }
        else {
            var remaining = array.slice();
            var cards = [];
            var n = 0;
            while (remaining.length > 0) {
                var id = remaining[0].details.id;
                var matching = remaining.filter((card) => card.details.id === id);
                cards.push(this.stackCards(matching, 0, n));
                n += matching.length;
                remaining = remaining.filter((card) => card.details.id !== id);
            }
            return cards;
        }
    }

    renderCards() {
        const cards = this.state.cards;
        const cardsSorted = this.state.cardsSorted;
        const visible = this.state.cardsVisible;
        const view = this.state.view;
        const boards = ["side", "maybe", "acquire"];
        const boardLabels = ["Sideboard", "Maybe", "Acquire"];

        if (!cardsSorted.boardsSorted) {
            return (
                <div className={"view card-area" + (!visible ? " hidden" : "")}>
                    {this.mapCards(cards)}
                </div>
            );
        }
        else if (cardsSorted["main"][view]) {
            var sections = [];
            if (cardsSorted["main"]["commander"]) {
                sections.push(
                    <div key="commander" className="commander section">
                        <h4>Commander<span className="count">{cardsSorted["main"]["commander"].length}</span></h4>
                        <div className="card-area">
                            {this.mapCards(cardsSorted["main"]["commander"])}
                        </div>
                    </div>
                )
            }

            var main;
            switch (view) {
                case "default":
                    main =
                        <div className="card-area">
                            {this.mapCards(cardsSorted["main"][view])}
                        </div>
                    break;
                case "types":
                    const types = ["creature", "sorcery", "instant", "artifact", "enchantment", "planeswalker", "land", "other"]
                    const typeLabels = ["Creatures", "Sorceries", "Instants", "Artifacts", "Enchantments", "Planeswalkers", "Lands", "Other"]

                    main = types.map((type, i) => {
                        if (cardsSorted["main"][view][type]) return ( 
                            <div key={type} className={type + " section"}>
                                <h4>{typeLabels[i]}<span className="count">{cards.filter((card) => card.board === "main" && card.details.types.includes(type)).length}</span></h4>
                                <div className="card-area">
                                    {this.mapCards(cardsSorted["main"][view][type], true)}
                                </div>
                            </div>
                        );
                    });
                    break;
            }
            sections.push(
                <div key="main" className="main section">
                    {cardsSorted.showBoards ?
                    <h3>Main<span className="count">{view === "default" ? cardsSorted["main"][view].length : Object.values(cardsSorted["main"][view]).reduce((sum, type) => sum + type.length, 0)}</span></h3>
                    : null}
                    {main}
                </div>
            );
            if (cardsSorted.showBoards) {
                boards.map((board, i) => {
                    if (cardsSorted[board])
                        sections.push(
                            <div key="board" className={board + " section"}>
                                <h3>{boardLabels[i]}<span className="count">{cardsSorted[board].length}</span></h3>
                                <div className="card-area">
                                    {this.mapCards(cardsSorted[board], view !== "default")}
                                </div>
                            </div>
                        );
                });
            }
            return (
                <div className={"view" + (this.props.deck.commander ? " commander" : "") + (!visible ? " hidden" : "") + (view !== "default" ? " sorted" : "")}>
                    {sections}
                </div>
            );
        }
    }

    render() {
        console.log("render");
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
                    <div className={"status" + (!this.state.cardsVisible ? " hidden" : "")}>
                        {this.state.status ? 
                        <span className="loading">{this.state.status}</span> :
                        <div id="sortModes">
                            Card sort
                            <ul>
                                <li>
                                    <a href="javascript:void(0)">Default</a>
                                </li>
                                <li>
                                    <a href="javascript:void(0)">Type</a>
                                </li>
                            </ul>
                        </div>}
                    </div>
                </div>
                : null}
                {deck && this.state.cards ? this.renderCards() : null}
            </div>
        )
    }
}