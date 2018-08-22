import React from "react";
const config = require("./config");

export default class DeckLoader extends React.Component {
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
        fetch(`${config.host}/api/deck/${slug}`)
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
                    <input type="text" autoComplete="off" value={this.state.value} onChange={this.searchUpdated} /> <input type="submit" value="Load deck" disabled={this.state.inProgress} />
                </form>
                {error}
            </div>
        )
    }
}