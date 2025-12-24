import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { USERS } from "@/contexts/UserContext";
import type { EngagementPost, CommentOption } from "@/pages/Engagement";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Clock,
  Target,
  Lightbulb,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface EngagementPostCardProps {
  post: EngagementPost;
  currentUserId: string;
}

const APPROACH_CONFIG = {
  specific_detail: {
    label: "Specific Detail",
    icon: Target,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  hidden_dynamic: {
    label: "Hidden Dynamic",
    icon: Lightbulb,
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  practical_implication: {
    label: "Practical Implication",
    icon: Zap,
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
} as const;

export function EngagementPostCard({
  post,
  currentUserId,
}: EngagementPostCardProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch comment options for this post
  const { data: commentOptions = [], isLoading: optionsLoading } = useQuery({
    queryKey: ["comment-options", post.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comment_options")
        .select("*")
        .eq("engagement_post_id", post.id)
        .order("option_number", { ascending: true });

      if (error) throw error;
      return data as unknown as CommentOption[];
    },
  });

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async ({
      optionId,
      claim,
    }: {
      optionId: string;
      claim: boolean;
    }) => {
      const { error } = await supabase
        .from("comment_options")
        .update({
          claimed_by: claim ? currentUserId : null,
          claimed_at: claim ? new Date().toISOString() : null,
        })
        .eq("id", optionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comment-options", post.id] });
    },
    onError: () => {
      toast.error("Failed to update claim");
    },
  });

  const handleCopy = async (option: CommentOption) => {
    try {
      await navigator.clipboard.writeText(option.comment_text);
      setCopiedId(option.id);
      toast.success("Comment copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const handleOpenPost = () => {
    window.open(post.linkedin_post_url, "_blank", "noopener,noreferrer");
  };

  const getTimeAgo = () => {
    if (!post.posted_at) return "Unknown";
    return formatDistanceToNow(new Date(post.posted_at), { addSuffix: true });
  };

  const contentPreview =
    post.content.length > 300 ? post.content.substring(0, 300) + "..." : post.content;

  const authorInitials =
    post.author_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    if (userId === USERS.joe.id) return "Joe";
    if (userId === USERS.kristen.id) return "Kristen";
    return null;
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Post Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={post.author_avatar || undefined} />
              <AvatarFallback>{authorInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {post.author_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {post.author_title || ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      post.is_expired
                        ? "bg-muted text-muted-foreground"
                        : "bg-green-500/10 text-green-500 border-green-500/20"
                    )}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {getTimeAgo()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="p-4 border-b border-border">
          <p className="text-sm whitespace-pre-wrap">
            {isExpanded ? post.content : contentPreview}
          </p>
          {post.content.length > 300 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-primary mt-2 flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show more
                </>
              )}
            </button>
          )}
        </div>

        {/* Comment Options */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Comment Options</h4>
          </div>

          {optionsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : commentOptions.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <p>No comments generated yet.</p>
              <p className="text-xs mt-1">Comments will be generated automatically when posts are fetched.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commentOptions.map((option) => {
                const config = APPROACH_CONFIG[option.approach_type];
                const Icon = config.icon;
                const claimedByName = getUserName(option.claimed_by);
                const isClaimedByMe = option.claimed_by === currentUserId;
                const isClaimedByOther =
                  option.claimed_by && !isClaimedByMe;

                return (
                  <div
                    key={option.id}
                    className={cn(
                      "border rounded-lg p-3 space-y-2",
                      isClaimedByOther && "opacity-60"
                    )}
                  >
                    {/* Approach Label */}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={cn("text-xs", config.color)}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      {claimedByName && (
                        <Badge
                          variant={isClaimedByMe ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {isClaimedByMe ? "You claimed" : `${claimedByName} claimed`}
                        </Badge>
                      )}
                    </div>

                    {/* Comment Text */}
                    <p className="text-sm">{option.comment_text}</p>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(option)}
                        className="flex-1 min-w-[100px] h-9"
                      >
                        {copiedId === option.id ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenPost}
                        className="h-9"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={isClaimedByMe ? "secondary" : "default"}
                        size="sm"
                        onClick={() =>
                          claimMutation.mutate({
                            optionId: option.id,
                            claim: !isClaimedByMe,
                          })
                        }
                        disabled={
                          claimMutation.isPending ||
                          (isClaimedByOther && !isClaimedByMe)
                        }
                        className="h-9"
                      >
                        {isClaimedByMe ? "Unclaim" : "Claim"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
