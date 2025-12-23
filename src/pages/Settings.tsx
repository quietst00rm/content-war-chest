import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, FileText, Trash2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const Settings = () => {
  const { currentUser } = useUser();
  const queryClient = useQueryClient();
  const [contextDocument, setContextDocument] = useState("");

  // Fetch user's context document
  const { data: userData, isLoading } = useQuery({
    queryKey: ["user-internal", currentUser.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users_internal")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Update context document effect
  useState(() => {
    if (userData?.context_document) {
      setContextDocument(userData.context_document);
    }
  });

  // Save context document mutation
  const saveContextMutation = useMutation({
    mutationFn: async (doc: string) => {
      const { error } = await supabase
        .from("users_internal")
        .update({ context_document: doc })
        .eq("id", currentUser.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-internal", currentUser.id] });
      toast.success("Context document saved");
    },
    onError: () => {
      toast.error("Failed to save context document");
    },
  });

  // Clear expired posts mutation
  const clearExpiredMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("engagement_posts_new")
        .delete()
        .eq("is_expired", true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["engagement-posts"] });
      toast.success("Expired posts cleared");
    },
    onError: () => {
      toast.error("Failed to clear expired posts");
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Profile Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Profile Management
              </CardTitle>
              <CardDescription>
                Manage your target LinkedIn profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/engagement">
                <Button variant="outline">
                  Manage Target Profiles
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Voice Context Document */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Voice Context Document
              </CardTitle>
              <CardDescription>
                Your full voice dossier for AI-generated content (for future use)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <Textarea
                    value={contextDocument}
                    onChange={(e) => setContextDocument(e.target.value)}
                    placeholder="Paste your voice profile / context document here..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <Button
                    onClick={() => saveContextMutation.mutate(contextDocument)}
                    disabled={saveContextMutation.isPending}
                  >
                    {saveContextMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save Document
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Clean up old data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Clear all expired posts (older than 48 hours)?")) {
                    clearExpiredMutation.mutate();
                  }
                }}
                disabled={clearExpiredMutation.isPending}
              >
                {clearExpiredMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Clear Expired Posts
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
