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
      <div className="container mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-2">
            <div>
              {/* Main heading with premium SaaS typography - authoritative and strategic */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
                <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 bg-clip-text text-transparent drop-shadow-sm">
                  Content War Chest
                </span>
              </h1>
              {/* Subtitle with post statistics - visually subordinate to main heading */}
              <p className="text-sm text-muted-foreground tracking-wide">
                {totalPosts} posts • {usedPosts} used • {unusedPosts} ready to publish • {filteredCount} showing
              </p>
            </div>
            {/*
              Header action buttons with proper spacing to prevent icon overlap.
              Using gap-3 (12px) for consistent spacing between all elements.
              Each icon/button has minimum 44x44px hit targets for accessibility.
              Flex-wrap ensures proper stacking on smaller screens.
            */}
            <div className="flex gap-3 items-center flex-wrap">
              <RecategorizeButton onComplete={refetch} />

              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={(value: "category" | "title") => setSortBy(value)}>
                <SelectTrigger className="w-[140px] min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">By Category</SelectItem>
                  <SelectItem value="title">By Title (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle - grouped buttons with internal gap-1 for visual cohesion */}
              <div className="flex gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="px-3 min-h-[36px] min-w-[36px]"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="px-3 min-h-[36px] min-w-[36px]"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Theme toggle with proper isolation from surrounding elements */}
              <ThemeToggle />

              {/* User Menu with proper hit target sizing */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px]">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Select Posts button */}
              <Button
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) {
                    setSelectedPostIds(new Set());
                  }
                }}
                variant={selectionMode ? "default" : "outline"}
                size="default"
                className="hidden sm:flex min-h-[44px]"
              >
                <CheckSquare className="mr-2 h-5 w-5" />
                {selectionMode ? "Done" : "Select Posts"}
              </Button>
              <Button
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) {
                    setSelectedPostIds(new Set());
                  }
                }}
                variant={selectionMode ? "default" : "outline"}
                size="icon"
                className="sm:hidden min-h-[44px] min-w-[44px]"
              >
                <CheckSquare className="h-5 w-5" />
              </Button>

              {/* Add New Folder button */}
              <Button
                onClick={() => setShowAddFolderDialog(true)}
                variant="outline"
                size="default"
                className="hidden sm:flex min-h-[44px]"
              >
                <FolderPlus className="mr-2 h-5 w-5" />
                Add New Folder
              </Button>
              <Button
                onClick={() => setShowAddFolderDialog(true)}
                variant="outline"
                size="icon"
                className="sm:hidden min-h-[44px] min-w-[44px]"
              >
                <FolderPlus className="h-5 w-5" />
              </Button>

              {/* Bulk Import button - desktop version with text, mobile version icon-only */}
              <Button
                onClick={() => setShowBulkImportDialog(true)}
                variant="outline"
                size="default"
                className="hidden sm:flex min-h-[44px]"
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

              {/* Add New Post button - desktop version with text, mobile version icon-only */}
              <Button onClick={() => setShowAddDialog(true)} size="default" className="hidden sm:flex min-h-[44px]">
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
