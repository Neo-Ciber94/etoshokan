type VersionLike = {
	readonly mayor: number;
	readonly minor: number;
	readonly patch: number;
	readonly timestamp: number;
};

export class Version {
	readonly mayor: number;
	readonly minor: number;
	readonly patch: number;
	readonly timestamp: number;

	private constructor(
		mayor: number,
		minor: number,
		patch: number,
		timestamp: number
	) {
		this.mayor = mayor;
		this.minor = minor;
		this.patch = patch;
		this.timestamp = timestamp;
	}

	static parse(input: string): Version {
		// 0.0.0+202603011230
		const [versionPart, timestampPart] = input.split('+');

		if (!versionPart || !timestampPart) {
			throw new Error(`Invalid version format: ${input}`);
		}

		const [mayor, minor, patch] = versionPart
			.split('.')
			.map(Number);

		const timestamp = Number(timestampPart);

		if ([mayor, minor, patch, timestamp].some(Number.isNaN)) {
			throw new Error(`Invalid version values: ${input}`);
		}

		return new Version(mayor, minor, patch, timestamp);
	}

	static from(version: VersionLike): Version {
		const { mayor, minor, patch, timestamp } = version;

		if ([mayor, minor, patch, timestamp].some(Number.isNaN)) {
			throw new Error('Invalid VersionLike values');
		}

		return new Version(mayor, minor, patch, timestamp);
	}

	toJSON(): VersionLike {
		return {
			mayor: this.mayor,
			minor: this.minor,
			patch: this.patch,
			timestamp: this.timestamp,
		};
	}

	compare(other: Version): number {
		if (this.mayor !== other.mayor) {
			return this.mayor - other.mayor;
		}
		if (this.minor !== other.minor) {
			return this.minor - other.minor;
		}
		if (this.patch !== other.patch) {
			return this.patch - other.patch;
		}
		return this.timestamp - other.timestamp;
	}

	isNewerThan(other: Version): boolean {
		return this.compare(other) > 0;
	}

	toString(): string {
		return `${this.mayor}.${this.minor}.${this.patch}+${this.timestamp}`;
	}
}