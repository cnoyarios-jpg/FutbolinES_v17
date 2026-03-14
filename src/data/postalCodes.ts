import postalCodesCsv from './codigos_postales_municipios.csv?raw';

export interface PostalCodeLocation {
  postalCode: string;
  municipalityId: string;
  municipality: string;
  provinceCode: string;
  province: string;
}

const PROVINCE_BY_CODE: Record<string, string> = {
  '01': 'Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería', '05': 'Ávila', '06': 'Badajoz',
  '07': 'Illes Balears', '08': 'Barcelona', '09': 'Burgos', '10': 'Cáceres', '11': 'Cádiz', '12': 'Castellón',
  '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña', '16': 'Cuenca', '17': 'Girona', '18': 'Granada',
  '19': 'Guadalajara', '20': 'Gipuzkoa', '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León',
  '25': 'Lleida', '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga', '30': 'Murcia',
  '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas',
  '36': 'Pontevedra', '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria',
  '40': 'Segovia', '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona', '44': 'Teruel', '45': 'Toledo',
  '46': 'Valencia', '47': 'Valladolid', '48': 'Bizkaia', '49': 'Zamora', '50': 'Zaragoza',
  '51': 'Ceuta', '52': 'Melilla',
};

let postalCodeIndex: Record<string, PostalCodeLocation> | null = null;

function normalizePostalCode(raw: string): string {
  return (raw || '').replace(/\D/g, '').slice(0, 5);
}

function unquoteCsv(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

/**
 * Convert INE-style "Name, Article" to "Article Name".
 * Examples: "Baña, A" → "A Baña", "Grove, O" → "O Grove",
 *           "Cubo de Tierra del Vino, El" → "El Cubo de Tierra del Vino"
 */
function fixArticleSuffix(name: string): string {
  const match = name.match(/^(.+),\s*(A|O|As|Os|El|La|Los|Las|Es|Sa|S')$/i);
  if (match) {
    return `${match[2]} ${match[1]}`;
  }
  return name;
}

function buildPostalCodeIndex(): Record<string, PostalCodeLocation> {
  const index: Record<string, PostalCodeLocation> = {};
  const lines = postalCodesCsv.split(/\r?\n/);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const firstComma = line.indexOf(',');
    const secondComma = line.indexOf(',', firstComma + 1);
    if (firstComma <= 0 || secondComma <= firstComma) continue;

    const postalCode = line.slice(0, firstComma).trim();
    const municipalityId = line.slice(firstComma + 1, secondComma).trim();
    const municipality = unquoteCsv(line.slice(secondComma + 1));

    if (!/^\d{5}$/.test(postalCode) || !/^\d{5}$/.test(municipalityId) || !municipality) continue;

    if (!index[postalCode]) {
      const provinceCode = municipalityId.slice(0, 2);
      index[postalCode] = {
        postalCode,
        municipalityId,
        municipality,
        provinceCode,
        province: PROVINCE_BY_CODE[provinceCode] || '',
      };
    }
  }

  return index;
}

function getPostalCodeIndex(): Record<string, PostalCodeLocation> {
  if (!postalCodeIndex) {
    postalCodeIndex = buildPostalCodeIndex();
  }
  return postalCodeIndex;
}

export function lookupPostalCodeLocation(postalCode: string): PostalCodeLocation | null {
  const normalized = normalizePostalCode(postalCode);
  if (normalized.length !== 5) return null;
  return getPostalCodeIndex()[normalized] || null;
}

export function lookupPostalCode(postalCode: string): string {
  return lookupPostalCodeLocation(postalCode)?.municipality || '';
}

export function estimatePostalCodeDistance(fromPostalCode: string, toPostalCode: string): number {
  const from = normalizePostalCode(fromPostalCode);
  const to = normalizePostalCode(toPostalCode);
  if (from.length !== 5 || to.length !== 5) return Number.POSITIVE_INFINITY;
  if (from === to) return 0;

  const fromLocation = lookupPostalCodeLocation(from);
  const toLocation = lookupPostalCodeLocation(to);
  const numericGap = Math.abs(Number(from) - Number(to));

  if (fromLocation && toLocation) {
    if (fromLocation.municipalityId === toLocation.municipalityId) return 5;

    if (fromLocation.provinceCode === toLocation.provinceCode) {
      if (from.slice(0, 3) === to.slice(0, 3)) {
        return Math.max(10, Math.round(numericGap / 5));
      }
      return Math.max(20, Math.round(numericGap / 2.5));
    }
  }

  if (from.slice(0, 2) === to.slice(0, 2)) {
    return Math.max(30, Math.round(numericGap / 2));
  }

  if (from.slice(0, 1) === to.slice(0, 1)) {
    return 140 + Math.round(numericGap / 500);
  }

  return 260 + Math.round(numericGap / 800);
}
