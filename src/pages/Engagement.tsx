import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EngagementPostCard, EngagementPost } from "@/components/engagement/EngagementPostCard";
import { ManageProfilesDialog } from "@/components/engagement/ManageProfilesDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  RefreshCw,
  Users,
  User,
  LogOut,
  ArrowLeft,
  Loader2,
  Inbox,
  CheckCircle,
  Filter,
} from "lucide-react";
import { Link } from "react-router-dom";

type FilterTab = "all" | "pending" | "done";

const Engagement = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [showManageProfiles, setShowManageProfiles] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("pending");
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  // Fetch engagement posts
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["engagement-posts", filterTab, selectedProfile],
    queryFn: async () => {
      let query = supabase
        .from("engagement_posts")
        .select("*")
        .eq("is_hidden", false)
        .order("days_ago", { ascending: true })
        .order("fetched_at", { ascending: false });

      if (filterTab === "pending") {
        query = query.eq("is_commented", false);
      } else if (filterTab === "done") {
        query = query.eq("is_commented", true);
      }

      if (selectedProfile) {
        query = query.eq("profile_id", selectedProfile);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EngagementPost[];
    },
  });

  // Fetch followed profiles for filter
  const { data: profiles = [] } = useQuery({
    queryKey: ["followed-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("followed_profiles")
        .select("id, name, linkedin_url")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch posts mutation
  const fetchPostsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-engagement-posts", {
        body: { max_posts_per_profile: 1 },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["engagement-posts"] });
      queryClient.invalidateQueries({ queryKey: ["followed-profiles"] });
      toast.success(`Fetched ${data.posts_saved} new posts from ${data.profiles_processed} profiles`);
    },
    onError: (error: Error) => {
      console.error("Fetch error:", error);
      toast.error(error.message || "Failed to fetch posts");
    },
  });

  // Count stats
  const pendingCount = posts.filter(p => !p.is_commented).length;
  const doneCount = posts.filter(p => p.is_commented).length;

  // Extract username from LinkedIn URL
  const extractUsername = (url: string): string => {
    const match = url.match(/linkedin\.com\/(?:in|company)\/([^/?]+)/);
    return match ? match[1] : url;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Sticky on mobile */}
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Engagement Feed</h1>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
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

      {/* Action Bar - Sticky below header */}
      <div className="sticky top-14 z-40 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Primary Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => fetchPostsMutation.mutate()}
              disabled={fetchPostsMutation.isPending}
              className="flex-1 sm:flex-initial"
            >
              {fetchPostsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Fetch Posts
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowManageProfiles(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              Profiles
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <Tabs
              value={filterTab}
              onValueChange={(v) => setFilterTab(v as FilterTab)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                <TabsTrigger value="pending" className="gap-1">
                  <Inbox className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pending</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {pendingCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="done" className="gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Done</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {doneCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-1">
                  All
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Profile Filter */}
            {profiles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setSelectedProfile(null)}>
                    All Profiles
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {profiles.map((profile) => (
                    <DropdownMenuItem
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile.id)}
                      className={selectedProfile === profile.id ? "bg-accent" : ""}
                    >
                      {profile.name || extractUsername(profile.linkedin_url)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4">
        {postsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No posts yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {profiles.length === 0
                ? "Add some LinkedIn profiles to follow, then fetch their posts."
                : "Click 'Fetch Posts' to get the latest posts from your followed profiles."}
            </p>
            {profiles.length === 0 && (
              <Button onClick={() => setShowManageProfiles(true)}>
                <Users className="h-4 w-4 mr-2" />
                Add Profiles
              </Button>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {posts.map((post) => (
              <EngagementPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      {/* Manage Profiles Dialog */}
      <ManageProfilesDialog
        open={showManageProfiles}
        onOpenChange={setShowManageProfiles}
      />
    </div>
  );
};

export default Engagement;
