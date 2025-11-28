export const CATEGORIES = [
  { name: "Account Health", color: "#dc2626", emoji: "🛡️" },
  { name: "Writing & Appeals", color: "#ea580c", emoji: "✍️" },
  { name: "Amazon Ecosystem", color: "#0284c7", emoji: "🏛️" },
  { name: "Competition & Attacks", color: "#7c3aed", emoji: "⚔️" },
  { name: "Documentation & Compliance", color: "#059669", emoji: "📋" },
  { name: "Product Strategy", color: "#0891b2", emoji: "📦" },
  { name: "Operations & Logistics", color: "#4f46e5", emoji: "🚚" },
  { name: "Reviews & Feedback", color: "#be185d", emoji: "⭐" },
  { name: "Business Models", color: "#65a30d", emoji: "💼" },
  { name: "Mindset & Strategy", color: "#a855f7", emoji: "🧠" },
  { name: "Personal Story", color: "#f59e0b", emoji: "📖" },
  { name: "Buyer Behavior", color: "#6366f1", emoji: "🛒" },
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
