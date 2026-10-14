import data from "@/data/plates.json";
import { normalize } from "@/normalize";

export { normalize };

export interface District {
	name: string;
	wiki?: string;
	en?: string;
}

export interface Plate {
	code: string;
	districts: District[];
	/** HTML, with the letters that form the code wrapped in `<b>` */
	origin: string;
	originWiki?: string;
	originEn?: string;
	state: string;
}

export const plates = data as Plate[];

export const letters = [...new Set(plates.map((plate) => plate.code[0]))];

export function stripTags(html: string): string {
	return html.replace(/<[^>]+>/g, "");
}

function wikiPath(title: string): string {
	return encodeURIComponent(title.replaceAll(" ", "_"));
}

/** Prefers the English article and falls back to the German one. */
export function wikiUrl(district: Pick<District, "wiki" | "en">): string | undefined {
	if (district.en) return `https://en.wikipedia.org/wiki/${wikiPath(district.en)}`;
	if (district.wiki) return `https://de.wikipedia.org/wiki/${wikiPath(district.wiki)}`;
}

/** The name people would type into a map or search engine, without the administrative prefix. */
function placeName(district: District): string {
	return district.name.replace(/^(Stadt|Landkreis|Kreis|Städteregion|Regionalverband) /, "");
}

function placeQuery(district: District, state: string): string {
	const region = state === "bundesweit" ? "Deutschland" : `${state}, Deutschland`;
	return encodeURIComponent(`${placeName(district)}, ${region}`);
}

export function mapUrl(district: District, state: string): string {
	return `https://www.google.com/maps/search/?api=1&query=${placeQuery(district, state)}`;
}

export function searchUrl(district: District, state: string): string {
	return `https://www.google.com/search?q=${placeQuery(district, state)}`;
}

/** Every word the search box should match on, folded the same way as the query. */
export function searchText(plate: Plate): string {
	const words = [
		stripTags(plate.origin),
		plate.state,
		...plate.districts.flatMap((district) => [district.name, district.en ?? ""]),
		plate.originEn ?? "",
	];
	return normalize([...new Set(words.filter(Boolean))].join(" | "));
}
