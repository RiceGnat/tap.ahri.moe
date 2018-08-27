import React from "react";
const config = require("./config");

export default class Card extends React.Component {
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
            fetch(`${config.host}/api/card?name=${encodeURIComponent(card.name)}&set=${card.set}&lang=${card.language}`)
            .then(res => {
                if (!res.ok) throw Error(res.body);
                return res;
            })
            .then(res => res.json())
            .then(result => {
                // Should probably update prop with a handler instead, but it's extra roundabout code
                card.details = result;
                // TODO: defer image search to allow sorting earlier
            },
            error => {
                card.error = error;
            })
            .then(() => this.props.onCardLoaded());
            card.details = null;
        }
    }

    render() {
        const card = this.props.card;
        const details = this.props.card.details;

        var cardClasses = ["card", card.board];
        if (details) cardClasses.push(details.types.join(" "));

        var imgClasses = [];
        if (details && details.images[0].borderCrop) imgClasses.push("border-crop");
        if (!this.state.imgLoaded) imgClasses.push("hidden");

        return (
            <div className={cardClasses.join(" ")}>
                <div className={"frame" + (this.state.imgLoaded ? " loaded" : "") + (details && (details.border === "borderless" || details.border === "silver") ? " borderless" : "")}>
                    <div className="card-title">{details ? card.details.name : card.name}</div>
                    <div className="card-info">
                        <div className="left">{card.set && details ? details.set : card.set}&emsp;{card.language.toUpperCase()}&emsp;{card.signed ? "Signed" : ""}{card.foil ? " Foil" : ""}{card.alter ? " Alter" : ""}</div>
                        <div className="right"></div>
                    </div>
                    {details ? <img className={imgClasses.join(" ")} onLoad={this.imageLoaded} src={details.images[0].url} alt={details.printedName} /> : null}
                    {details && card.foil ? <div className='foil layer'></div> : null}
                </div>
                {this.props.childCard}
            </div>
        )
    }
}