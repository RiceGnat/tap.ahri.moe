import React from "react";
import Card from "./Card";

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
                    // Automatically switch to card type view
                    this.changeView("types");
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

    sortCards(deck, cards, view, sorted) {
        const types = ["creature", "sorcery", "instant", "artifact", "enchantment", "planeswalker", "land", "other"];

        // First time sort
        if (!sorted.boardsSorted) {
            sorted.showBoards = false;
            sorted["main"] = {};
        }
        
        // Assume if this function is called, we need to initialize view
        sorted["main"][view] = view === "default" ? [] : {};
        cards.forEach(card => {
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
                            if (type === "other" || (card.details && card.details.types.includes(type))) {
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
                    matching = remaining.filter(card => card.details.id === id);
                    remaining = remaining.filter(card => card.details.id !== id);
                }
                for (var i = 0; i < matching.length; i += 4)
                    cards.push(this.stackCards(matching, i, n));
                n += matching.length;
            }
            return cards;
        }
    }

    renderCards() {
        const deck = this.props.deck;
        const cards = this.state.cards;
        const cardsSorted = this.state.cardsSorted;
        const visible = this.state.cardsVisible;
        const view = this.state.view;
        const boards = ["side", "maybe", "acquire"];
        const boardLabels = ["Sideboard", "Maybe", "Acquire"];

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
                                <h4>{typeLabels[i]}<span className="count">{cards.filter((card) => card.board === "main" && (type === "other" ? !card.details : (card.details && card.details.types.includes(type)))).length}</span></h4>
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
                            <a href="javascript:void(0)" onClick={() => this.props.onViewChanged("default")}>Default</a>
                        </li>
                        <li>
                            <a href="javascript:void(0)" onClick={() => this.props.onViewChanged("types")}>Type</a>
                        </li>
                    </ul>
                </div>}
            </div>
        );
    }
}