import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

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
        <h4 className="text-sm font-medium mb-3">Status</h4>
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
        <h4 className="text-sm font-medium mb-3">Categories</h4>
        <div className="space-y-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              className="w-full justify-start text-left h-auto py-3 px-3 min-h-[44px]"
              onClick={() => onCategoryChange(selectedCategory === category ? null : category)}
            >
              <span className="truncate text-xs sm:text-sm">{category}</span>
            </Button>
          ))}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Tags */}
      <div>
        <h4 className="text-sm font-medium mb-3">Tags</h4>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer min-h-[32px] px-3 py-1.5 text-xs sm:text-sm"
              onClick={() => toggleTag(tag)}
            >
              {tag}
              {selectedTags.includes(tag) && <X className="ml-1 h-3 w-3" />}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
};
