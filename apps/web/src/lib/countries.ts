export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2, e.g. "IN"
  name: string; // "India"
  dialCode: string; // "+91"
  flag: string; // "🇮🇳"
  demonym: string; // "Indian"
}

export const DEFAULT_COUNTRY: CountryInfo = {
  code: 'IN',
  name: 'India',
  dialCode: '+91',
  flag: '🇮🇳',
  demonym: 'Indian',
};

export const COUNTRIES: CountryInfo[] = [
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', demonym: 'Indian' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', demonym: 'American' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', demonym: 'British' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', demonym: 'Emirati' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', demonym: 'Canadian' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', demonym: 'Australian' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', demonym: 'German' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', demonym: 'French' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', demonym: 'Singaporean' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', demonym: 'Saudi' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', demonym: 'Omani' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', demonym: 'Qatari' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', demonym: 'Kuwaiti' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', demonym: 'Bahraini' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', demonym: 'Nepalese' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', demonym: 'Bangladeshi' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', demonym: 'Sri Lankan' },
  { code: 'BT', name: 'Bhutan', dialCode: '+975', flag: '🇧🇹', demonym: 'Bhutanese' },
  { code: 'MV', name: 'Maldives', dialCode: '+960', flag: '🇲🇻', demonym: 'Maldivian' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', demonym: 'Japanese' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', demonym: 'Chinese' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', demonym: 'South Korean' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺', demonym: 'Russian' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', demonym: 'Italian' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', demonym: 'Spanish' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', demonym: 'Dutch' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', demonym: 'Swiss' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', demonym: 'Swedish' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴', demonym: 'Norwegian' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰', demonym: 'Danish' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮', demonym: 'Finnish' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', demonym: 'Irish' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪', demonym: 'Belgian' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹', demonym: 'Austrian' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹', demonym: 'Portuguese' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷', demonym: 'Greek' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱', demonym: 'Polish' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿', demonym: 'Czech' },
  { code: 'HU', name: 'Hungary', dialCode: '+36', flag: '🇭🇺', demonym: 'Hungarian' },
  { code: 'RO', name: 'Romania', dialCode: '+40', flag: '🇷🇴', demonym: 'Romanian' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', demonym: 'Turkish' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬', demonym: 'Egyptian' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', demonym: 'South African' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', demonym: 'Kenyan' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', demonym: 'Nigerian' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', demonym: 'Malaysian' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', demonym: 'Thai' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', demonym: 'Indonesian' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', demonym: 'Filipino' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', demonym: 'Vietnamese' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', demonym: 'New Zealander' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', demonym: 'Brazilian' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', demonym: 'Mexican' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', demonym: 'Argentine' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', demonym: 'Chilean' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴', demonym: 'Colombian' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪', demonym: 'Peruvian' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱', demonym: 'Israeli' },
  { code: 'JO', name: 'Jordan', dialCode: '+962', flag: '🇯🇴', demonym: 'Jordanian' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961', flag: '🇱🇧', demonym: 'Lebanese' },
  { code: 'MU', name: 'Mauritius', dialCode: '+230', flag: '🇲🇺', demonym: 'Mauritian' },
  { code: 'SC', name: 'Seychelles', dialCode: '+248', flag: '🇸🇨', demonym: 'Seychellois' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰', demonym: 'Hong Konger' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼', demonym: 'Taiwanese' },
];

/**
 * Searches countries across:
 * - Country Name (e.g. "United States", "India")
 * - ISO Code (e.g. "US", "IN", "UK")
 * - Demonym (e.g. "American", "Indian", "British")
 * - Dial Code (e.g. "+1", "+91", "971")
 */
export function searchCountries(query: string): CountryInfo[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return COUNTRIES;
  const cleanQ = q.startsWith('+') ? q.slice(1) : q;

  return COUNTRIES.filter((c) => {
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.demonym.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      c.dialCode.replace('+', '').includes(cleanQ)
    );
  });
}

/**
 * Finds country by exact name, demonym, or ISO code
 */
export function findCountry(val?: string | null): CountryInfo | undefined {
  if (!val) return undefined;
  const v = val.trim().toLowerCase();
  return COUNTRIES.find(
    (c) =>
      c.name.toLowerCase() === v ||
      c.code.toLowerCase() === v ||
      c.demonym.toLowerCase() === v ||
      c.dialCode === val.trim(),
  );
}

/**
 * Parses an existing phone string (e.g. "+1 2025550143" or "+919876543210")
 * into dialCode and localNumber.
 */
export function parsePhoneNumber(phone?: string | null): { country: CountryInfo; localNumber: string } {
  if (!phone || !phone.trim()) {
    return { country: DEFAULT_COUNTRY, localNumber: '' };
  }
  const clean = phone.trim();

  // Try matching dial codes (sorted longest first to match +971 before +9)
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (clean.startsWith(c.dialCode)) {
      const rest = clean.slice(c.dialCode.length).trim();
      return { country: c, localNumber: rest };
    }
  }

  // Fallback: If no plus prefix, or unknown, return default
  return { country: DEFAULT_COUNTRY, localNumber: clean };
}
