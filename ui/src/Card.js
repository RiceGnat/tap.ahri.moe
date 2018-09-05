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

    getCard() {
        return this.props.card.ghost ? this.props.card.source : this.props.card;
    }

    componentDidMount() {
        const card = this.getCard();

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
            .then(() => this.props.onCardLoaded(card.deckId));
            card.details = null;
        }
    }

    render() {
        const card = this.getCard();
        const details = card.details;
        const isGhost = this.props.card.ghost;

        var cardClasses = ["card", card.board];
        if (details) cardClasses.push(details.types.join(" "));
        if (isGhost) cardClasses.push("ghost");

        var imgClasses = [];
        if (details && details.images[0].borderCrop) imgClasses.push("border-crop");
        //if (!this.state.imgLoaded) imgClasses.push("hidden");

        var frameClasses = ["frame"];
        if (details && (
            details.images[0].border === "silver" && details.images[0].frame >= 2015 ||
            details.images[0].set === "unh" && details.types.includes("basic")
            ))
            frameClasses.push("borderless");
        if (details && details.border !== "black")
            frameClasses.push(details.border);
        if (this.state.imgLoaded) frameClasses.push("loaded");

        var infoLeft = [];
        if (card.set) infoLeft.push(details ? details.set : card.set);
        infoLeft.push(card.language);

        var infoRight = [];
        if (card.signed) infoRight.push("signed");
        if (card.foil) infoRight.push("foil");
        if (card.alter) infoRight.push("alter");

        return (
            <div className={cardClasses.join(" ")} title={isGhost ? "This card is already in a different section" : ""}>
                <div className={frameClasses.join(" ")}>
                    <div className="border">
                        {details ? <img className={imgClasses.join(" ")} onLoad={this.imageLoaded} src={details.images[0].url} alt={details.printedName} /> : null}
                    </div>
                    <div className="card-title">{details ? card.details.name : card.name}</div>
                    <div className="card-info">
                        <div className="left">{infoLeft.join("\u2003")}</div>
                        <div className="right">{infoRight.join("\u2003")}</div>
                    </div>
                    {details && card.foil ? <div className='foil layer'></div> : null}
                    {details && card.alter ? <div className='alter'>&#x1f58c;</div> : null}
                    {details && card.signed ? <div className='signed'>&#x1f58a;</div> : null}
                </div>
                {this.props.childCard}
            </div>
        )
    }
}