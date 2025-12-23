import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContentPost, Folder, PillarCategory } from "@/pages/Content";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditPostModal } from "./EditPostModal";
import { toast } from "sonner";
import { MoreVertical, Trash2, Folder as FolderIcon, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentCardProps {
  post: ContentPost;
  viewMode: "grid" | "list";
  folders: Folder[];
  pillarCategories: PillarCategory[];
  onRefetch: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  ready: "bg-green-500/10 text-green-500 border-green-500/20",
  posted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

export function ContentCard({
  post,
  viewMode,
  folders,
  pillarCategories,
  onRefetch,
}: ContentCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const queryClient = useQueryClient();

  const folder = folders.find((f) => f.id === post.folder_id);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("posts_new")
        .delete()
        .eq("id", post.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-posts"] });
      toast.success("Post deleted");
    },
    onError: () => {
      toast.error("Failed to delete post");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("posts_new")
        .update({
          status,
          posted_at: status === "posted" ? new Date().toISOString() : null,
        })
        .eq("id", post.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-posts"] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const contentPreview =
    post.content.length > 200
      ? post.content.substring(0, 200) + "..."
      : post.content;

  if (viewMode === "list") {
    return (
      <>
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setShowEditModal(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", STATUS_COLORS[post.status])}
                  >
                    {post.status}
                  </Badge>
                  {post.pillar_category && (
                    <Badge variant="secondary" className="text-xs">
                      {post.pillar_category}
                    </Badge>
                  )}
                  {folder && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FolderIcon className="h-3 w-3" />
                      {folder.name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {contentPreview}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate("draft")}>
                    Mark as Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate("ready")}>
                    Mark as Ready
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate("posted")}>
                    Mark as Posted
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (confirm("Delete this post?")) {
                        deleteMutation.mutate();
                      }
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        <EditPostModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          post={post}
          folders={folders}
          pillarCategories={pillarCategories}
          onSuccess={onRefetch}
        />
      </>
    );
  }

  return (
    <>
      <Card
        className="cursor-pointer hover:bg-muted/50 transition-colors h-full flex flex-col"
        onClick={() => setShowEditModal(true)}
      >
        <CardContent className="p-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn("text-xs", STATUS_COLORS[post.status])}
              >
                {post.status}
              </Badge>
              {post.pillar_category && (
                <Badge variant="secondary" className="text-xs">
                  {post.pillar_category}
                </Badge>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("draft")}>
                  Mark as Draft
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("ready")}>
                  Mark as Ready
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("posted")}>
                  Mark as Posted
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm("Delete this post?")) {
                      deleteMutation.mutate();
                    }
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-sm text-muted-foreground flex-1 line-clamp-4 mb-3">
            {contentPreview}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {folder && (
              <span className="flex items-center gap-1">
                <FolderIcon className="h-3 w-3" />
                {folder.name}
              </span>
            )}
            {post.tags && post.tags.length > 0 && (
              <span>{post.tags.length} tag{post.tags.length !== 1 ? "s" : ""}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <EditPostModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        post={post}
        folders={folders}
        pillarCategories={pillarCategories}
        onSuccess={onRefetch}
      />
    </>
  );
}
