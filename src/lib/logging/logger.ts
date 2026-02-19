/* eslint-disable @typescript-eslint/no-unused-vars */
import { PUBLIC_LOG_DISABLED, PUBLIC_LOG_LEVEL } from '$env/static/public';
import { getLogLevel, type Logger, LogLevel } from '.';

abstract class BaseLogger implements Logger {
	abstract log(level: LogLevel, message: unknown, ...args: unknown[]): void;

	constructor(readonly minLevel: LogLevel) {}

	canLog(level: LogLevel): boolean {
		return getLogLevel(level) >= getLogLevel(this.minLevel);
	}

	debug(message: unknown, ...args: unknown[]): void {
		this.log(LogLevel.DEBUG, message, ...args);
	}

	info(message: unknown, ...args: unknown[]): void {
		this.log(LogLevel.INFO, message, ...args);
	}

	warn(message: unknown, ...args: unknown[]): void {
		this.log(LogLevel.WARN, message, ...args);
	}

	error(message: unknown, ...args: unknown[]): void {
		this.log(LogLevel.ERROR, message, ...args);
	}
}

// class ConsoleLogger extends BaseLogger {
// 	log(level: LogLevel, message: string, ...args: unknown[]): void {
// 		if (!this.canLog(level)) {
// 			return;
// 		}

// 		const methods = {
// 			debug: console.debug,
// 			info: console.info,
// 			warn: console.warn,
// 			error: console.error
// 		};

// 		const logMethod = methods[level];

// 		if (logMethod) {
// 			logMethod(message, args);
// 		}
// 	}
// }

export class ConsoleLogger extends BaseLogger {
	log(level: LogLevel, message: string, ...args: unknown[]): void {
		if (!this.canLog(level)) return;

		const time = new Date().toISOString();

		const levelMap: Record<
			LogLevel,
			{
				label: string;
				method: (...data: unknown[]) => void;
				color: string;
			}
		> = {
			[LogLevel.DEBUG]: {
				label: 'DEBUG',
				method: console.debug,
				color: '\x1b[90m' // gray
			},
			[LogLevel.INFO]: {
				label: 'INFO',
				method: console.info,
				color: '\x1b[34m' // blue
			},
			[LogLevel.WARN]: {
				label: 'WARN',
				method: console.warn,
				color: '\x1b[33m' // yellow
			},
			[LogLevel.ERROR]: {
				label: 'ERROR',
				method: console.error,
				color: '\x1b[31;1m' // bold red
			}
		};

		const reset = '\x1b[0m';
		const entry = levelMap[level];

		entry.method(`${entry.color}[${entry.label}]${reset} ${time} ${message}`, ...args);
	}
}

class NoopLogger extends BaseLogger {
	log(_level: LogLevel, _message: string, ..._args: unknown[]): void {}
}

function getLogger() {
	if (PUBLIC_LOG_DISABLED) {
		return new NoopLogger(LogLevel.DEBUG);
	}

	const minLogLevel = (PUBLIC_LOG_LEVEL || 'info') as LogLevel;
	return new ConsoleLogger(minLogLevel);
}

export const logger = getLogger();
