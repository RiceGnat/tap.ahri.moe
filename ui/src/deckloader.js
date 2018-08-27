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

        this.formSubmitted = this.formSubmitted.bind(this);
        this.searchUpdated = this.searchUpdated.bind(this);
    }

    searchUpdated(e) {
        this.setState({
            inProgress: this.state.inProgress,
            searchString: e.target.value
        });
    }

    componentDidMount() {
        if (window.location.pathname !== "/") {
            var slug = window.location.pathname.replace(/\/$/, "").replace(/^\//, "");
            this.setState({
                searchString: slug
            });
            this.fetchDeck(slug);
        }
    }

    fetchDeck(slug) {
        //this.props.onDeckLoaded(null);
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
    }

    formSubmitted(e) {
        var slug = this.state.searchString.trim();
        if (slug !== "") {
            this.fetchDeck(slug);
        }
        e.preventDefault();
    }

    render() {
        const error = this.state.error ? <div className="error">{this.state.error}</div> : null;
        return (
            <div>
                <form id="searchForm" onSubmit={this.formSubmitted}>
                    <input id="deckSearch" type="text" autoComplete="off" value={this.state.searchString} onChange={this.searchUpdated} /> <input type="submit" value="Load deck" disabled={this.state.inProgress} />
                    <div className="loading tip" style={!this.state.inProgress ? {display: "none"} : null}>Fetching deck...</div>
                    {error}
                </form>
            </div>
        )
    }
}