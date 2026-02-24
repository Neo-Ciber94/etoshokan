import { dev } from '$app/environment';

type JSONObject = {
	[key: string]: JSONValue;
};

type JSONArray = JSONValue[];

type JSONValue = number | string | boolean | null | JSONArray | JSONObject;

type Listener = (data: JSONValue) => void;

type Message = {
	data: JSONValue;
	timestamp: number;
};

type MessageChannelOptions = {
	channelName: string;
	logging?: boolean;
};

export class MessageChannel {
	constructor(readonly options: Readonly<MessageChannelOptions>) {}

	get channelName() {
		return this.options.channelName;
	}

	get logging() {
		return this.options.logging || false;
	}

	send(data: JSONValue) {
		const key = `message-channel:${this.channelName}`;
		const message: Message = { data, timestamp: Date.now() };
		localStorage.setItem(key, JSON.stringify(message));

		if (this.logging) {
			console.log(`📨 [SEND] `, message);
		}
	}

	subscribe(listener: Listener) {
		const key = `message-channel:${this.channelName}`;
		const loggingEnabled = this.logging;
		const registeredAt = Date.now();

		function handleEvent(event: StorageEvent) {
			if (event.key === key) {
				try {
					const raw = event.newValue;

					if (raw) {
						const message = JSON.parse(raw) as Message;

						// Ignore the message was received before this was registered
						if (message.timestamp < registeredAt) {
							return;
						}

						if (loggingEnabled) {
							console.log(`📩 [RECEIVED] `, message);
						}

						listener(message.data);
					}
				} catch (err) {
					if (dev) {
						console.error(`[ERROR] ${key}`, err);
					}
				}
			}
		}

		window.addEventListener('storage', handleEvent);

		return {
			unsubscribe() {
				window.removeEventListener('storage', handleEvent);
			}
		};
	}
}

export function getMessageChannel(channelName: string = 'common') {
	return new MessageChannel({ channelName, logging: true });
}
