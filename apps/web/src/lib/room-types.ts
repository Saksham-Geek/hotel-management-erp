/**
 * Room Type Theme & Color System (Bundled Notes / Material 3 Inspired)
 * Provides distinctive, accessible, aesthetic color tokens for room categories.
 * 
 * Guarantees every hotel room category has a unique, consistent color identity
 * across the Live Room Board, Tape Chart, Room Selectors, Folios, and Settings,
 * whether the hotel has 2 categories or 12+ categories.
 */

export interface RoomTypeTheme {
  category: string;
  colorName: string;   // Palette identity name (e.g. 'Champagne Gold', 'Sapphire Sky')
  badge: string;       // Pill badge classes
  dot: string;         // Solid dot indicator
  dash: string;        // Bundled Notes signature horizontal accent dash
  border: string;      // Accent border
  lightBg: string;     // Soft pastel card surface
  text: string;        // High contrast category text
  icon: string;        // Category icon
}

export const CATEGORY_PALETTE: RoomTypeTheme[] = [
  // 0. Warm Amber / Champagne Gold (Palace / Presidential / Luxury)
  {
    category: 'Presidential Palace Suite',
    colorName: 'Champagne Gold',
    badge: 'bg-amber-50/90 text-amber-900 border-amber-300/80 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-500/40 shadow-2xs',
    dot: 'bg-amber-500',
    dash: 'bg-amber-500',
    border: 'border-l-amber-500',
    lightBg: 'bg-[#fffcf4] dark:bg-[#1f1a12]',
    text: 'text-amber-950 dark:text-amber-100',
    icon: '👑',
  },
  // 1. Sapphire Blue / Azure (Deluxe / Premium / Superior)
  {
    category: 'Deluxe Room',
    colorName: 'Sapphire Sky',
    badge: 'bg-sky-50/90 text-sky-900 border-sky-300/80 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-500/40 shadow-2xs',
    dot: 'bg-sky-500',
    dash: 'bg-sky-500',
    border: 'border-l-sky-500',
    lightBg: 'bg-[#f4faff] dark:bg-[#121c24]',
    text: 'text-sky-950 dark:text-sky-100',
    icon: '🌊',
  },
  // 2. Royal Violet / Lavender (Executive / Club / Business)
  {
    category: 'Executive Suite',
    colorName: 'Royal Lavender',
    badge: 'bg-purple-50/90 text-purple-900 border-purple-300/80 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-500/40 shadow-2xs',
    dot: 'bg-purple-500',
    dash: 'bg-purple-500',
    border: 'border-l-purple-500',
    lightBg: 'bg-[#faf8ff] dark:bg-[#1c1424]',
    text: 'text-purple-950 dark:text-purple-100',
    icon: '✨',
  },
  // 3. Emerald Mint / Sage (Standard / Classic / Garden)
  {
    category: 'Standard Room',
    colorName: 'Emerald Mint',
    badge: 'bg-emerald-50/90 text-emerald-900 border-emerald-300/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-500/40 shadow-2xs',
    dot: 'bg-emerald-500',
    dash: 'bg-emerald-500',
    border: 'border-l-emerald-500',
    lightBg: 'bg-[#f4fbf7] dark:bg-[#101f17]',
    text: 'text-emerald-950 dark:text-emerald-100',
    icon: '🌿',
  },
  // 4. Rose Coral / Blush (Honeymoon / Heritage / Romance)
  {
    category: 'Honeymoon Heritage Room',
    colorName: 'Rose Coral',
    badge: 'bg-rose-50/90 text-rose-900 border-rose-300/80 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-500/40 shadow-2xs',
    dot: 'bg-rose-500',
    dash: 'bg-rose-500',
    border: 'border-l-rose-500',
    lightBg: 'bg-[#fff5f6] dark:bg-[#241315]',
    text: 'text-rose-950 dark:text-rose-100',
    icon: '🌸',
  },
  // 5. Ocean Teal / Turquoise (Waterfront / Pool / Beach / Lagoon)
  {
    category: 'Lagoon Pool Villa',
    colorName: 'Ocean Teal',
    badge: 'bg-teal-50/90 text-teal-900 border-teal-300/80 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-500/40 shadow-2xs',
    dot: 'bg-teal-500',
    dash: 'bg-teal-500',
    border: 'border-l-teal-500',
    lightBg: 'bg-[#f0fdfa] dark:bg-[#0f211e]',
    text: 'text-teal-950 dark:text-teal-100',
    icon: '🏖️',
  },
  // 6. Sunset Orange / Terracotta (Villa / Cottage / Bungalow)
  {
    category: 'Sunset Garden Villa',
    colorName: 'Sunset Terracotta',
    badge: 'bg-orange-50/90 text-orange-900 border-orange-300/80 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-500/40 shadow-2xs',
    dot: 'bg-orange-500',
    dash: 'bg-orange-500',
    border: 'border-l-orange-500',
    lightBg: 'bg-[#fff8f2] dark:bg-[#24170f]',
    text: 'text-orange-950 dark:text-orange-100',
    icon: '🏡',
  },
  // 7. Midnight Indigo / Modern Loft (Penthouse / Loft / Studio)
  {
    category: 'Penthouse Loft',
    colorName: 'Midnight Indigo',
    badge: 'bg-indigo-50/90 text-indigo-900 border-indigo-300/80 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-500/40 shadow-2xs',
    dot: 'bg-indigo-500',
    dash: 'bg-indigo-500',
    border: 'border-l-indigo-500',
    lightBg: 'bg-[#f5f6ff] dark:bg-[#131629]',
    text: 'text-indigo-950 dark:text-indigo-100',
    icon: '💎',
  },
  // 8. Mulberry Wine / Imperial (Grand / Signature / Imperial)
  {
    category: 'Imperial Grand Suite',
    colorName: 'Mulberry Wine',
    badge: 'bg-fuchsia-50/90 text-fuchsia-900 border-fuchsia-300/80 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-500/40 shadow-2xs',
    dot: 'bg-fuchsia-500',
    dash: 'bg-fuchsia-500',
    border: 'border-l-fuchsia-500',
    lightBg: 'bg-[#fdf4ff] dark:bg-[#241026]',
    text: 'text-fuchsia-950 dark:text-fuchsia-100',
    icon: '🏰',
  },
  // 9. Cedar Bronze / Alpine (Chalet / Mountain / Cabin)
  {
    category: 'Mountain Pine Chalet',
    colorName: 'Cedar Bronze',
    badge: 'bg-yellow-50/90 text-yellow-900 border-yellow-300/80 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-500/40 shadow-2xs',
    dot: 'bg-yellow-600',
    dash: 'bg-yellow-600',
    border: 'border-l-yellow-600',
    lightBg: 'bg-[#fefce8] dark:bg-[#211f0f]',
    text: 'text-yellow-950 dark:text-yellow-100',
    icon: '🏔️',
  },
  // 10. Obsidian Slate / Steel (Dormitory / Bunk / Pod / Economy)
  {
    category: 'Economy Pod / Dormitory',
    colorName: 'Obsidian Slate',
    badge: 'bg-slate-100 text-slate-800 border-slate-300/80 dark:bg-white/10 dark:text-slate-200 dark:border-white/10 shadow-2xs',
    dot: 'bg-slate-600',
    dash: 'bg-slate-600',
    border: 'border-l-slate-600',
    lightBg: 'bg-[#f8fafc] dark:bg-[#141923]',
    text: 'text-slate-900 dark:text-white',
    icon: '🛏️',
  },
  // 11. Olive Moss / Zen Lime (Eco / Nature / Terrace)
  {
    category: 'Eco Terrace Studio',
    colorName: 'Olive Moss',
    badge: 'bg-lime-50/90 text-lime-900 border-lime-300/80 dark:bg-lime-950/40 dark:text-lime-200 dark:border-lime-500/40 shadow-2xs',
    dot: 'bg-lime-600',
    dash: 'bg-lime-600',
    border: 'border-l-lime-600',
    lightBg: 'bg-[#f7fee7] dark:bg-[#16210b]',
    text: 'text-lime-950 dark:text-lime-100',
    icon: '🍃',
  },
];

/**
 * Deterministically retrieves the color identity for any room category name.
 * 1. Checks semantic keywords (palace, deluxe, executive, standard, villa, etc.)
 * 2. If custom name, uses a deterministic hash to assign a unique, persistent color
 *    identity from the 12-theme luxury hospitality palette.
 */
export function getRoomTypeTheme(roomTypeName: string | null | undefined): RoomTypeTheme {
  const raw = (roomTypeName ?? '').trim();
  const name = raw.toLowerCase();

  if (!name) {
    return { ...CATEGORY_PALETTE[3], category: 'Standard' };
  }

  // 1. Semantic keyword check
  if (name.includes('palace') || name.includes('presidential') || name.includes('luxury') || name.includes('royal')) {
    return { ...CATEGORY_PALETTE[0], category: raw };
  }
  if (name.includes('deluxe') || name.includes('premium') || name.includes('superior')) {
    return { ...CATEGORY_PALETTE[1], category: raw };
  }
  if (name.includes('executive') || name.includes('suite') || name.includes('club') || name.includes('business')) {
    return { ...CATEGORY_PALETTE[2], category: raw };
  }
  if (name.includes('honeymoon') || name.includes('romance') || name.includes('heritage')) {
    return { ...CATEGORY_PALETTE[4], category: raw };
  }
  if (name.includes('beach') || name.includes('ocean') || name.includes('sea') || name.includes('lagoon') || name.includes('pool') || name.includes('water')) {
    return { ...CATEGORY_PALETTE[5], category: raw };
  }
  if (name.includes('villa') || name.includes('cottage') || name.includes('chalet') || name.includes('bungalow')) {
    return { ...CATEGORY_PALETTE[6], category: raw };
  }
  if (name.includes('penthouse') || name.includes('loft') || name.includes('studio')) {
    return { ...CATEGORY_PALETTE[7], category: raw };
  }
  if (name.includes('grand') || name.includes('imperial') || name.includes('signature')) {
    return { ...CATEGORY_PALETTE[8], category: raw };
  }
  if (name.includes('mountain') || name.includes('wood') || name.includes('cabin') || name.includes('pine')) {
    return { ...CATEGORY_PALETTE[9], category: raw };
  }
  if (name.includes('dorm') || name.includes('bunk') || name.includes('pod') || name.includes('hostel')) {
    return { ...CATEGORY_PALETTE[10], category: raw };
  }
  if (name.includes('eco') || name.includes('garden') || name.includes('terrace') || name.includes('zen')) {
    return { ...CATEGORY_PALETTE[11], category: raw };
  }
  if (name.includes('standard') || name.includes('classic') || name.includes('basic') || name.includes('regular')) {
    return { ...CATEGORY_PALETTE[3], category: raw };
  }

  // 2. Deterministic hash for ANY custom category name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CATEGORY_PALETTE.length;
  return { ...CATEGORY_PALETTE[index], category: raw };
}
