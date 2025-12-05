import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Copy, Check, Sparkles, Save, Loader2, Plus, Twitter, Mail, Lightbulb, BarChart3, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CATEGORIES, getCategoryEmoji } from "@/lib/categories";
import type { Post, PostStatus } from "@/pages/Index";

const STATUS_OPTIONS: { value: PostStatus; label: string; color: string }[] = [
  { value: 'idea', label: 'Idea', color: 'bg-purple-500/20 text-purple-500' },
  { value: 'draft', label: 'Draft', color: 'bg-gray-500/20 text-gray-500' },
  { value: 'ready', label: 'Ready', color: 'bg-green-500/20 text-green-500' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-500/20 text-blue-500' },
  { value: 'used', label: 'Used', color: 'bg-orange-500/20 text-orange-500' },
  { value: 'archived', label: 'Archived', color: 'bg-red-500/20 text-red-500' },
];

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
  const [status, setStatus] = useState<PostStatus>("draft");
  const [copied, setCopied] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");

  // Platform versions state
  const [platformVersions, setPlatformVersions] = useState<any[]>([]);
  const [isGeneratingVersion, setIsGeneratingVersion] = useState<string | null>(null);

  // Hooks state
  const [hookVariants, setHookVariants] = useState<any[]>([]);
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setCategory(post.primary_category);
      setFolderId(post.folder_id);
      setTags(post.tags || []);
      setNotes(post.notes || "");
      setStatus(post.status || "draft");
      setShowNotes(!!post.notes);

      // Fetch platform versions
      fetchPlatformVersions(post.id);
      // Fetch hook variants
      fetchHookVariants(post.id);
    }
  }, [post]);

  const fetchPlatformVersions = async (postId: string) => {
    const { data } = await supabase
      .from("platform_versions")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });
    setPlatformVersions(data || []);
  };

  const fetchHookVariants = async (postId: string) => {
    const { data } = await supabase
      .from("hook_variants")
      .select("*")
      .eq("post_id", postId)
      .order("is_primary", { ascending: false });
    setHookVariants(data || []);
  };

  const handleGeneratePlatformVersion = async (platform: 'twitter' | 'newsletter') => {
    if (!post) return;
    setIsGeneratingVersion(platform);
    try {
      const { data, error } = await supabase.functions.invoke('generate-platform-version', {
        body: { post_id: post.id, target_platform: platform }
      });
      if (error) throw error;
      toast({ title: `${platform === 'twitter' ? 'Twitter' : 'Newsletter'} version generated!` });
      fetchPlatformVersions(post.id);
    } catch (error: any) {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGeneratingVersion(null);
    }
  };

  const handleGenerateHooks = async () => {
    if (!post) return;
    setIsGeneratingHooks(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-hooks', {
        body: { post_id: post.id, count: 5 }
      });
      if (error) throw error;
      toast({ title: "Hook variants generated!", description: `Created ${data.count} new hooks` });
      fetchHookVariants(post.id);
    } catch (error: any) {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGeneratingHooks(false);
    }
  };

  const handleSetPrimaryHook = async (hookId: string) => {
    if (!post) return;
    // First, unset all primary hooks for this post
    await supabase
      .from("hook_variants")
      .update({ is_primary: false })
      .eq("post_id", post.id);
    // Set the new primary
    await supabase
      .from("hook_variants")
      .update({ is_primary: true })
      .eq("id", hookId);
    fetchHookVariants(post.id);
    toast({ title: "Primary hook updated" });
  };

  const handleCopyPlatformVersion = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard!" });
  };

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
      const updateData: any = {
        title,
        content,
        primary_category: category,
        folder_id: folderId,
        tags,
        notes,
        character_count: content.length,
        status,
      };

      // If status is 'used', update used_at and usage_count
      if (status === 'used' && post.status !== 'used') {
        updateData.is_used = true;
        updateData.used_at = new Date().toISOString();
        updateData.usage_count = (post.usage_count || 0) + 1;
      } else if (status !== 'used' && post.status === 'used') {
        updateData.is_used = false;
      }

      const { error } = await supabase
        .from("posts")
        .update(updateData)
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

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Edit Post</DialogTitle>
            <Select value={status} onValueChange={(v) => setStatus(v as PostStatus)}>
              <SelectTrigger className={`w-32 h-8 text-xs ${currentStatusOption?.color}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className={opt.color}>{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
            <TabsTrigger value="edit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
              Edit
            </TabsTrigger>
            <TabsTrigger value="platforms" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
              <Twitter className="h-3.5 w-3.5 mr-1.5" />
              Platforms
            </TabsTrigger>
            <TabsTrigger value="hooks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
              <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
              Hooks
            </TabsTrigger>
          </TabsList>

          {/* Edit Tab */}
          <TabsContent value="edit" className="p-6 space-y-6 mt-0">
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

            {/* Notes */}
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
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="p-6 mt-0">
            <div className="space-y-6">
              <div className="flex gap-3">
                <Button
                  onClick={() => handleGeneratePlatformVersion('twitter')}
                  disabled={isGeneratingVersion !== null}
                  variant="outline"
                >
                  {isGeneratingVersion === 'twitter' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Twitter className="h-4 w-4 mr-2" />
                  )}
                  Generate Twitter Version
                </Button>
                <Button
                  onClick={() => handleGeneratePlatformVersion('newsletter')}
                  disabled={isGeneratingVersion !== null}
                  variant="outline"
                >
                  {isGeneratingVersion === 'newsletter' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Generate Newsletter Version
                </Button>
              </div>

              {platformVersions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Twitter className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No platform versions yet</p>
                  <p className="text-sm">Generate a Twitter or Newsletter version above</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {platformVersions.map((version) => (
                    <div key={version.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="capitalize">
                          {version.platform === 'twitter' ? <Twitter className="h-3 w-3 mr-1" /> : <Mail className="h-3 w-3 mr-1" />}
                          {version.platform}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{version.character_count} chars</span>
                          <Button size="sm" variant="ghost" onClick={() => handleCopyPlatformVersion(version.content)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <pre className="text-sm whitespace-pre-wrap bg-secondary p-3 rounded max-h-48 overflow-y-auto">
                        {version.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Hooks Tab */}
          <TabsContent value="hooks" className="p-6 mt-0">
            <div className="space-y-6">
              <Button
                onClick={handleGenerateHooks}
                disabled={isGeneratingHooks}
                variant="outline"
              >
                {isGeneratingHooks ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="h-4 w-4 mr-2" />
                )}
                Generate 5 Hook Variants
              </Button>

              {hookVariants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hook variants yet</p>
                  <p className="text-sm">Generate hook variants to A/B test your openings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hookVariants.map((hook) => (
                    <div
                      key={hook.id}
                      className={`border rounded-lg p-4 ${hook.is_primary ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {hook.is_primary && (
                              <Badge variant="default" className="text-xs">Primary</Badge>
                            )}
                            <Badge variant="outline" className="text-xs capitalize">{hook.source.replace('_', ' ')}</Badge>
                          </div>
                          <p className="text-sm">{hook.hook_text}</p>
                        </div>
                        {!hook.is_primary && (
                          <Button size="sm" variant="ghost" onClick={() => handleSetPrimaryHook(hook.id)}>
                            Set Primary
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleCopy} size="sm">
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? "Copied!" : "Copy"}
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
