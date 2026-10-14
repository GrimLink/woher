import type { APIRoute } from "astro";
import { siteTitle, siteDescription, themeColor } from "@/consts";

const webmanifest = {
	id: "/",
	name: siteTitle,
	short_name: "Woher",
	description: siteDescription,
	lang: "en",
	start_url: "/",
	scope: "/",
	display: "standalone",
	orientation: "any",
	theme_color: themeColor,
	background_color: themeColor,
	categories: ["travel", "utilities"],
	icons: [
		{
			src: "/icon.svg",
			type: "image/svg+xml",
			sizes: "any",
			purpose: "any maskable",
		},
		{
			src: "/icon-mono.svg",
			type: "image/svg+xml",
			sizes: "any",
			purpose: "monochrome",
		},
		{
			src: "/apple-touch-icon.png",
			type: "image/png",
			sizes: "180x180",
		},
	],
};

export const GET: APIRoute = () =>
	new Response(JSON.stringify(webmanifest, null, 2), {
		headers: { "Content-Type": "application/manifest+json" },
	});
