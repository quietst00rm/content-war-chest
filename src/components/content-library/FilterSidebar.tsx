import { Button } from "@/components/ui/button";
import { getCategoryEmoji, getCategoryStyle } from "@/lib/categories";
import { FolderList } from "./FolderList";
import type { Post, PostStatus } from "@/pages/Index";

const STATUS_OPTIONS: { value: PostStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Posts', color: '' },
  { value: 'idea', label: 'Ideas', color: 'text-purple-500' },
  { value: 'draft', label: 'Drafts', color: 'text-gray-500' },
  { value: 'ready', label: 'Ready', color: 'text-green-500' },
  { value: 'scheduled', label: 'Scheduled', color: 'text-blue-500' },
  { value: 'used', label: 'Used', color: 'text-orange-500' },
  { value: 'archived', label: 'Archived', color: 'text-red-500' },
];

interface FilterSidebarProps {
  categories: string[];
  tags: string[];
  posts: Post[];
  folders: Array<{ id: string; name: string; color: string }>;
  selectedFolder: string | null;
  selectedCategory: string | null;
  selectedTags: string[];
  filterUsed: "all" | "used" | "unused";
  filterStatus?: PostStatus | 'all';
  onFolderChange: (folderId: string | null) => void;
  onCategoryChange: (category: string | null) => void;
  onTagsChange: (tags: string[]) => void;
  onUsedFilterChange: (filter: "all" | "used" | "unused") => void;
  onStatusFilterChange?: (status: PostStatus | 'all') => void;
}

export const FilterSidebar = ({
  categories,
  posts,
  folders,
  selectedFolder,
  selectedCategory,
  filterUsed,
  filterStatus = 'all',
  onFolderChange,
  onCategoryChange,
  onUsedFilterChange,
  onStatusFilterChange,
}: FilterSidebarProps) => {
  // Calculate counts
  const getCategoryCount = (category: string) =>
    posts.filter(p => p.primary_category === category).length;

  const getStatusCount = (status: PostStatus | 'all') => {
    if (status === 'all') return posts.length;
    return posts.filter(p => (p.status || 'draft') === status).length;
  };

  return (
    <div className="p-4">
      {/* Status Filter */}
      <div className="mb-6">
        <h4 className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wider">Status</h4>
        <div className="space-y-0.5">
          {STATUS_OPTIONS.map((option) => {
            const count = getStatusCount(option.value);
            const isActive = filterStatus === option.value;
            return (
              <button
                key={option.value}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
                onClick={() => onStatusFilterChange?.(option.value)}
              >
                <span className={isActive ? '' : option.color}>{option.label}</span>
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