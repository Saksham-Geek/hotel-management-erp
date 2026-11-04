/**
 * Room Type Theme & Color System (Bundled Notes / Material 3 Inspired)
 * Provides distinctive, accessible, aesthetic color tokens for room categories.
 */

export interface RoomTypeTheme {
  category: string;
  badge: string;       // Pill badge classes
  dot: string;         // Solid dot indicator
  dash: string;        // Bundled Notes signature horizontal accent dash
  border: string;      // Accent border
  lightBg: string;     // Soft pastel card surface
  text: string;        // High contrast category text
  icon: string;        // Category icon
}

export function getRoomTypeTheme(roomTypeName: string | null | undefined): RoomTypeTheme {
  const name = (roomTypeName ?? '').toLowerCase();

  // 1. Presidential Palace Suite / Luxury Suite (Warm Honey / Champagne Gold)
  if (name.includes('palace') || name.includes('presidential') || name.includes('luxury') || name.includes('royal')) {
    return {
      category: 'Presidential Palace Suite',
      badge: 'bg-amber-50/90 text-amber-900 border-amber-300/80 shadow-2xs',
      dot: 'bg-amber-500',
      dash: 'bg-amber-500',
      border: 'border-l-amber-500',
      lightBg: 'bg-[#fffcf4]',
      text: 'text-amber-950',
      icon: '👑',
    };
  }

  // 2. Executive Suite (Soft Lavender / Violet)
  if (name.includes('executive') || name.includes('suite')) {
    return {
      category: 'Executive Suite',
      badge: 'bg-purple-50/90 text-purple-900 border-purple-300/80 shadow-2xs',
      dot: 'bg-purple-500',
      dash: 'bg-purple-500',
      border: 'border-l-purple-500',
      lightBg: 'bg-[#faf8ff]',
      text: 'text-purple-950',
      icon: '✨',
    };
  }

  // 3. Deluxe Room (Soft Sky Blue / Sapphire)
  if (name.includes('deluxe') || name.includes('premium')) {
    return {
      category: 'Deluxe Room',
      badge: 'bg-sky-50/90 text-sky-900 border-sky-300/80 shadow-2xs',
      dot: 'bg-sky-500',
      dash: 'bg-sky-500',
      border: 'border-l-sky-500',
      lightBg: 'bg-[#f4faff]',
      text: 'text-sky-950',
      icon: '🌊',
    };
  }

  // 4. Standard Room / Classic (Soft Warm Mint / Sage or Clean Slate)
  return {
    category: 'Standard Room',
    badge: 'bg-emerald-50/90 text-emerald-900 border-emerald-300/80 shadow-2xs',
    dot: 'bg-emerald-500',
    dash: 'bg-emerald-500',
    border: 'border-l-emerald-500',
    lightBg: 'bg-[#f4fbf7]',
    text: 'text-emerald-950',
    icon: '🌿',
  };
}
