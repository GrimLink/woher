/** Folds umlauts so a plain keyboard can still find codes like LÖ or KÜN. */
export function normalize(value: string): string {
	return value
		.toLocaleUpperCase("de")
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.replace(/ß/g, "SS")
		.trim();
}
