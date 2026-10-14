# Woher?

Spotted a German car and wondering where it is from? Woher looks up the region behind a German licence plate code, so `EL` tells you the car is from the Emsland.

Search by code (`EL`), by full plate (`EL-AB 123`) or by place name (`Emsland`). Umlauts are optional, so `KUN` finds `KÜN`. Every result links to Wikipedia, a map and a web search for the region.

## Development

```sh
npm install
npm run dev
```

## Plate data

The codes come from the German Wikipedia article [Liste der Kfz-Kennzeichen in Deutschland](https://de.wikipedia.org/wiki/Liste_der_Kfz-Kennzeichen_in_Deutschland) (CC BY-SA 4.0). They are stored in `src/data/plates.json`. Refresh them with:

```sh
npm run plates
```

## License

The code is [MIT](LICENSE) licensed. The plate data in `src/data/plates.json` is derived from Wikipedia and stays under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
