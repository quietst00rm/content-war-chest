import { FilterSidebar } from "./FilterSidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MobileFilterSheetProps {
  categories: string[];
  tags: string[];
  posts: any[];
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

export const MobileFilterSheet = ({
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
}: MobileFilterSheetProps) => {
  const activeFilterCount =
    (selectedFolder ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    selectedTags.length +
    (filterUsed !== "all" ? 1 : 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full justify-between min-h-[44px]">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </span>
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <FilterSidebar
            categories={categories}
            tags={tags}
            posts={posts}
            folders={folders}
            selectedFolder={selectedFolder}
            selectedCategory={selectedCategory}
            selectedTags={selectedTags}
            filterUsed={filterUsed}
            onFolderChange={onFolderChange}
            onCategoryChange={onCategoryChange}
            onTagsChange={onTagsChange}
            onUsedFilterChange={onUsedFilterChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};