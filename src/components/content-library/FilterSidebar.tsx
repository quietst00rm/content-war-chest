import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getCategoryColor, getCategoryEmoji, getCategoryStyle } from "@/lib/categories";
import { FolderList } from "./FolderList";
import type { Post } from "@/pages/Index";

interface FilterSidebarProps {
  categories: string[];
  tags: string[];
  posts: Post[];
  folders: Array<{ id: string; name: string; color: string }>;
  selectedFolder: string | null;
  selectedCategory: string | null;
  selectedTags: string[];
  filterUsed: "all" | "used" | "unused";
  onFolderChange: (folderId: string | null) => void;
  onCategoryChange: (category: string | null) => void;
  onTagsChange: (tags: string[]) => void;
  onUsedFilterChange: (filter: "all" | "used" | "unused") => void;
}

export const FilterSidebar = ({
  categories,
  tags,
  posts,
  folders,
  selectedFolder,
  selectedCategory,
  selectedTags,
  filterUsed,
  onFolderChange,
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
    onFolderChange(null);
    onCategoryChange(null);
    onTagsChange([]);
    onUsedFilterChange("all");
  };

  const hasActiveFilters = selectedFolder || selectedCategory || selectedTags.length > 0 || filterUsed !== "all";

  // Calculate counts
  const getCategoryCount = (category: string) => 
    posts.filter(p => p.primary_category === category).length;

  const allCount = posts.length;
  const usedCount = posts.filter(p => p.is_used).length;
  const unusedCount = allCount - usedCount;

  // Get top 20 tags by usage frequency
  const tagCounts = posts.flatMap(p => p.tags || [])
    .reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const popularTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag]) => tag);

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
          {(["all", "unused", "used"] as const).map((status) => {
            const count = status === "all" ? allCount : status === "used" ? usedCount : unusedCount;
            return (
              <Button
                key={status}
                variant={filterUsed === status ? "default" : "outline"}
                size="sm"
                className="w-full justify-between min-h-[44px]"
                onClick={() => onUsedFilterChange(status)}
              >
                <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Folders */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Folders</h4>
        <FolderList
          folders={folders}
          posts={posts}
          selectedFolder={selectedFolder}
          onFolderChange={onFolderChange}
        />
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
            const count = getCategoryCount(category);

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
                  {count}
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
