import { Card } from "@/components/ui/card";
import { FileText, CheckCircle, Clock, Star } from "lucide-react";
import type { Post } from "@/pages/Index";

interface DashboardStatsProps {
  posts: Post[];
}

export const DashboardStats = ({ posts }: DashboardStatsProps) => {
  const totalPosts = posts.length;
  const usedPosts = posts.filter((p) => p.is_used).length;
  const unusedPosts = totalPosts - usedPosts;
  const favoritePosts = posts.filter((p) => p.is_favorite).length;
  const categories = new Set(posts.map((p) => p.primary_category)).size;

  const stats = [
    { label: "Total Posts", value: totalPosts, icon: FileText, color: "text-primary" },
    { label: "Used", value: usedPosts, icon: CheckCircle, color: "text-green-600" },
    { label: "Unused", value: unusedPosts, icon: Clock, color: "text-amber-600" },
    { label: "Favorites", value: favoritePosts, icon: Star, color: "text-yellow-600" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </div>
            <stat.icon className={`h-8 w-8 ${stat.color}`} />
          </div>
        </Card>
      ))}
    </div>
  );
};
