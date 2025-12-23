import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { Navigation, MobileBottomNav } from "@/components/Navigation";
import { EngagementPostCard } from "@/components/engagement/EngagementPostCard";
import { ManageProfilesDialog } from "@/components/engagement/ManageProfilesDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { RefreshCw, Users, Loader2, Inbox, Clock, CheckCircle } from "lucide-react";

export interface TargetProfile {
  id: string;
  linkedin_url: string;
  name: string | null;
  title: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_fetched_at: string | null;
  created_at: string;
}

export interface EngagementPost {
  id: string;
  target_profile_id: string;
  linkedin_post_url: string;
  content: string;
  posted_at: string | null;
  fetched_at: string;
  is_expired: boolean;
  created_at: string;
  // Joined data
  author_name?: string | null;
  author_title?: string | null;
  author_avatar?: string | null;
  author_linkedin_url?: string | null;
}

export interface CommentOption {
  id: string;
  engagement_post_id: string;
  option_number: number;
  comment_text: string;
  approach_type: "specific_detail" | "hidden_dynamic" | "practical_implication";
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
}

type FilterTab = "active" | "expired";

const Engagement = () => {
  const { currentUser } = useUser();
  const queryClient = useQueryClient();
  const [showManageProfiles, setShowManageProfiles] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("active");

  // Fetch engagement posts from the view
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["engagement-posts", filterTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engagement_posts_with_profile")
        .select("*")
        .eq("is_expired", filterTab === "expired")
        .order("posted_at", { ascending: false });

      if (error) throw error;
      return data as EngagementPost[];
    },
  });

  // Fetch target profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ["target-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("target_profiles")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as TargetProfile[];
    },
  });

  // Fetch posts mutation
  const fetchPostsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "fetch-engagement-posts",
        {
          body: { max_posts_per_profile: 1 },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["engagement-posts"] });
      queryClient.invalidateQueries({ queryKey: ["target-profiles"] });
      toast.success(
        `Fetched ${data.posts_saved || 0} new posts from ${data.profiles_processed || 0} profiles`
      );
    },
    onError: (error: Error) => {
      console.error("Fetch error:", error);
      toast.error(error.message || "Failed to fetch posts");
    },
  });

  // Count stats
  const activeCount = posts.filter((p) => !p.is_expired).length;
  const expiredCount = posts.filter((p) => p.is_expired).length;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16 md:pb-0">
      <Navigation />

      {/* Action Bar - Sticky below header */}
      <div className="sticky top-14 z-40 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 max-w-2xl mx-auto">
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
              Fetch New Posts
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowManageProfiles(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Profiles</span>
              <Badge variant="secondary" className="ml-2">
                {profiles.length}
              </Badge>
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="w-full sm:w-auto sm:ml-auto">
            <Tabs
              value={filterTab}
              onValueChange={(v) => setFilterTab(v as FilterTab)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="active" className="gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Active</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {filterTab === "active" ? posts.length : activeCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="expired" className="gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Expired</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {filterTab === "expired" ? posts.length : expiredCount}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
          <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto">
            <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">
              {filterTab === "active" ? "No active posts" : "No expired posts"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {profiles.length === 0
                ? "Add some LinkedIn profiles to follow, then fetch their posts."
                : filterTab === "active"
                  ? "Click 'Fetch New Posts' to get the latest posts from your followed profiles."
                  : "Posts older than 48 hours will appear here."}
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
              <EngagementPostCard
                key={post.id}
                post={post}
                currentUserId={currentUser.id}
              />
            ))}
          </div>
        )}
      </main>

      {/* Manage Profiles Dialog */}
      <ManageProfilesDialog
        open={showManageProfiles}
        onOpenChange={setShowManageProfiles}
      />

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
    </div>
  );
};

export default Engagement;
