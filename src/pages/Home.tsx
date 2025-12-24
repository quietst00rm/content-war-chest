import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation, MobileBottomNav } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { 
  Users, 
  FileText, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Settings,
  Zap
} from "lucide-react";

interface Stats {
  profilesTracked: number;
  postsMonitored: number;
  commentsReady: number;
  claimsMade: number;
}

const StatCard = ({ 
  icon: Icon, 
  value, 
  label, 
  delay 
}: { 
  icon: React.ElementType; 
  value: number; 
  label: string; 
  delay: string;
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div 
      className={`group relative overflow-hidden rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-6 
        shadow-lg hover:shadow-xl hover:shadow-primary/10 
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:scale-[1.02]
        hover:border-primary/30`}
      style={{ animationDelay: delay }}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {displayValue}
            </p>
            <p className="text-sm text-muted-foreground font-medium">
              {label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ 
  to, 
  icon: Icon, 
  title, 
  description,
  gradient
}: { 
  to: string; 
  icon: React.ElementType; 
  title: string; 
  description: string;
  gradient: string;
}) => (
  <Link
    to={to}
    className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-8
      shadow-lg hover:shadow-2xl hover:shadow-primary/20
      transition-all duration-300 ease-out
      hover:-translate-y-2 hover:border-primary/40"
  >
    {/* Background gradient that shows on hover */}
    <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
    
    {/* Icon container */}
    <div className="relative z-10 mb-6">
      <div className={`inline-flex p-4 rounded-2xl ${gradient} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
    </div>
    
    {/* Content */}
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>
        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
      </div>
      <p className="text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
        {description}
      </p>
    </div>

    {/* Decorative corner accent */}
    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
  </Link>
);

const Home = () => {
  const { currentUser } = useUser();
  const [stats, setStats] = useState<Stats>({
    profilesTracked: 0,
    postsMonitored: 0,
    commentsReady: 0,
    claimsMade: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const userId = currentUser?.id;
        if (!userId) {
          setIsLoading(false);
          return;
        }

        // Fetch all stats in parallel
        const [profilesRes, postsRes, commentsRes, claimsRes] = await Promise.all([
          supabase
            .from("followed_profiles")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_active", true),
          supabase
            .from("engagement_posts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_hidden", false),
          supabase
            .from("comment_options")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("comment_options")
            .select("id", { count: "exact", head: true })
            .eq("claimed_by", userId),
        ]);

        setStats({
          profilesTracked: profilesRes.count || 0,
          postsMonitored: postsRes.count || 0,
          commentsReady: commentsRes.count || 0,
          claimsMade: claimsRes.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-24 pb-32 md:pb-16">
        {/* Hero Section */}
        <section className="text-center mb-16 animate-fade-in">
          {/* Decorative gradient orbs */}
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl -z-10" />
          <div className="absolute top-40 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-3xl -z-10" />
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
            <Sparkles className="w-4 h-4" />
            LinkedIn Engagement, Supercharged
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span className="gradient-primary-text">Own The Noise</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Cut Through the Static. Make Your Mark.
          </p>
        </section>

        {/* Stats Dashboard */}
        <section className="mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard 
              icon={Users} 
              value={stats.profilesTracked} 
              label="Profiles Tracked" 
              delay="0ms"
            />
            <StatCard 
              icon={FileText} 
              value={stats.postsMonitored} 
              label="Posts Monitored" 
              delay="50ms"
            />
            <StatCard 
              icon={MessageSquare} 
              value={stats.commentsReady} 
              label="Comments Ready" 
              delay="100ms"
            />
            <StatCard 
              icon={CheckCircle2} 
              value={stats.claimsMade} 
              label="Claims Made" 
              delay="150ms"
            />
          </div>
        </section>

        {/* Feature Navigation Cards */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">Quick Actions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              to="/engagement"
              icon={Zap}
              title="Engagement Hub"
              description="Engage authentically with your network. Browse posts, generate AI comments, and grow your presence."
              gradient="bg-gradient-to-br from-primary to-primary/70"
            />
            <FeatureCard
              to="/settings"
              icon={Settings}
              title="Settings"
              description="Customize your experience. Manage profiles, preferences, and fine-tune your engagement strategy."
              gradient="bg-gradient-to-br from-accent to-accent/70"
            />
          </div>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Home;
