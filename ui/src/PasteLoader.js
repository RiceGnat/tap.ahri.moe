import React from "react";

export default class PasteLoader extends React.Component {
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

    parseDecklist(decklist) {
        //this.props.onDeckLoaded(null);
        var regex = /^(\d{1,3})x? (.+)$/gm;
        var m = regex.exec(decklist);
        var sideboardIndex = decklist.toLowerCase().indexOf("sideboard");
        var cards = [];
        var count = 0;
        var i = 0;
        while (m != null) {
            var quantity = parseInt(m[1]);
            var name = m[2].trim();
            cards[i] = {
                name: name,
                board: m.index > sideboardIndex ? "side" : "main",
                quantity: quantity,
                set: "",
                foil: false,
                alter: false,
                signed: false,
                language: "en"
            }
            count += quantity;
            i++;
            m = regex.exec(decklist)
        }
        this.props.onDeckLoaded({
            name: "Deck paste",
            count: count,
            list: cards
        });
    }

    formSubmitted(e) {
        var decklist = this.state.searchString.trim();
        if (decklist !== "") {
            this.parseDecklist(decklist)
        }
        e.preventDefault();
    }

    render() {
        const error = this.state.error ? <div className="error">{this.state.error}</div> : null;
        return (
            <div>
                <form id="pasteForm" onSubmit={this.formSubmitted}>
                    <textarea id="deckPaste" autoComplete="off" rows="2" value={this.state.searchString} onChange={this.searchUpdated}></textarea> <input type="submit" id="loadPaste" value="Load deck paste" />
                </form>
                {error}
            </div>
        )
    }
}