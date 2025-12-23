import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { Navigation, MobileBottomNav } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentCard } from "@/components/content/ContentCard";
import { AddPostModal } from "@/components/content/AddPostModal";
import { FolderList } from "@/components/content/FolderList";
import { PillarCategoryList } from "@/components/content/PillarCategoryList";
import { Plus, Search, Grid3x3, List, Loader2, FileText, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContentPost {
  id: string;
  user_id: string;
  content: string;
  status: "draft" | "ready" | "posted";
  folder_id: string | null;
  pillar_category: string | null;
  tags: string[] | null;
  notes: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface PillarCategory {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
}

const Content = () => {
  const { currentUser } = useUser();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch posts for current user
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["content-posts", currentUser.id, searchQuery, selectedStatus, selectedFolder, selectedPillar],
    queryFn: async () => {
      let query = supabase
        .from("posts_new")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("updated_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("content", `%${searchQuery}%`);
      }

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }

      if (selectedFolder === "unfiled") {
        query = query.is("folder_id", null);
      } else if (selectedFolder) {
        query = query.eq("folder_id", selectedFolder);
      }

      if (selectedPillar) {
        query = query.eq("pillar_category", selectedPillar);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContentPost[];
    },
  });

  // Fetch folders for current user
  const { data: folders = [] } = useQuery({
    queryKey: ["folders", currentUser.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folders_new")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Folder[];
    },
  });

  // Fetch pillar categories for current user
  const { data: pillarCategories = [] } = useQuery({
    queryKey: ["pillar-categories", currentUser.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pillar_categories")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as PillarCategory[];
    },
  });

  // Stats
  const totalPosts = posts.length;
  const draftCount = posts.filter((p) => p.status === "draft").length;
  const readyCount = posts.filter((p) => p.status === "ready").length;
  const postedCount = posts.filter((p) => p.status === "posted").length;

  const handleRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ["content-posts"] });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
    queryClient.invalidateQueries({ queryKey: ["pillar-categories"] });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16 md:pb-0">
      <Navigation />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop only */}
        <aside className="hidden lg:flex w-64 border-r border-border flex-col overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Status Filters */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedStatus("all")}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between",
                    selectedStatus === "all"
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span>All Posts</span>
                  <Badge variant="secondary">{totalPosts}</Badge>
                </button>
                <button
                  onClick={() => setSelectedStatus("draft")}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between",
                    selectedStatus === "draft"
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span>Drafts</span>
                  <Badge variant="secondary">{draftCount}</Badge>
                </button>
                <button
                  onClick={() => setSelectedStatus("ready")}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between",
                    selectedStatus === "ready"
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span>Ready</span>
                  <Badge variant="secondary">{readyCount}</Badge>
                </button>
                <button
                  onClick={() => setSelectedStatus("posted")}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between",
                    selectedStatus === "posted"
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span>Posted</span>
                  <Badge variant="secondary">{postedCount}</Badge>
                </button>
              </div>
            </div>

            {/* Folders */}
            <FolderList
              folders={folders}
              selectedFolder={selectedFolder}
              onSelectFolder={setSelectedFolder}
              onRefetch={handleRefetch}
            />

            {/* Pillar Categories */}
            <PillarCategoryList
              categories={pillarCategories}
              selectedCategory={selectedPillar}
              onSelectCategory={setSelectedPillar}
              onRefetch={handleRefetch}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts..."
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center gap-0.5 p-1 bg-muted/50 rounded-lg border border-border">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile Status Filter */}
              <div className="lg:hidden">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Drafts</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Post
              </Button>
            </div>
          </div>

          {/* Post Count */}
          <p className="text-sm text-muted-foreground mb-4">
            {posts.length} post{posts.length !== 1 ? "s" : ""}
          </p>

          {/* Posts Grid/List */}
          {postsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No posts yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Add your first post to build your content library.
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Post
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-3"
              )}
            >
              {posts.map((post) => (
                <ContentCard
                  key={post.id}
                  post={post}
                  viewMode={viewMode}
                  folders={folders}
                  pillarCategories={pillarCategories}
                  onRefetch={handleRefetch}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Add Post Modal */}
      <AddPostModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        folders={folders}
        pillarCategories={pillarCategories}
        onSuccess={handleRefetch}
      />

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
    </div>
  );
};

export default Content;
