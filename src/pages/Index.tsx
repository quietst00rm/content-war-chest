import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardStats } from "@/components/content-library/DashboardStats";
import { SearchBar } from "@/components/content-library/SearchBar";
import { FilterSidebar } from "@/components/content-library/FilterSidebar";
import { PostGrid } from "@/components/content-library/PostGrid";
import { AddPostDialog } from "@/components/content-library/AddPostDialog";
import { BulkImportDialog } from "@/components/content-library/BulkImportDialog";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";

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

  // Get unique categories and tags
  const categories = Array.from(new Set(posts.map((p) => p.primary_category))).sort();
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags || []))).sort();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">LinkedIn Content Library</h1>
            <p className="mt-2 text-muted-foreground">
              AI-powered content management for your LinkedIn posts
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowBulkImportDialog(true)} variant="outline" size="lg">
              <Upload className="mr-2 h-5 w-5" />
              Bulk Import
            </Button>
            <Button onClick={() => setShowAddDialog(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Add New Post
            </Button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats posts={posts} />

        {/* Search */}
        <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Main Content Area */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <FilterSidebar
            categories={categories}
            tags={allTags}
            selectedCategory={selectedCategory}
            selectedTags={selectedTags}
            filterUsed={filterUsed}
            onCategoryChange={setSelectedCategory}
            onTagsChange={setSelectedTags}
            onUsedFilterChange={setFilterUsed}
          />

          {/* Posts Grid */}
          <PostGrid posts={posts} isLoading={isLoading} onUpdate={refetch} />
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
