import React from "react";
import ReactDOM from "react-dom";

const host = "http://tap.ahri.moe";

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            deck: null
        }
        
        this.deckLoaded = this.deckLoaded.bind(this);
    }

    deckLoaded(deck) {
        this.setState({ deck: deck });
    }

    render() {
        return (
            <div className="container">
                <DeckLoader deckHandler={this.deckLoaded} />
                <DeckView deck={this.state.deck} />
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
            error: null,
            inProgress: false,
            searchString: e.target.value
        });
    }

    loadDeck(e) {
        var slug = this.state.searchString.trim();
        this.setState({
            error: null,
            inProgress: true,
            searchString: slug
        });
        fetch(`${host}/api/deck/${slug}`)
            .then(res => res.json())
            .then(deck => {
                this.setState({
                    error: null,
                    inProgress: false,
                    searchString: slug
                });
                this.props.deckHandler(deck);
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
        return (
            <form id="searchForm" onSubmit={this.loadDeck}>
                <input type="text" autocomplete="off" value={this.state.value} onChange={this.searchUpdated} /> <input type="submit" value="Load deck" disabled={this.state.inProgress} />
            </form>
        )
    }
}

class DeckView extends React.Component {
    render() {
        if (this.props.deck !== null) {
            return (
                <div className="deck-area">
                    <div className="header">
                        <h2>{this.props.deck.name}</h2>
                        <div>{this.props.deck.description}</div>
                        <ul></ul>
                    </div>
                    <div id="defaultView" className="view card-area"></div>
                </div>
            )
        }
        else return null;
    }
}

class Card extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            card: null
        }
    }

    render() {
        return (
            <div className="card">
                <div class="frame">
                    <div class="card-title"></div>
                    <div class="card-info">
                        <div class="left"></div>
                        <div class="right"></div>
                    </div>
                </div>
            </div>
        )
    }
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);