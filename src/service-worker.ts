/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const navigationHandler = new NetworkFirst({
	cacheName: 'navigations',
	networkTimeoutSeconds: 3
});

registerRoute(
	new NavigationRoute(
		async (params) => {
			try {
				return await navigationHandler.handle(params);
			} catch {
				const cache = await caches.open('navigations');
				const offlineResponse = await cache.match('offline');
				if (offlineResponse) return offlineResponse;
				return Response.error();
			}
		},
		{ denylist: [/^\/api\//] }
	)
);
