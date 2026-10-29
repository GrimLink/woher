import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
	site: "https://grimlink.github.io",
	base: "/woher",
	devToolbar: {
		enabled: false,
	},
	fonts: [
		{
			provider: fontProviders.fontsource(),
			name: "Barlow Condensed",
			cssVariable: "--font-plate",
			weights: [700],
			styles: ["normal"],
			subsets: ["latin"],
			fallbacks: ["Arial Narrow", "sans-serif"],
		},
	],
});
