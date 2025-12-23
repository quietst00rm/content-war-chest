import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { Folder, PillarCategory } from "@/pages/Content";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  pillarCategories: PillarCategory[];
  onSuccess: () => void;
}

export function AddPostModal({
  open,
  onOpenChange,
  folders,
  pillarCategories,
  onSuccess,
}: AddPostModalProps) {
  const { currentUser } = useUser();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [status, setStatus] = useState("draft");
  const [folderId, setFolderId] = useState<string>("");
  const [pillarCategory, setPillarCategory] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("posts_new")
        .insert({
          user_id: currentUser.id,
          content,
          status,
          folder_id: folderId || null,
          pillar_category: pillarCategory || null,
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
          notes: notes || null,
          posted_at: status === "posted" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["content-posts"] });
      toast.success("Post created");

      // Generate image prompts for the new post
      try {
        await supabase.functions.invoke("generate-image-prompts", {
          body: { post_id: data.id },
        });
        queryClient.invalidateQueries({ queryKey: ["image-prompts", data.id] });
      } catch (err) {
        console.error("Failed to generate image prompts:", err);
      }

      // Reset form
      setContent("");
      setStatus("draft");
      setFolderId("");
      setPillarCategory("");
      setTags("");
      setNotes("");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      console.error("Create error:", error);
      toast.error("Failed to create post");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Post</DialogTitle>
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

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Post
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
