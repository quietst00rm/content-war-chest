import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Copy, Check, Sparkles, Save, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CATEGORIES, getCategoryEmoji } from "@/lib/categories";
import type { Post } from "@/pages/Index";

interface PostModalProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  folders: Array<{ id: string; name: string; color: string }>;
}

export const PostModal = ({
  post,
  open,
  onOpenChange,
  onUpdate,
  folders,
}: PostModalProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setCategory(post.primary_category);
      setFolderId(post.folder_id);
      setTags(post.tags || []);
      setNotes(post.notes || "");
      setShowNotes(!!post.notes);
    }
  }, [post]);

  if (!post) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!", description: "Post is ready to paste on LinkedIn." });
  };

  const handleAutoFormat = async () => {
    setIsFormatting(true);
    try {
      const { data, error } = await supabase.functions.invoke('format-post', {
        body: { content }
      });
      if (error) throw error;
      setContent(data.formatted_content);
      toast({ title: "✓ Post formatted!", description: "Content updated. Click Save to keep changes." });
    } catch (error: any) {
      console.error('Auto-format error:', error);
      toast({ title: "Formatting failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsFormatting(false);
    }
  };

  const handleMarkAsUsed = async () => {
    try {
      await supabase
        .from("posts")
        .update({
          is_used: !post.is_used,
          used_at: !post.is_used ? new Date().toISOString() : null,
          usage_count: post.is_used ? Math.max(0, post.usage_count - 1) : post.usage_count + 1,
        })
        .eq("id", post.id);
      onUpdate();
      toast({ title: post.is_used ? "Marked as unused" : "Marked as used" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("posts")
        .update({
          title,
          content,
          primary_category: category,
          folder_id: folderId,
          tags,
          notes,
          character_count: content.length,
        })
        .eq("id", post.id);
      
      if (error) throw error;
      
      toast({ title: "Post saved successfully" });
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ title: "Save failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Edit Post</DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Headline */}
          <div>
            <label className="text-xs uppercase text-muted-foreground tracking-wider font-medium mb-2 block">
              Headline
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          {/* Category & Folder Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-muted-foreground tracking-wider font-medium mb-2 block">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {getCategoryEmoji(cat.name)} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase text-muted-foreground tracking-wider font-medium mb-2 block">
                Folder
              </label>
              <Select value={folderId || "none"} onValueChange={(v) => setFolderId(v === "none" ? null : v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="No folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase text-muted-foreground tracking-wider font-medium">
                Content
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAutoFormat}
                disabled={isFormatting}
                className="text-primary hover:text-primary/80 h-auto p-0 text-sm"
              >
                {isFormatting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                )}
                Refine with AI
              </Button>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-secondary border-border min-h-[200px] text-sm leading-relaxed whitespace-pre-wrap"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs uppercase text-muted-foreground tracking-wider font-medium mb-2 block">
              Tags
            </label>
            <div className="flex gap-2 mb-3">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                className="bg-secondary border-border flex-1"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button onClick={handleAddTag} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="px-3 py-1 rounded-full text-sm">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes (collapsible) */}
          {showNotes && (
            <div>
              <label className="text-xs uppercase text-muted-foreground tracking-wider font-medium mb-2 block">
                Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this post..."
                className="bg-secondary border-border min-h-[80px]"
              />
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleAutoFormat}
              variant="outline"
              size="sm"
              disabled={isFormatting}
            >
              {isFormatting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              Auto-Format
            </Button>
            <Button onClick={handleCopy} size="sm">
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button onClick={handleMarkAsUsed} variant="outline" size="sm">
              {post.is_used ? "Mark Unused" : "Mark Used"}
            </Button>
            <Button onClick={() => setShowNotes(!showNotes)} variant="outline" size="sm">
              {showNotes ? "Hide Note" : "Add Note"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
