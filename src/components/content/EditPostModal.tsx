import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContentPost, Folder, PillarCategory } from "@/pages/Content";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePromptsDisplay } from "./ImagePromptsDisplay";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

interface EditPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: ContentPost;
  folders: Folder[];
  pillarCategories: PillarCategory[];
  onSuccess: () => void;
}

export function EditPostModal({
  open,
  onOpenChange,
  post,
  folders,
  pillarCategories,
  onSuccess,
}: EditPostModalProps) {
  const queryClient = useQueryClient();

  const [content, setContent] = useState(post.content);
  const [status, setStatus] = useState(post.status);
  const [folderId, setFolderId] = useState<string>(post.folder_id || "");
  const [pillarCategory, setPillarCategory] = useState(post.pillar_category || "");
  const [tags, setTags] = useState(post.tags?.join(", ") || "");
  const [notes, setNotes] = useState(post.notes || "");

  // Reset form when post changes
  useEffect(() => {
    setContent(post.content);
    setStatus(post.status);
    setFolderId(post.folder_id || "");
    setPillarCategory(post.pillar_category || "");
    setTags(post.tags?.join(", ") || "");
    setNotes(post.notes || "");
  }, [post]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("posts_new")
        .update({
          content,
          status,
          folder_id: folderId || null,
          pillar_category: pillarCategory || null,
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
          notes: notes || null,
          posted_at: status === "posted" ? new Date().toISOString() : post.posted_at,
        })
        .eq("id", post.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-posts"] });
      toast.success("Post updated");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Failed to update post");
    },
  });

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
      onOpenChange(false);
      onSuccess();
    },
    onError: () => {
      toast.error("Failed to delete post");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content..."
              className="min-h-[200px]"
              required
            />
            <p className="text-xs text-muted-foreground">
              {content.length} characters
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Folder */}
            <div className="space-y-2">
              <Label htmlFor="folder">Folder</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pillar Category */}
            <div className="space-y-2">
              <Label htmlFor="pillar">Pillar Category</Label>
              <Select value={pillarCategory} onValueChange={setPillarCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No category</SelectItem>
                  {pillarCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2, tag3..."
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes about this post..."
              className="min-h-[80px]"
            />
          </div>

          {/* Image Prompts Section */}
          <ImagePromptsDisplay postId={post.id} />

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (confirm("Delete this post? This cannot be undone.")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
