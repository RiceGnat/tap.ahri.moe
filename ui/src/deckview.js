import React from "react";
import Card from "./card";

export default class DeckView extends React.Component {
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
                </div>
                : null}
                {deck && this.state.cards ? this.renderCards() : null}
            </div>
        )
    }
}