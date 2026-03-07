import { TableBrand } from '@/types';
import { TABLE_BRAND_COLORS, TABLE_BRAND_SHORT } from '@/data/mock';

interface VenueMarkerIconProps {
  brand: TableBrand;
  size?: number;
}

export default function VenueMarkerIcon({ brand, size = 40 }: VenueMarkerIconProps) {
  const color = TABLE_BRAND_COLORS[brand] || TABLE_BRAND_COLORS['Otro'];
  const short = TABLE_BRAND_SHORT[brand] || '?';
  const r = size / 2;

  return (
    <svg width={size} height={size + 12} viewBox={`0 0 ${size} ${size + 12}`} fill="none">
      <circle cx={r} cy={r} r={r} fill={color} />
      <polygon points={`${r - 5},${size - 2} ${r + 5},${size - 2} ${r},${size + 10}`} fill={color} />
      <text
        x={r}
        y={r + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={size * 0.28}
        fontWeight="700"
        fontFamily="'Space Grotesk', sans-serif"
      >
        {short}
      </text>
    </svg>
  );
}

export function createMarkerSvgUrl(brand: TableBrand, size = 40): string {
  const color = TABLE_BRAND_COLORS[brand] || TABLE_BRAND_COLORS['Otro'];
  const short = TABLE_BRAND_SHORT[brand] || '?';
  const r = size / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 12}" viewBox="0 0 ${size} ${size + 12}">
    <circle cx="${r}" cy="${r}" r="${r}" fill="${color}"/>
    <polygon points="${r - 5},${size - 2} ${r + 5},${size - 2} ${r},${size + 10}" fill="${color}"/>
    <text x="${r}" y="${r + 1}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="${size * 0.28}" font-weight="700" font-family="sans-serif">${short}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
