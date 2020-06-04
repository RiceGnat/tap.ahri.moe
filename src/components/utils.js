
import { languages } from '../static/constants.json';

const languageNames = languages.reduce((o, { code, name }) => ({ ...o, [code]: name }), {});
export const getLanguageName = code => languageNames[code];

const printedLanguageCodes = languages.reduce((o, { code, printed }) => ({ ...o, [code]: printed || code.toUpperCase() }), {});
export const getPrintedLanguageCode = code => printedLanguageCodes[code];

export const countCards = cards => cards.reduce((count, card) => count + card.count, 0);

export const getCardHash = (card, opts) => btoa(encodeURIComponent([card.name, card.set, card.lang, card.collector_number, opts.foil, opts.signed, opts.alter, opts.board].join()));

export const getCardName = card => card.printed_name || card.name;

export const safeJoin = (delimiter, ...args) => args.filter(a => a !== null && a !== undefined && a !== false && a !== '').join(delimiter);