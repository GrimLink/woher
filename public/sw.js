const CACHE_NAME = "woher";
// The worker sits next to the page, so this follows whatever base path the site is served from
const APP_URL = new URL("./", self.location.href).href;

/**
 * Collects the same origin files a page links to, so the app works offline after the first visit.
 * @param {string} html
 * @returns {string[]}
 */
function assetUrls(html) {
	const urls = [...html.matchAll(/(?:href|src)="(\/[^"/][^"]*)"/g)].map((match) => match[1]);
	return [...new Set(urls)];
}

/**
 * Stores the app page with its assets and drops what the new page no longer uses,
 * so old hashed builds do not pile up.
 * @param {Response} response
 * @returns {Promise<void>}
 */
async function refreshCache(response) {
	const cache = await caches.open(CACHE_NAME);
	const html = await response.clone().text();
	const assets = assetUrls(html);

	await cache.addAll(assets);
	await cache.put(APP_URL, response);

	const keep = new Set([APP_URL, ...assets.map((url) => new URL(url, self.location.origin).href)]);
	const stale = (await cache.keys()).filter((request) => !keep.has(request.url));
	await Promise.all(stale.map((request) => cache.delete(request)));
}

/**
 * Network first, so a new deploy shows up right away, with the cached app as the offline fallback.
 * The search query lives in the URL, so every navigation is served by the same cached page.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleNavigation(request) {
	try {
		const response = await fetch(request, { cache: "no-cache" });
		if (response.ok) refreshCache(response.clone()).catch(() => {});
		return response;
	} catch {
		const cached = await caches.match(APP_URL);
		if (cached) return cached;
		throw new Error("Offline and the app is not cached yet");
	}
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleAsset(request) {
	const cached = await caches.match(request, { ignoreSearch: true });
	return cached ?? fetch(request);
}

self.addEventListener("install", (event) => {
	event.waitUntil(fetch(APP_URL, { cache: "reload" }).then(refreshCache));
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const names = await caches.keys();
			const old = names.filter((name) => name !== CACHE_NAME);
			await Promise.all(old.map((name) => caches.delete(name)));
			await self.clients.claim();
		})(),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

	event.respondWith(request.mode === "navigate" ? handleNavigation(request) : handleAsset(request));
});
