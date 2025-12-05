import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Trash2, User, ExternalLink } from "lucide-react";

interface FollowedProfile {
  id: string;
  linkedin_url: string;
  name: string | null;
  notes: string | null;
  is_active: boolean;
  last_fetched_at: string | null;
  created_at: string;
}

interface ManageProfilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageProfilesDialog = ({
  open,
  onOpenChange,
}: ManageProfilesDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");

  // Fetch profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["followed-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("followed_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FollowedProfile[];
    },
    enabled: open,
  });

  // Add profile mutation
  const addProfileMutation = useMutation({
    mutationFn: async ({ url, name }: { url: string; name: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Validate URL format
      if (!url.includes("linkedin.com/in/") && !url.includes("linkedin.com/company/")) {
        throw new Error("Please enter a valid LinkedIn profile URL");
      }

      const { error } = await supabase.from("followed_profiles").insert({
        user_id: user.id,
        linkedin_url: url.trim(),
        name: name.trim() || null,
        is_active: true,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("This profile is already in your list");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followed-profiles"] });
      setNewUrl("");
      setNewName("");
      toast.success("Profile added");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("followed_profiles")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followed-profiles"] });
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  // Delete profile mutation
  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("followed_profiles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followed-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["engagement-posts"] });
      toast.success("Profile removed");
    },
    onError: () => {
      toast.error("Failed to remove profile");
    },
  });

  const handleAddProfile = () => {
    if (!newUrl.trim()) {
      toast.error("Please enter a LinkedIn URL");
      return;
    }
    addProfileMutation.mutate({ url: newUrl, name: newName });
  };

  const extractUsername = (url: string): string => {
    const match = url.match(/linkedin\.com\/(?:in|company)\/([^/?]+)/);
    return match ? match[1] : url;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Profiles</DialogTitle>
        </DialogHeader>

        {/* Add New Profile */}
        <div className="space-y-3 pb-4 border-b">
          <div className="space-y-2">
            <Label htmlFor="linkedin-url">LinkedIn Profile URL</Label>
            <Input
              id="linkedin-url"
              placeholder="https://linkedin.com/in/username"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddProfile()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name (optional)</Label>
            <Input
              id="display-name"
              placeholder="John Smith"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddProfile()}
            />
          </div>
          <Button
            onClick={handleAddProfile}
            disabled={addProfileMutation.isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Profile
          </Button>
        </div>

        {/* Profile List */}
        <div className="flex-1 min-h-0">
          <p className="text-sm text-muted-foreground mb-2">
            {profiles.length} profile{profiles.length !== 1 ? "s" : ""}
          </p>

          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No profiles yet. Add some above.
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {profile.name || extractUsername(profile.linkedin_url)}
                      </p>
                      <a
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate">{extractUsername(profile.linkedin_url)}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={profile.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({
                            id: profile.id,
                            isActive: checked,
                          })
                        }
                        aria-label={profile.is_active ? "Disable" : "Enable"}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`Remove ${profile.name || extractUsername(profile.linkedin_url)}?`)) {
                            deleteProfileMutation.mutate(profile.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
