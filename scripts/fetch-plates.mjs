/**
 * Builds src/data/plates.json from the German Wikipedia list of licence plate codes.
 * Run with `node scripts/fetch-plates.mjs`.
 */
import { writeFile } from "node:fs/promises";

const API = "https://de.wikipedia.org/w/api.php";
const SOURCE = "Liste der Kfz-Kennzeichen in Deutschland";
const USER_AGENT = "woher/1.0 (https://github.com/grimlink)";
const COLUMNS = 4;
const OUTPUT = new URL("../src/data/plates.json", import.meta.url);

/** @typedef {{ name: string, wiki?: string }} Link */
/** @typedef {{ code: string, districts: Link[], origin: string, originWiki?: string, state: string }} Plate */
/** @typedef {{ text: string, span: number }} Cell */

/**
 * @param {Record<string, string>} params
 * @returns {Promise<any>}
 */
async function api(params) {
	const url = new URL(API);
	url.search = new URLSearchParams({ format: "json", formatversion: "2", ...params }).toString();
	const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
	if (!response.ok) throw new Error(`${response.status} ${url}`);
	return response.json();
}

/**
 * @param {string} wikitext
 * @returns {string}
 */
function stripNoise(wikitext) {
	return wikitext
		.replace(/<!--[\s\S]*?(?:-->|$)/g, "")
		.replace(/<ref[^>]*\/>/g, "")
		.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
		.replace(/\{\{[^{}]*\}\}/g, "")
		.replace(/&nbsp;/g, " ")
		.trim();
}

/**
 * Resolves wiki links to their label and keeps bold markup as `<b>`, so the
 * letters that make up the code can be highlighted.
 * @param {string} wikitext
 * @returns {string}
 */
function toHtml(wikitext) {
	return stripNoise(wikitext)
		.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
		.replace(/'''(.*?)'''/g, "<b>$1</b>")
		.replace(/''(.*?)''/g, "<i>$1</i>")
		.replace(/<br\s*\/?>/g, ", ")
		.replace(/<b><\/b>/g, "");
}

/**
 * @param {string} html
 * @returns {string}
 */
function toText(html) {
	return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * @param {string} wikitext
 * @returns {string | undefined}
 */
function firstLink(wikitext) {
	const target = stripNoise(wikitext).match(/\[\[([^|\]#]+)/)?.[1];
	return target?.trim();
}

/**
 * @param {string} line
 * @returns {Cell}
 */
function parseCell(line) {
	const body = line.replace(/^\|\s*/, "");
	const attrs = body.match(/^((?:\s*[a-z]+="[^"]*")+)\s*\|(?!\|)(.*)$/);
	if (!attrs) return { text: body.trim(), span: 1 };
	const span = Number(attrs[1].match(/rowspan="(\d+)"/)?.[1] ?? 1);
	return { text: attrs[2].trim(), span };
}

/**
 * Expands a wikitable with rowspans into a grid of rows.
 * @param {string} table
 * @returns {string[][]}
 */
function parseTable(table) {
	/** @type {{ text: string, left: number }[]} */
	const carry = Array.from({ length: COLUMNS }, () => ({ text: "", left: 0 }));
	/** @type {string[][]} */
	const rows = [];

	for (const chunk of table.split(/\n\|-[^\n]*/).slice(1)) {
		/** @type {string[]} */
		const lines = [];
		for (const line of chunk.split("\n")) {
			if (line.startsWith("|}") || line.startsWith("!")) continue;
			if (line.startsWith("|")) lines.push(line);
			else if (lines.length && line.trim()) lines[lines.length - 1] += ` ${line.trim()}`;
		}
		if (!lines.length) continue;

		const cells = lines.map(parseCell);
		/** @type {string[]} */
		const row = [];
		for (let col = 0; col < COLUMNS; col++) {
			if (carry[col].left > 0) {
				row.push(carry[col].text);
				carry[col].left--;
				continue;
			}
			const cell = cells.shift();
			if (!cell) break;
			row.push(cell.text);
			carry[col] = { text: cell.text, left: cell.span - 1 };
		}
		if (row.length === COLUMNS) rows.push(row);
	}
	return rows;
}

/**
 * @param {string[]} titles
 * @returns {Promise<Map<string, string>>} German title to English title
 */
async function englishTitles(titles) {
	/** @type {Map<string, string>} */
	const result = new Map();
	for (let i = 0; i < titles.length; i += 50) {
		const batch = titles.slice(i, i + 50);
		const data = await api({
			action: "query",
			prop: "langlinks",
			lllang: "en",
			lllimit: "max",
			redirects: "1",
			titles: batch.join("|"),
		});
		/** @type {Map<string, string>} */
		const aliases = new Map();
		for (const { from, to } of [...(data.query.normalized ?? []), ...(data.query.redirects ?? [])]) {
			aliases.set(to, aliases.get(from) ?? from);
		}
		for (const page of data.query.pages) {
			const en = page.langlinks?.[0]?.title;
			if (!en) continue;
			result.set(page.title, en);
			for (const [to, from] of aliases) if (to === page.title) result.set(from, en);
		}
	}
	return result;
}

const { parse } = await api({ action: "parse", page: SOURCE, prop: "wikitext" });
const wikitext = /** @type {string} */ (parse.wikitext);
const tables = wikitext.split("{| {{TabDKfz}}").slice(1).map((table) => table.split("\n|}")[0]);

/** @type {Map<string, Plate>} */
const plates = new Map();
for (const [codeCell, districtCell, originCell, stateCell] of tables.flatMap(parseTable)) {
	const code = toText(toHtml(codeCell));
	if (!/^[A-ZÄÖÜ]{1,3}$/.test(code)) continue;

	const plate = plates.get(code) ?? {
		code,
		districts: [],
		origin: toHtml(originCell),
		originWiki: firstLink(originCell),
		state: toText(toHtml(stateCell)),
	};
	const name = toText(toHtml(districtCell));
	if (!plate.districts.some((district) => district.name === name)) {
		plate.districts.push({ name, wiki: firstLink(districtCell) });
	}
	plates.set(code, plate);
}

const titles = [...plates.values()].flatMap((plate) => [
	...plate.districts.map((district) => district.wiki),
	plate.originWiki,
]);
const english = await englishTitles([...new Set(titles.filter((title) => title !== undefined))]);

const output = [...plates.values()]
	.map((plate) => ({
		...plate,
		districts: plate.districts.map((district) => ({
			...district,
			en: district.wiki && english.get(district.wiki),
		})),
		originEn: plate.originWiki && english.get(plate.originWiki),
	}))
	.sort((a, b) => a.code.localeCompare(b.code, "de"));

await writeFile(OUTPUT, `${JSON.stringify(output, null, "\t")}\n`);
console.log(`Wrote ${output.length} plates to ${OUTPUT.pathname}`);
