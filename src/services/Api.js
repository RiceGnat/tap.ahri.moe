import ServiceClient from './ServiceClient';

const HOST = 'http://localhost:8081/api';

export default class {
	constructor() {
		const client = new ServiceClient(HOST);
		this.deck = slug => client.get(`/deck/${slug}`);
		this.cancel = () => client.cancel();
	}
}