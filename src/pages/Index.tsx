import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchBar } from "@/components/content-library/SearchBar";
import { FilterSidebar } from "@/components/content-library/FilterSidebar";
import { MobileFilterSheet } from "@/components/content-library/MobileFilterSheet";
import { PostGrid } from "@/components/content-library/PostGrid";
import { AddPostDialog } from "@/components/content-library/AddPostDialog";
import { BulkImportDialog } from "@/components/content-library/BulkImportDialog";
import { RecategorizeButton } from "@/components/content-library/RecategorizeButton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Grid3x3, List } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CATEGORIES } from "@/lib/categories";

export interface Post {
  id: string;
  title: string;
  content: string;
  formatted_content: string;
  primary_category: string;
  subcategory: string | null;
  tags: string[];
  target_audience: string | null;
  summary: string | null;
  character_count: number | null;
  source_section: string | null;
  is_used: boolean;
  used_at: string | null;
  usage_count: number;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterUsed, setFilterUsed] = useState<"all" | "used" | "unused">("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"category" | "title">("category");

  // Fetch all posts for sidebar counts
  const { data: allPosts = [] } = useQuery({
    queryKey: ["all-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Post[];
    },
  });

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ["posts", searchQuery, selectedCategory, selectedTags, filterUsed],
    queryFn: async () => {
      let query = supabase.from("posts").select("*").order("created_at", { ascending: false });

      // Apply filters
      if (searchQuery) {
        query = query.or(
          `title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,summary.ilike.%${searchQuery}%`
        );
      }

      if (selectedCategory) {
        query = query.eq("primary_category", selectedCategory);
      }

      if (selectedTags.length > 0) {
        query = query.overlaps("tags", selectedTags);
      }

      if (filterUsed === "used") {
        query = query.eq("is_used", true);
      } else if (filterUsed === "unused") {
        query = query.eq("is_used", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Post[];
    },
  });

  // Get unique categories and tags from ALL posts
  const categories = CATEGORIES.map((c) => c.name);
  const allTags = Array.from(new Set(allPosts.flatMap((p) => p.tags || []))).sort();

  // Calculate stats from all posts
  const totalPosts = allPosts.length;
  const usedPosts = allPosts.filter((p) => p.is_used).length;
  const unusedPosts = totalPosts - usedPosts;
  const filteredCount = posts.length;

  // Apply sorting
  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === "category") {
      return a.primary_category.localeCompare(b.primary_category);
    } else {
      return a.title.localeCompare(b.title);
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1">
                LinkedIn Content Library
              </h1>
              <p className="text-sm text-muted-foreground">
                {totalPosts} posts • {usedPosts} used • {unusedPosts} ready to publish • {filteredCount} showing
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <RecategorizeButton onComplete={refetch} />
              
              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={(value: "category" | "title") => setSortBy(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">By Category</SelectItem>
                  <SelectItem value="title">By Title (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="px-3"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <ThemeToggle />
              
              <Button
                onClick={() => setShowBulkImportDialog(true)}
                variant="outline"
                size="default"
                className="hidden sm:flex"
              >
                <Upload className="mr-2 h-5 w-5" />
                Bulk Import
              </Button>
              <Button
                onClick={() => setShowBulkImportDialog(true)}
                variant="outline"
                size="icon"
                className="sm:hidden min-h-[44px] min-w-[44px]"
              >
                <Upload className="h-5 w-5" />
              </Button>
              
              <Button onClick={() => setShowAddDialog(true)} size="default" className="hidden sm:flex">
                <Plus className="mr-2 h-5 w-5" />
                Add New Post
              </Button>
              <Button
                onClick={() => setShowAddDialog(true)}
                size="icon"
                className="sm:hidden min-h-[44px] min-w-[44px]"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Mobile Filter Button */}
        <div className="mt-4 lg:hidden">
          <MobileFilterSheet
            categories={categories}
            tags={allTags}
            posts={allPosts}
            selectedCategory={selectedCategory}
            selectedTags={selectedTags}
            filterUsed={filterUsed}
            onCategoryChange={setSelectedCategory}
            onTagsChange={setSelectedTags}
            onUsedFilterChange={setFilterUsed}
          />
        </div>

        {/* Main Content Area */}
        <div className="mt-6 sm:mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <FilterSidebar
              categories={categories}
              tags={allTags}
              posts={allPosts}
              selectedCategory={selectedCategory}
              selectedTags={selectedTags}
              filterUsed={filterUsed}
              onCategoryChange={setSelectedCategory}
              onTagsChange={setSelectedTags}
              onUsedFilterChange={setFilterUsed}
            />
          </div>

          {/* Posts Grid */}
          <PostGrid posts={sortedPosts} isLoading={isLoading} onUpdate={refetch} viewMode={viewMode} />
        </div>

        {/* Add Post Dialog */}
        <AddPostDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={refetch} />

        {/* Bulk Import Dialog */}
        <BulkImportDialog
          open={showBulkImportDialog}
          onOpenChange={setShowBulkImportDialog}
          onSuccess={refetch}
        />
      </div>
      <Toaster />
    </div>
  );
};

export default Index;
