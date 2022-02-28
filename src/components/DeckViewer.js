import React, { useState } from 'react';
import Card from './Card';
import Stackable from './Stackable';
import { countCards } from './utils';
import { boards, colors, types } from '../static/constants.json';

export default ({ deck, config}) => {
	const [sortType, setSortType] = useState('name');
	const [groupType, setGroupType] = useState('type');

	const commander = [];

	const sorted = [...deck.cards]
		.sort((() => {
			switch (sortType) {
				case 'name': return (a, b) => a.data.name.toLowerCase().localeCompare(b.data.name.toLowerCase());
				case 'cmc': return (a, b) => a.data.cmc - b.data.cmc;
				default: return (a, b) => a - b;
			}
		})())
		.map(card => {
			if (card.commander) commander.push(card);

			if (groupType === 'type') {
				return {
					...card,
					types: card.data.type_line.split('//')[0].split('—')[0].trim().split(' ')
				}
			}
			else if (groupType === 'subtype') {
				const front = card.data.type_line.split('//')[0];
				return {
					...card,
					subtypes: front.includes('—') ? front.split('—')[1].trim().split(' ') : []
				}
			}
			else return card;
		})
		.filter(({ commander }) => !commander);

	const groups = (() => {
		switch (groupType) {
			case 'type': return types.map(t => cards => ({
				name: t,
				cards: cards.filter(card => card.types.includes(t))
			}));
			case 'subtype': return [...sorted
				.reduce((subtypes, card) => new Set([...subtypes, ...card.subtypes]), new Set())
				, undefined].sort().map(t => cards => ({
					name: t || '(No subtype)',
					cards: cards.filter(card => (!t && card.subtypes.length === 0) || card.subtypes.includes(t))
				}));
			case 'color': return colors.map(({ name, value }) => cards => ({
				name,
				cards: cards.filter(({ data: card }) => (value === 'c' && card.colors.length === 0) || card.colors.includes(value))
			}));
			default: return [cards => ({ cards })];
		}
	})();

	const sections = boards.map(b => {
		const cards = sorted.filter(({ board }) => board === b.value);
		let existing = new Set();

		return {
			...b,
			count: cards.reduce((n, { count }) => n + count, 0),
			groups: groups.map(g => g(cards)).filter(({ cards }) => cards.length > 0).map(group => {
				const g = {
					...group,
					count: group.cards.reduce((n, { count }) => n + count, 0),
					stacks: Object.values(group.cards.reduce((o, card) => {
						const s = o[card.data.name] || [[]];
						new Array(card.count).fill({ ...card, ghost: existing.has(card.data.name) }).forEach((c, i) => {
							if (s[s.length - 1].length === 4) {
								s.push([]);
							}
							s[s.length - 1].unshift({ ...c, key: `${c.hash}${i}` });
						});
						o[card.data.name] = s;
						return o;
					}, {})).flat()
				};
				existing = new Set([...existing, ...group.cards.map(({ data: card }) => card.name)]);
				return g;
			})
		};
	}).filter(({ count }) => count > 0);

	const count = countCards(deck.cards);

	return <div className="viewer page">
		<div className="container">
			<header>
				<h2 className="title">{deck.title}</h2>
				<p className="h5 format">
					{deck.format ? <span>
						<span className="capitalize">{deck.format}</span>
						<span className="count tip">{count} cards</span>
					</span> : `${count} cards`}
				</p>
				{deck.description && <p className="description">{deck.description}</p>}
				<div className="flex view-controls">
					<div className="fill">
						{deck.creator && <span className="tip">Created by {deck.creator}</span>}
					</div>
					<div className="h6">
						Sort by&nbsp;
						<select className="" value={sortType} onChange={e => setSortType(e.target.value)}>
							<option value='name'>name</option>
							<option value='cmc'>mana</option>
						</select>
					</div>
					<div className="h6">
						Group by&nbsp;
						<select className="" value={groupType} onChange={e => setGroupType(e.target.value)}>
							<option value=''>nothing</option>
							<option value='type'>types</option>
							<option value='subtype'>subtypes</option>
							<option value='color'>colors</option>
						</select>
					</div>
				</div>
			</header>
			{commander.length > 0 &&
				<section className="commander noselect">
					<h4>Commander</h4>
					<div className="card-container flex wrap">
						{commander.map(({ data: card, ...options }, i) => <Card key={`${options.hash}${i}`} card={card} options={options} animateFoil={config.animateFoil} />)}
					</div>
				</section>
			}
			{sections.map(({ name, value, count, groups }) =>
				<section key={value} className={`${value} noselect`}>
					{(sections.length > 1 || value !== 'main') &&
						<h3>{name}<span className="count tip">{count}</span></h3>
					}
					<div className="group-container flex wrap">
						{groups.map(({ name, count, stacks }) => <div key={`${value}${name}`} className="group">
							{name && <h4>{name}<span className="count tip">{count}</span></h4>}
							<div className="card-container flex wrap">
								{stacks.map(stack => stack.reduce((previous, { data: card, ...options }) =>
									<Stackable key={options.key} child={previous}><Card card={card} options={options} animateFoil={config.animateFoil} /></Stackable>, undefined))}
							</div>
						</div>)}
					</div>
				</section>
			)}
		</div>
	</div>;
}