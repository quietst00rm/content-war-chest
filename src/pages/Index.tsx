import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SearchBar } from "@/components/content-library/SearchBar";
import { FilterSidebar } from "@/components/content-library/FilterSidebar";
import { MobileFilterSheet } from "@/components/content-library/MobileFilterSheet";
import { PostGrid } from "@/components/content-library/PostGrid";
import { AddPostDialog } from "@/components/content-library/AddPostDialog";
import { BulkImportDialog } from "@/components/content-library/BulkImportDialog";
import { RecategorizeButton } from "@/components/content-library/RecategorizeButton";
import { AddFolderDialog } from "@/components/content-library/AddFolderDialog";
import { BulkActionsBar } from "@/components/content-library/BulkActionsBar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, Upload, Grid3x3, List, LogOut, User, FolderPlus, CheckSquare } from "lucide-react";
import { toast } from "sonner";
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
  user_id: string | null;
  folder_id: string | null;
}

const Index = () => {
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterUsed, setFilterUsed] = useState<"all" | "used" | "unused">("all");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [showAddFolderDialog, setShowAddFolderDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"category" | "title">("category");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());

  // Fetch folders
  const { data: folders = [], refetch: refetchFolders } = useQuery({
    queryKey: ["folders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; name: string; color: string }>;
    },
  });

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
    queryKey: ["posts", searchQuery, selectedCategory, selectedTags, filterUsed, selectedFolder],
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

      if (selectedFolder === "unfiled") {
        query = query.is("folder_id", null);
      } else if (selectedFolder) {
        query = query.eq("folder_id", selectedFolder);
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

  // Bulk action handlers
  const handleSelectAll = () => {
    setSelectedPostIds(new Set(sortedPosts.map((p) => p.id)));
  };

  const handleUnselectAll = () => {
    setSelectedPostIds(new Set());
  };

  const handleToggleSelection = (postId: string) => {
    const newSelection = new Set(selectedPostIds);
    if (newSelection.has(postId)) {
      newSelection.delete(postId);
    } else {
      newSelection.add(postId);
    }
    setSelectedPostIds(newSelection);
  };

  const handleBulkDelete = async () => {
    if (selectedPostIds.size === 0) return;
    
    if (!confirm(`Delete ${selectedPostIds.size} post(s)? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .in("id", Array.from(selectedPostIds));

      if (error) throw error;

      toast.success(`${selectedPostIds.size} post(s) deleted`);
      setSelectedPostIds(new Set());
      setSelectionMode(false);
      refetch();
    } catch (error) {
      console.error("Error deleting posts:", error);
      toast.error("Failed to delete posts");
    }
  };

  const handleBulkMarkAsUsed = async () => {
    if (selectedPostIds.size === 0) return;

    try {
      const { error } = await supabase
        .from("posts")
        .update({ is_used: true, used_at: new Date().toISOString() })
        .in("id", Array.from(selectedPostIds));

      if (error) throw error;

      toast.success(`${selectedPostIds.size} post(s) marked as used`);
      setSelectedPostIds(new Set());
      setSelectionMode(false);
      refetch();
    } catch (error) {
      console.error("Error marking posts as used:", error);
      toast.error("Failed to mark posts as used");
    }
  };

  const handleBulkAutoFormat = async () => {
    if (selectedPostIds.size === 0) return;

    toast.info(`Formatting ${selectedPostIds.size} post(s)...`);

    try {
      const selectedPosts = sortedPosts.filter((p) => selectedPostIds.has(p.id));
      let successCount = 0;
      let failCount = 0;

      for (const post of selectedPosts) {
        try {
          const { data, error } = await supabase.functions.invoke("format-post", {
            body: { postId: post.id },
          });

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Error formatting post ${post.id}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} post(s) formatted successfully`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} post(s) failed to format`);
      }

      setSelectedPostIds(new Set());
      setSelectionMode(false);
      refetch();
    } catch (error) {
      console.error("Error in bulk auto-format:", error);
      toast.error("Failed to format posts");
    }
  };

  const handleBulkMoveToFolder = async (folderId: string | null) => {
    if (selectedPostIds.size === 0) return;

    try {
      const { error } = await supabase
        .from("posts")
        .update({ folder_id: folderId })
        .in("id", Array.from(selectedPostIds));

      if (error) throw error;

      const message = folderId 
        ? `${selectedPostIds.size} post(s) moved to folder`
        : `${selectedPostIds.size} post(s) removed from folder`;
      
      toast.success(message);
      setSelectedPostIds(new Set());
      setSelectionMode(false);
      refetch();
    } catch (error) {
      console.error("Error moving posts to folder:", error);
      toast.error("Failed to move posts");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 max-w-screen-2xl">
        {/* Professional Navigation Header */}
        <header className="mb-8 border-b border-border pb-6">
          {/* Top Bar: Title + Utility Controls */}
          <div className="flex items-start justify-between mb-6">
            {/* Left: Brand & Stats */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 bg-clip-text text-transparent">
                Content War Chest
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                {totalPosts} posts • {usedPosts} used • {unusedPosts} ready • {filteredCount} showing
              </p>
            </div>

            {/* Right: Utility Controls (Settings Area) */}
            <div className="flex items-center gap-2 ml-4">
              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center gap-0.5 p-1 bg-muted/50 rounded-lg border border-border">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                  aria-label="Grid view"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 p-0"
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={(value: "category" | "title") => setSortBy(value)}>
                <SelectTrigger className="w-[130px] h-9 text-sm hidden sm:flex" aria-label="Sort posts">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">By Category</SelectItem>
                  <SelectItem value="title">A-Z</SelectItem>
                </SelectContent>
              </Select>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="User menu">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Action Bar: Primary Actions + Contextual Tools */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Left: Primary Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={() => setShowAddDialog(true)} size="default" className="h-10 font-medium shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Button>
              <Button
                onClick={() => setShowAddFolderDialog(true)}
                variant="outline"
                size="default"
                className="h-10 font-medium"
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
              <Button
                onClick={() => setShowBulkImportDialog(true)}
                variant="outline"
                size="default"
                className="h-10 font-medium"
              >
                <Upload className="mr-2 h-4 w-4" />
                Bulk Import
              </Button>
            </div>

            {/* Right: Contextual Tools */}
            <div className="flex items-center gap-2 flex-wrap">
              <RecategorizeButton onComplete={refetch} />
              <Button
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) {
                    setSelectedPostIds(new Set());
                  }
                }}
                variant={selectionMode ? "default" : "outline"}
                size="default"
                className="h-10 font-medium"
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                {selectionMode ? "Done Selecting" : "Select Posts"}
              </Button>
            </div>
          </div>
        </header>

        {/* Search */}
        <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Mobile Filter Button */}
        <div className="mt-4 lg:hidden">
          <MobileFilterSheet
            categories={categories}
            tags={allTags}
            posts={allPosts}
            folders={folders}
            selectedFolder={selectedFolder}
            selectedCategory={selectedCategory}
            selectedTags={selectedTags}
            filterUsed={filterUsed}
            onFolderChange={setSelectedFolder}
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
              folders={folders}
              selectedFolder={selectedFolder}
              selectedCategory={selectedCategory}
              selectedTags={selectedTags}
              filterUsed={filterUsed}
              onFolderChange={setSelectedFolder}
              onCategoryChange={setSelectedCategory}
              onTagsChange={setSelectedTags}
              onUsedFilterChange={setFilterUsed}
            />
          </div>

          {/* Posts Grid */}
          <PostGrid 
            posts={sortedPosts} 
            isLoading={isLoading} 
            onUpdate={refetch} 
            viewMode={viewMode}
            selectionMode={selectionMode}
            selectedPostIds={selectedPostIds}
            onToggleSelection={handleToggleSelection}
          />
        </div>

        {/* Add Post Dialog */}
        <AddPostDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={refetch} />

        {/* Bulk Import Dialog */}
        <BulkImportDialog
          open={showBulkImportDialog}
          onOpenChange={setShowBulkImportDialog}
          onSuccess={refetch}
        />

        {/* Add Folder Dialog */}
        <AddFolderDialog
          open={showAddFolderDialog}
          onOpenChange={setShowAddFolderDialog}
          onFolderAdded={() => {
            refetchFolders();
            refetch();
          }}
        />

        {/* Bulk Actions Bar */}
        {selectionMode && (
          <BulkActionsBar
            selectedCount={selectedPostIds.size}
            totalCount={sortedPosts.length}
            onSelectAll={handleSelectAll}
            onUnselectAll={handleUnselectAll}
            onDelete={handleBulkDelete}
            onMarkAsUsed={handleBulkMarkAsUsed}
            onAutoFormat={handleBulkAutoFormat}
            onMoveToFolder={handleBulkMoveToFolder}
            folders={folders}
          />
        )}
      </div>
      <Toaster />
    </div>
  );
};

export default Index;
