import React, { Fragment, useState } from 'react';
import { getPrintedLanguageCode, safeJoin, getCardName } from './utils';

export default ({card, options, simple}) => {
	const [flipped, setFlipped] = useState(false);
	const isTransform = () => card && ["transform", "modal_dfc"].includes(card.layout);
	const getCardFace = (face = 0) => isTransform() ? card.card_faces[face] : card;

	const faces = [];
	if (card) {
		faces.push(getCardFace());
		if (isTransform()) faces.push(getCardFace(1));
	}

	const imageOverrides = [options.image, options.imageBack];
	const imageBorders = [options.imageBorder, options.imageBackBorder];

	return <div className={safeJoin(' ', 'card', options.ghost && 'ghost', flipped && 'flipped')}
		onClick={isTransform() ? e => setFlipped(!flipped) : undefined}>
		{faces.map((face, i) => <div key={i} className="frame container">
			<img src={imageOverrides[i] || face.image_uris['normal']}
				alt={card.name} style={{ border: `${imageBorders[i] ? `${imageBorders[i] / 16}em` : '0'} solid black` }} />
			{options.foil && <div className="foil"></div>}
			{!simple &&
				<Fragment>
					<div className="name">
						{getCardName(face)}
						{card.lang !== 'en' &&
							<div className="tip">{card.name}</div>
						}
					</div>
					{options.ghost &&
						<div className="duplicate tip">This card is already in a different group</div>
					}
					<div className="info flex">
						<div>
							{[card.set, getPrintedLanguageCode(options.lang), card.collector_number].join(' · ')}
						</div>
						<div className="options">
							{['foil', 'signed', 'alter'].filter(n => options[n]).join(' ')}
						</div>
					</div>
				</Fragment>
			}
		</div>)}
	</div>;
}