// Dark-mode optimized category colors (slightly desaturated for dark backgrounds)
export const CATEGORIES = [
  { name: "Account Health", color: "#ef5350", emoji: "🛡️" },
  { name: "Writing & Appeals", color: "#ff7043", emoji: "✍️" },
  { name: "Amazon Ecosystem", color: "#42a5f5", emoji: "🏛️" },
  { name: "Competition & Attacks", color: "#ab7bff", emoji: "⚔️" },
  { name: "Documentation & Compliance", color: "#4ade80", emoji: "📋" },
  { name: "Product Strategy", color: "#22d3ee", emoji: "📦" },
  { name: "Operations & Logistics", color: "#818cf8", emoji: "🚚" },
  { name: "Reviews & Feedback", color: "#f472b6", emoji: "⭐" },
  { name: "Business Models", color: "#a3e635", emoji: "💼" },
  { name: "Mindset & Strategy", color: "#c084fc", emoji: "🧠" },
  { name: "Personal Story", color: "#fbbf24", emoji: "📖" },
  { name: "Buyer Behavior", color: "#a5b4fc", emoji: "🛒" },
] as const;

export type CategoryName = typeof CATEGORIES[number]["name"];

export function getCategoryColor(categoryName: string): string {
  const category = CATEGORIES.find((c) => c.name === categoryName);
  return category?.color || "#6b7280";
}

export function getCategoryEmoji(categoryName: string): string {
  const category = CATEGORIES.find((c) => c.name === categoryName);
  return category?.emoji || "📄";
}

export function getCategoryStyle(categoryName: string, selected: boolean = false) {
  const color = getCategoryColor(categoryName);
  
  if (selected) {
    return {
      backgroundColor: `${color}33`, // 20% opacity
      borderColor: color,
      color: color,
    };
  }
  
  return {
    backgroundColor: `${color}26`, // 15% opacity
    color: color,
  };
}
