export type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'etoshokan:theme';

function loadTheme(): Theme {
	if (typeof localStorage === 'undefined') return 'system';
	return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
}

let theme = $state<Theme>(loadTheme());

export function setTheme(value: Theme) {
	const root = document.documentElement;
	let isDark = false;
	theme = value;

	switch (value) {
		case 'system':
			isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			break;
		case 'light':
			isDark = false;
			break;
		case 'dark':
			isDark = true;
			break;
	}

	if (isDark) {
		root.classList.add('dark');
	} else {
		root.classList.remove('dark');
	}

	localStorage.setItem(THEME_KEY, value);
}

export function isDark() {
	return document.documentElement.classList.contains('dark');
}

export function toggleTheme() {
	setTheme(isDark() ? 'light' : 'dark');
}

export const themeStore = {
	get value() {
		return theme;
	},
	set: setTheme
};
