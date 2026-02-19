export const enum LogLevel {
	DEBUG = 'debug',
	INFO = 'info',
	WARN = 'warn',
	ERROR = 'error'
}

export interface Logger {
	readonly minLevel: LogLevel;

	log(level: LogLevel, message: unknown, ...args: unknown[]): void;
	debug(message: unknown, ...args: unknown[]): void;
	info(message: unknown, ...args: unknown[]): void;
	warn(message: unknown, ...args: unknown[]): void;
	error(message: unknown, ...args: unknown[]): void;
}

export function getLogLevel(logLevel: LogLevel): number {
	switch (logLevel) {
		case LogLevel.DEBUG:
			return 1;
		case LogLevel.INFO:
			return 2;
		case LogLevel.WARN:
			return 3;
		case LogLevel.ERROR:
			return 4;
		default: {
			return 0;
		}
	}
}
