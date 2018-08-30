import React from "react";
import ReactDOM from "react-dom";
import DeckLoader from "./DeckLoader";
import PasteLoader from "./PasteLoader";
import DeckView from "./DeckView";

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
            <div>
                <div className="dark">
                    <div className="container">
                        <div id="controlBar">
                            <DeckLoader onDeckLoaded={this.deckLoaded} />
                            <PasteLoader onDeckLoaded={this.deckLoaded} />
                        </div>
                    </div>
                </div>
                <div className="container">
                    <DeckView visible={this.state.deckVisible} deck={this.state.deck} />
                </div>
            </div>
        )
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('app')
  );