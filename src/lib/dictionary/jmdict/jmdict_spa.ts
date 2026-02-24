import { JMDictBase } from './jmdict_base';

export class JMDict_SpaDictionary extends JMDictBase {
	readonly name: string = 'JMDict (spa)';

	constructor() {
		super({
			jmdictUrl: '/jmdict/jmdict-spa-3.6.2+20260223124729.json.zip',
			cacheKey: 'jmdict-spa',
			lang: 'es'
		});
	}
}
