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
import { Plus, Upload, Grid3x3, List, LogOut, User, FolderPlus, CheckSquare, MessageCircle, Compass, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
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
  tags: string[] | null;
  target_audience: string | null;
  summary: string | null;
  character_count: number | null;
  source_section: string | null;
  is_used: boolean | null;
  used_at: string | null;
  usage_count: number | null;
  notes: string | null;
  is_favorite: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
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

  // Fetch user strategy to check if Stage 1 is completed
  const { data: userStrategy } = useQuery({
    queryKey: ["user-strategy", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_strategy")
        .select("stage_1_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isStage1Completed = userStrategy?.stage_1_completed ?? false;

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

      // Filter by used status
      if (filterUsed === 'used') {
        query = query.eq("is_used", true);
      } else if (filterUsed === 'unused') {
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <h1 className="text-xl font-bold gradient-primary-text">
          Own The Noise
        </h1>
        <div className="flex items-center gap-2">
          <Link to="/discovery">
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 relative" aria-label="Discovery Wizard">
              {isStage1Completed ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Compass className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Discovery</span>
              {!isStage1Completed && (
                <Badge variant="secondary" className="ml-1 hidden sm:inline-flex text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">
                  Start Here
                </Badge>
              )}
            </Button>
          </Link>
          <Link to="/engagement">
            <Button variant="ghost" size="sm" className="h-9 gap-1.5" aria-label="Engagement Feed">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Engage</span>
            </Button>
          </Link>
          <ThemeToggle />
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
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - flush left, full height */}
        <aside className="hidden lg:block w-[220px] border-r border-border overflow-y-auto shrink-0">
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
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Search + Actions Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="flex-1 w-full sm:max-w-md">
              <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
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
                <SelectTrigger className="w-[120px] h-9 text-sm" aria-label="Sort posts">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">By Category</SelectItem>
                  <SelectItem value="title">A-Z</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={() => setShowAddDialog(true)} size="sm" className="h-9">
                <Plus className="mr-1 h-4 w-4" />
                New Post
              </Button>
            </div>
          </div>

          {/* Secondary Actions Row */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => setShowAddFolderDialog(true)}
                variant="outline"
                size="sm"
                className="h-8"
              >
                <FolderPlus className="mr-1 h-3 w-3" />
                Folder
              </Button>
              <Button
                onClick={() => setShowBulkImportDialog(true)}
                variant="outline"
                size="sm"
                className="h-8"
              >
                <Upload className="mr-1 h-3 w-3" />
                Import
              </Button>
              <RecategorizeButton onComplete={refetch} />
              <Button
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) {
                    setSelectedPostIds(new Set());
                  }
                }}
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                className="h-8"
              >
                <CheckSquare className="mr-1 h-3 w-3" />
                {selectionMode ? "Done" : "Select"}
              </Button>
            </div>

            {/* Mobile Filter Button */}
            <div className="lg:hidden">
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
          </div>

          {/* Post Count */}
          <p className="text-sm text-muted-foreground mb-4">
            {filteredCount} posts
            {filteredCount !== totalPosts && ` (of ${totalPosts})`}
          </p>

          {/* Posts Grid */}
          <PostGrid 
            posts={sortedPosts} 
            isLoading={isLoading} 
            onUpdate={refetch} 
            viewMode={viewMode}
            selectionMode={selectionMode}
            selectedPostIds={selectedPostIds}
            onToggleSelection={handleToggleSelection}
            folders={folders}
          />
        </main>
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
      <Toaster />
    </div>
  );
};

export default Index;