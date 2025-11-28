import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getCategoryColor, getCategoryEmoji, getCategoryStyle } from "@/lib/categories";
import type { Post } from "@/pages/Index";

interface FilterSidebarProps {
  categories: string[];
  tags: string[];
  selectedCategory: string | null;
  selectedTags: string[];
  filterUsed: "all" | "used" | "unused";
  onCategoryChange: (category: string | null) => void;
  onTagsChange: (tags: string[]) => void;
  onUsedFilterChange: (filter: "all" | "used" | "unused") => void;
}

export const FilterSidebar = ({
  categories,
  tags,
  selectedCategory,
  selectedTags,
  filterUsed,
  onCategoryChange,
  onTagsChange,
  onUsedFilterChange,
}: FilterSidebarProps) => {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    onCategoryChange(null);
    onTagsChange([]);
    onUsedFilterChange("all");
  };

  const hasActiveFilters = selectedCategory || selectedTags.length > 0 || filterUsed !== "all";

  // Get top 20 tags by usage
  const popularTags = tags.slice(0, 20);

  return (
    <Card className="p-4 sm:p-6 h-fit sticky top-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base sm:text-lg">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="min-h-[36px]">
            Clear All
          </Button>
        )}
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Status</h4>
        <div className="space-y-2">
          {(["all", "unused", "used"] as const).map((status) => (
            <Button
              key={status}
              variant={filterUsed === status ? "default" : "outline"}
              size="sm"
              className="w-full justify-start min-h-[44px]"
              onClick={() => onUsedFilterChange(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Categories */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Categories</h4>
        <div className="space-y-2">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            const categoryStyle = getCategoryStyle(category, isSelected);
            const emoji = getCategoryEmoji(category);

            return (
              <Button
                key={category}
                variant="outline"
                size="sm"
                className="w-full justify-between text-left h-auto py-3 px-3 min-h-[44px]"
                style={isSelected ? {
                  backgroundColor: categoryStyle.backgroundColor,
                  borderColor: categoryStyle.borderColor,
                  color: categoryStyle.color,
                } : {}}
                onClick={() => onCategoryChange(isSelected ? null : category)}
              >
                <span className="flex items-center gap-2 truncate text-xs sm:text-sm">
                  <span>{emoji}</span>
                  <span>{category}</span>
                </span>
                <Badge variant="secondary" className="ml-2">
                  0
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Popular Tags */}
      <div>
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Popular Tags</h4>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer min-h-[32px] px-3 py-1.5 text-xs sm:text-sm hover:bg-accent"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
};
