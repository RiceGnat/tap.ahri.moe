import React from "react";
import Card from "./Card";

const stable = require("stable");

const boards = ["side", "maybe", "acquire"];
const boardLabels = ["Sideboard", "Maybe", "Acquire"];
const types = ["creature", "sorcery", "instant", "artifact", "enchantment", "planeswalker", "land", "other"];
const typeLabels = ["Creatures", "Sorceries", "Instants", "Artifacts", "Enchantments", "Planeswalkers", "Lands", "Other"];
const colors = ["w", "u", "b", "r", "g", "multi", "none"];
const colorLabels = ["White", "Blue", "Black", "Red", "Green", "Multicolor", "Colorless"];

export default class DeckView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        }

        this.cardLoaded = this.cardLoaded.bind(this);
        this.changeView = this.changeView.bind(this);
    }

    cardLoaded(deckId) {
        // Check make sure the load event is from the current deck
        if (this.state.deckId === deckId)
            this.setState((prevState) => ({
                loadedCards: prevState.loadedCards + 1,
                status: `Loading cards... ${((prevState.loadedCards + 1)/this.props.deck.list.length*100).toFixed()}%`
            }));
    }

    componentDidUpdate(prevProps) {
        const deck = this.props.deck;

        // If deck has changed, reset state
        if (prevProps.deck !== deck) {
            var cards = null;
            var sorted = {};
            var deckId = null;

            // If deck is given, perform initial cards setup
            if (deck) {
                deckId = new Date().getTime();
                cards = [];
                deck.list.forEach((card) => {
                    card.deckId = deckId;
                    for (var i = 0; i < card.quantity; i++) {
                        cards.push(card);
                    }
                });

                this.sortCards(deck, cards, "default", sorted);
            }

            // Initialize state
            this.setState({
                deckId: deckId,
                cards: cards,
                cardsVisible: true,
                loaded: false,
                loadedCards: 0,
                view: "default",
                cardsSorted: sorted,
                status: "Loading..."
            });
            return;
        }

        // Deck is ready to work with
        if (deck) {
            // All cards have been loaded
            if (!this.state.loaded && this.state.loadedCards === deck.list.length) {
                this.setState({
                    loaded: true,
                    status: null
                }, () => {
                    // Automatically switch to view if specified via anchor
                    const view = window.location.hash;
                    if (view !== "") this.changeView(view.substring(1));
                });
            }
        }
    }

    changeView(view) {
        if (!this.state.cardsSorted["main"][view]) {
            this.sortCards(this.props.deck, this.state.cards, view, this.state.cardsSorted);
        }

        this.setState({
            cardsVisible: false
        });
        setTimeout(() => {
            this.setState({
                view: view
            },
            () => {
                this.setState({
                    cardsVisible: true
                });
            });
        }, 500);
    }

    typeSort(types, cardTypes, card, view, sorted) {
        types.some((type) => {
            if (type === "other" || (cardTypes.includes(type))) {
                if (!sorted["main"][view][type])
                    sorted["main"][view][type] = [];

                sorted["main"][view][type].push(card);
                return true;
            }
            else return false;
        });
    }

    sortCards(deck, cards, view, sorted) {
        // Presort cards by name
        var presort = cards.slice();
        if (view !== "default") presort.sort((a, b) => a.name.toUpperCase() <= b.name.toUpperCase() ? -1 : 1);

        // CMC sort
        if (view === "cmc") presort = stable(presort, (a, b) => {
            if (!a.details)
                return !b.details ? 0 : 1;
            else if (!b.details)
                return -1;

            if (a.details.types.includes("land"))
                return !b.details.types.includes("land") ? 1 : 0;
            else if (b.details.types.includes("land"))
                return -1;
            else
                return a.details.cmc - b.details.cmc;
        });

        var main = cards;

        // If this is the initial sort, separate non-maindeck
        if (!sorted.boardsSorted) {
            sorted.showBoards = false;
            sorted["main"] = {};

            // Separate commander
            if (deck.commander) {
                sorted["commander"] = cards.filter(card => deck.commander.includes(card.name));
                main = main.filter(card => !deck.commander.includes(card.name));
            }

            // Get boards
            boards.forEach(board => {
                sorted[card.board] = {
                    cards: main.filter(card => card.board === board)
                }
                if (sorted[card.board].cards.length > 0) sorted.showBoards = true;
            });

            sorted.boardsSorted = true;
        }

        // The maindeck
        main = main.filter(card => card.board === "main");
        
        // Initialize view
        sorted["main"][view] = {
            all: []
        };
        
        

        // Find all subtypes in deck if applicable
        if (view === "subtypes") {
            sorted["main"][view]["all"] = deck.list.map(card => card.details ? card.details.subtypes : [])
            .reduce((all, current) =>
                all.concat(current.filter(subtype => !all.includes(subtype)))
            , []);
            sorted["main"][view]["all"].sort().push("other");
        }

        presort.forEach(card => {
            if (card.board === "main") {
                if (deck.commander && deck.commander.includes(card.name)) {
                    if (!sorted.boardsSorted) {
                        if (!sorted[card.board]["commander"]) 
                            sorted[card.board]["commander"] = [];
                        sorted[card.board]["commander"].push(card);
                    }
                    return;
                }
                switch (view) {
                    case "types":
                        //this.typeSort(types, card.details ? card.details.types : [], card, view, sorted);
                        types.some((type) => {
                            if (type === "other" || (cardTypes.includes(type))) {
                                if (!sorted["main"][view][type])
                                    sorted["main"][view][type] = [];
                
                                sorted["main"][view][type].push(card);
                                return true;
                            }
                            else return false;
                        });
                        break;
                    case "subtypes":
                        this.typeSort(sorted[card.board][view]["all"], card.details ? card.details.subtypes : [], card, view, sorted);
                        break;
                    default:
                        sorted[card.board][view]["all"].push(card);
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
    }

    stackCards(cards, i, key, depth) {
        if (!depth) depth = 1;

        if (i === cards.length - 1 || depth == 4) {
            return <Card key={key + i} card={cards[i]} onCardLoaded={this.cardLoaded} />
        }
        else {
            return <Card key={key + i} card={cards[i]} childCard={this.stackCards(cards, i + 1, key, depth + 1)} onCardLoaded={this.cardLoaded} />
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
                const currentCard = remaining[0];
                var matching;
                if (!currentCard.details) {
                    matching = remaining.filter(card => card.name === currentCard.name);
                    remaining = remaining.filter(card => card.name !== currentCard.name);
                }
                else {
                    var id = currentCard.details.id;
                    matching = remaining.filter(card => card.details && card.details.id === id);
                    remaining = remaining.filter(card => !matching.includes(card));
                }
                for (var i = 0; i < matching.length; i += 4)
                    cards.push(this.stackCards(matching, i, n));
                n += matching.length;
            }
            return cards;
        }
    }

    renderCardCategories(types, typeLabels, view, cards, cardsSorted) {
        return types.map((type, i) => {
            if (cardsSorted["main"][view][type] && cardsSorted["main"][view][type].length > 0) return ( 
                <div key={type} className={type + " section"}>
                    <h4>{typeLabels[i]}<span className="count">{
                        type === "other" ? cardsSorted["main"][view]["other"].length : 
                        cards.filter((card) =>
                            card.board === "main" && card.details &&
                            (view === "types" ? card.details.types :
                            (view === "subtypes" ? card.details.subtypes : []))
                            .includes(type)).length
                    }</span></h4>
                    <div className="card-area">
                        {this.mapCards(cardsSorted["main"][view][type], true)}
                    </div>
                </div>
            );
        });
    }

    renderCards() {
        const deck = this.props.deck;
        const cards = this.state.cards;
        const cardsSorted = this.state.cardsSorted;
        const visible = this.state.cardsVisible;
        const view = this.state.view;

        if (!cardsSorted.boardsSorted) {
            return (
                <div className={"view fade card-area" + (!visible ? " hidden" : "")}>
                    {this.mapCards(cards)}
                </div>
            );
        }
        else if (cardsSorted["main"][view]) {
            var sections = [];
            if (cardsSorted["main"]["commander"]) {
                sections.push(
                    <div key="commander" className="commander section">
                        <h3>Commander</h3>
                        <div className="card-area">
                            {this.mapCards(cardsSorted["main"]["commander"])}
                        </div>
                    </div>
                )
            }

            var main;
            switch (view) {
                case "types":
                    main = this.renderCardCategories(types, typeLabels, view, cards, cardsSorted);
                    break;
                case "subtypes":
                    main = this.renderCardCategories(cardsSorted["main"][view]["all"],
                        cardsSorted["main"][view]["all"].map(subtype =>
                            subtype === "other" ? "None" :
                            subtype.split(" ").map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')),
                        view, cards, cardsSorted);
                    break;
                default:
                    main =
                        <div className="card-area">
                            {this.mapCards(cardsSorted["main"][view]["all"], view !== "default")}
                        </div>
            }

            sections.push(
                <div key="main" className="main section">
                    {cardsSorted.showBoards ?
                    <h3>Main<span className="count">{Object.values(cardsSorted["main"][view]).reduce((sum, type) => sum + type.length, 0)}</span></h3>
                    : null}
                    {main}
                </div>
            );

            if (cardsSorted.showBoards) {
                boards.forEach((board, i) => {
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
                <div className={"view fade" + (deck.commander ? " commander" : "") + (!visible ? " hidden" : "") + (view !== "default" ? " sorted" : "")}>
                    {sections}
                </div>
            );
        }
    }

    render() {
        const deck = this.props.deck;
        const deckReady = this.props.deck && this.state.deckId;
        return (
            <div className={"deck-area fade" + (!this.props.visible ? " hidden" : "")}>
                {deckReady ?
                <div className="header">
                    <h2 id="deckTitle">{deck.url ? <a href={deck.url} target="_blank">{deck.name}</a> : deck.name}</h2>
                    <ul id="deckInfo">
                        {deck.author ? <li><b>Creator</b>&ensp;<a href={deck.userpage} target="_blank">{deck.author}</a></li> : null}
                        {deck.format ? <li><b>Format</b>&ensp;{deck.format}</li> : null}
                        {deck.count ? <li><b>Cards</b>&ensp;{deck.count}</li> : null}
                        {deck.description ? <li style={{display: "block"}}><b>Description</b><br />{deck.description}</li> : null}
                    </ul>
                    <DeckViewControls status={this.state.status} onViewChanged={this.changeView} />
                </div>
                : null}
                {deckReady && this.state.cards ? this.renderCards() : null}
            </div>
        )
    }
}

class DeckViewControls extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            visible: true,
            status: this.props.status
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.status !== this.props.status) {
            if (this.props.status === null || prevProps.status === null) {
                this.setState({
                    visible: false
                });
                setTimeout(() => {
                    this.setState({
                        status: this.props.status
                    },
                    () => {
                        this.setState({
                            visible: true
                        });
                    });
                }, 500);
            }
            else this.setState({
                status: this.props.status
            });
        }
    }

    render() {
        return (
            <div className={"controls fade" + (!this.state.visible ? " hidden" : "")}>
                {this.state.status !== null ? 
                <span className="loading">{this.state.status}</span> :
                <div id="sortModes">
                    Card sort
                    <ul>
                        <li>
                            <a href="javascript:void(0)" onClick={() => this.props.onViewChanged("name")}>Name</a>
                        </li>
                        <li>
                            <a href="javascript:void(0)" onClick={() => this.props.onViewChanged("cmc")}>Mana</a>
                        </li>
                        <li>
                            <a href="javascript:void(0)" onClick={() => this.props.onViewChanged("types")}>Types</a>
                        </li>
                        <li>
                            <a href="javascript:void(0)" onClick={() => this.props.onViewChanged("subtypes")}>Subtypes</a>
                        </li>
                        <li>
                            <a href="javascript:void(0)" onClick={() => this.props.onViewChanged("default")}>Unsorted</a>
                        </li>
                    </ul>
                </div>}
            </div>
        );
    }
}