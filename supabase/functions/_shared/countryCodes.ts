/** ISO 3166-1 alpha-2 → sport/IOC display code (3-letter). */
const ALPHA2_TO_SPORT: Record<string, string> = {
  AF: 'AFG', AL: 'ALB', DZ: 'ALG', AD: 'AND', AO: 'ANG', AG: 'ANT',
  AR: 'ARG', AM: 'ARM', AU: 'AUS', AT: 'AUT', AZ: 'AZE',
  BS: 'BAH', BH: 'BRN', BD: 'BAN', BB: 'BAR', BY: 'BLR', BE: 'BEL',
  BZ: 'BIZ', BJ: 'BEN', BT: 'BHU', BO: 'BOL', BA: 'BIH', BW: 'BOT',
  BR: 'BRA', BN: 'BRU', BG: 'BUL', BF: 'BUR',
  KH: 'CAM', CM: 'CMR', CA: 'CAN', CV: 'CPV', CF: 'CAF', TD: 'CHA',
  CL: 'CHI', CN: 'CHN', CO: 'COL', KM: 'COM', CG: 'CGO', CD: 'COD',
  CR: 'CRC', CI: 'CIV', HR: 'CRO', CU: 'CUB', CY: 'CYP', CZ: 'CZE',
  DK: 'DEN', DJ: 'DJI', DO: 'DOM',
  EC: 'ECU', EG: 'EGY', SV: 'ESA', ER: 'ERI', EE: 'EST', ET: 'ETH',
  FJ: 'FIJ', FI: 'FIN', FR: 'FRA',
  GA: 'GAB', GM: 'GAM', GE: 'GEO', DE: 'GER', GH: 'GHA', GB: 'GBR',
  GR: 'GRE', GD: 'GRN', GT: 'GUA', GN: 'GUI', GW: 'GBS', GY: 'GUY',
  HT: 'HAI', HN: 'HON', HK: 'HKG', HU: 'HUN',
  IS: 'ISL', IN: 'IND', ID: 'INA', IR: 'IRI', IQ: 'IRQ', IE: 'IRL',
  IL: 'ISR', IT: 'ITA',
  JM: 'JAM', JP: 'JPN', JO: 'JOR',
  KZ: 'KAZ', KE: 'KEN', KI: 'KIR', KP: 'PRK', KR: 'KOR', KW: 'KUW',
  KG: 'KGZ',
  LA: 'LAO', LV: 'LAT', LB: 'LIB', LS: 'LES', LR: 'LBR', LY: 'LBA',
  LI: 'LIE', LT: 'LTU', LU: 'LUX',
  MK: 'MKD', MG: 'MAD', MW: 'MAW', MY: 'MAS', MV: 'MDV', ML: 'MLI',
  MT: 'MLT', MH: 'MHL', MR: 'MTN', MU: 'MRI', MX: 'MEX', FM: 'FSM',
  MD: 'MDA', MC: 'MON', MN: 'MGL', ME: 'MNE', MA: 'MAR', MZ: 'MOZ',
  MM: 'MYA',
  NA: 'NAM', NR: 'NRU', NP: 'NEP', NL: 'NED', NZ: 'NZL', NI: 'NCA',
  NE: 'NIG', NG: 'NGR', NO: 'NOR',
  OM: 'OMA',
  PK: 'PAK', PW: 'PLW', PA: 'PAN', PG: 'PNG', PY: 'PAR', PE: 'PER',
  PH: 'PHI', PL: 'POL', PT: 'POR',
  QA: 'QAT',
  RO: 'ROU', RU: 'RUS', RW: 'RWA',
  KN: 'SKN', LC: 'LCA', VC: 'VIN', WS: 'SAM', SM: 'SMR', ST: 'STP',
  SA: 'KSA', SN: 'SEN', RS: 'SRB', SC: 'SEY', SL: 'SLE', SG: 'SGP',
  SK: 'SVK', SI: 'SLO', SB: 'SOL', SO: 'SOM', ZA: 'RSA', SS: 'SSD',
  ES: 'ESP', LK: 'SRI', SD: 'SUD', SR: 'SUR', SZ: 'SWZ', SE: 'SWE',
  CH: 'SUI', SY: 'SYR',
  TW: 'TPE', TJ: 'TJK', TZ: 'TAN', TH: 'THA', TL: 'TLS', TG: 'TOG',
  TO: 'TGA', TT: 'TTO', TN: 'TUN', TR: 'TUR', TM: 'TKM',
  UG: 'UGA', UA: 'UKR', AE: 'UAE', US: 'USA', UY: 'URU', UZ: 'UZB',
  VU: 'VAN', VE: 'VEN', VN: 'VIE',
  YE: 'YEM',
  ZM: 'ZAM', ZW: 'ZIM',
  XX: 'XXX',
}

export function iso2ToSportCode(iso2: string): string {
  const upper = iso2.trim().toUpperCase()
  return ALPHA2_TO_SPORT[upper] ?? (upper.length === 2 ? 'XXX' : upper)
}

export function sportCodeToIso2(code: string): string {
  const upper = code.trim().toUpperCase()
  if (upper === 'XXX') return 'XX'
  if (upper.length === 2) return upper
  const entry = Object.entries(ALPHA2_TO_SPORT).find(([, v]) => v === upper)
  return entry ? entry[0] : 'XX'
}

export function flagUrlFromIso2(iso2: string): string | null {
  const upper = iso2.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper) || upper === 'XX') return null
  return `https://flagcdn.com/${upper.toLowerCase()}.svg`
}

