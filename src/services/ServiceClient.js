import axios from 'axios';

const handleResponse = ({ status, statusText, data }) => {
	if (status === 200) return data;
	else throw new Error(`${status} ${statusText}`);
}

export default class {
	constructor(host) {
		const instance = axios.create({
			baseURL: host
		});

		const source = axios.CancelToken.source();

		this.get = url => instance.get(url, { cancelToken: source.token }).then(handleResponse);
		this.post = (url, body) => instance.post(url, body, {
			headers: { 'content-type': 'application/json' },
			cancelToken: source.token
		  }).then(handleResponse);
		this.cancel = msg => source.cancel(msg);
	}
}