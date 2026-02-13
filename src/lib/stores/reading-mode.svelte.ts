let active = $state(false);

export const readingMode = {
	get active() {
		return active;
	},
	enter() {
		active = true;
	},
	exit() {
		active = false;
	}
};
