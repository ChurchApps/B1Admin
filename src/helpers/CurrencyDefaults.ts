// Default giving currency for a church's country (issue #1483). churches.country is free text,
// so keys are ISO-2, ISO-3 and common English names after normalize(). Copy of Api/src/shared/helpers/CurrencyDefaults.ts; keep both in sync.
// currency -> pipe-separated country keys
const countriesByCurrency: Record<string, string> = {
  usd: "us|usa|united states|united states of america",
  gbp: "gb|gbr|uk|united kingdom|england|scotland|wales|great britain",
  cad: "ca|can|canada",
  aud: "au|aus|australia",
  nzd: "nz|nzl|new zealand",
  zar: "za|zaf|south africa",
  ngn: "ng|nga|nigeria",
  ghs: "gh|gha|ghana",
  kes: "ke|ken|kenya",
  ugx: "ug|uga|uganda",
  tzs: "tz|tza|tanzania",
  inr: "in|ind|india",
  php: "ph|phl|philippines",
  mxn: "mx|mex|mexico",
  brl: "br|bra|brazil",
  jpy: "jp|jpn|japan",
  sgd: "sg|sgp|singapore",
  hkd: "hk|hkg|hong kong",
  chf: "ch|che|switzerland",
  sek: "se|swe|sweden",
  nok: "no|nor|norway",
  dkk: "dk|dnk|denmark",
  pln: "pl|pol|poland",
  czk: "cz|cze|czechia|czech republic",
  krw: "kr|kor|south korea|korea",
  idr: "id|idn|indonesia",
  myr: "my|mys|malaysia",
  eur: "ie|irl|ireland|de|deu|germany|fr|fra|france|es|esp|spain|it|ita|italy|nl|nld|netherlands|be|bel|belgium|at|aut|austria|pt|prt|portugal|fi|fin|finland|gr|grc|greece|sk|svk|slovakia|si|svn|slovenia|ee|est|estonia|lv|lva|latvia|lt|ltu|lithuania|lu|lux|luxembourg|mt|mlt|malta|cy|cyp|cyprus|hr|hrv|croatia"
};

export class CurrencyDefaults {
  static countryCurrencies: Record<string, string> = Object.fromEntries(
    Object.entries(countriesByCurrency).flatMap(([currency, countries]) => countries.split("|").map((c) => [c, currency]))
  );

  static normalize(country?: string) {
    return (country || "").toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  }

  // Lowercase ISO-4217 code, or undefined when the country is unknown so callers keep today's usd fallback.
  static currencyForCountry(country?: string): string | undefined {
    return CurrencyDefaults.countryCurrencies[CurrencyDefaults.normalize(country)];
  }
}
