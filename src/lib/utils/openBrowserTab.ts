import { open_chrome } from 'tauri-plugin-in-app-browser-api';
import { isWeb } from './isWeb';

export async function openBrowserTab(url: string) {
	if (isWeb()) {
		console.log('Opening tab on browser', url);
		window.open(url, '_blank');
	} else {
		try {
			console.log('Opening tab on chrome', url);
			await open_chrome({
				url: url,
				toolbarColor: 'black'
			});
		} catch (err) {
			console.error('Failed to open tab: ', err, url);
			window.open(url, '_blank');
		}
	}
}
