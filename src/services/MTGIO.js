import ServiceClient from './ServiceClient';

const HOST = 'https://api.magicthegathering.io/v1';

const cache = {};
const tryCache = (key, onCacheMiss) => new Promise(async (resolve, reject) => {
	if (cache[key]) return resolve(cache[key]);
	try {
		cache[key] = await onCacheMiss();
		resolve(cache[key]);
	}
	catch (error) {
		reject(error);
	}
});

export default class {
	constructor() {
		const client = new ServiceClient(HOST);
		this.formats = () => tryCache('formats', () => client.get(`${HOST}/formats`)).then(({ formats }) => ['', ...formats]);
		this.cancel = () => client.cancel();
		this.error = () => console.log('An error occurred fetching data from magicthegathering.io');
	}
}