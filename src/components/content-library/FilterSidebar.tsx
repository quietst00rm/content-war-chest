import { Button } from "@/components/ui/button";
import { getCategoryEmoji, getCategoryStyle } from "@/lib/categories";
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
  posts,
  folders,
  selectedFolder,
  selectedCategory,
  filterUsed,
  onFolderChange,
  onCategoryChange,
  onUsedFilterChange,
}: FilterSidebarProps) => {
  // Calculate counts
  const getCategoryCount = (category: string) => 
    posts.filter(p => p.primary_category === category).length;

  const allCount = posts.length;
  const usedCount = posts.filter(p => p.is_used).length;
  const unusedCount = allCount - usedCount;

  return (
    <div className="p-4">
      {/* Status Filter */}
      <div className="mb-6">
        <h4 className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wider">Status</h4>
        <div className="space-y-0.5">
          {(["all", "unused", "used"] as const).map((status) => {
            const count = status === "all" ? allCount : status === "used" ? usedCount : unusedCount;
            const isActive = filterUsed === status;
            const label = status === "all" ? "All Posts" : status === "used" ? "Used" : "Unused";
            return (
              <button
                key={status}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive 
                    ? "bg-primary/20 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-secondary"
                }`}
                onClick={() => onUsedFilterChange(status)}
              >
                <span>{label}</span>
                <span className={`text-xs ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Folders */}
      <div className="mb-6">
        <h4 className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wider">Folders</h4>
        <FolderList
          folders={folders}
          posts={posts}
          selectedFolder={selectedFolder}
          onFolderChange={onFolderChange}
        />
      </div>

      {/* Categories */}
      <div>
        <h4 className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wider">Categories</h4>
        <div className="space-y-0.5">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            const categoryStyle = getCategoryStyle(category, isSelected);
            const emoji = getCategoryEmoji(category);
            const count = getCategoryCount(category);

            return (
              <button
                key={category}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  isSelected 
                    ? "" 
                    : "text-muted-foreground hover:bg-secondary"
                }`}
                style={isSelected ? {
                  backgroundColor: categoryStyle.backgroundColor,
                  color: categoryStyle.color,
                } : {}}
                onClick={() => onCategoryChange(isSelected ? null : category)}
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="text-xs">{emoji}</span>
                  <span className="truncate">{category}</span>
                </span>
                <span className={`text-xs shrink-0 ${isSelected ? "" : "text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};