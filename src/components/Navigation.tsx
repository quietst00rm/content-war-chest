import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserToggle } from "@/components/UserToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Home, MessageCircle, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

function NavLink({ to, icon, label, isActive }: NavLinkProps) {
  return (
    <Link to={to}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        className={cn("h-9 gap-2", isActive && "bg-secondary")}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </Button>
    </Link>
  );
}

export function Navigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4">
      <div className="flex items-center gap-1">
        <NavLink
          to="/"
          icon={<Home className="h-4 w-4" />}
          label="Home"
          isActive={currentPath === "/"}
        />
        <NavLink
          to="/engagement"
          icon={<MessageCircle className="h-4 w-4" />}
          label="Engagement"
          isActive={currentPath === "/engagement"}
        />
        <NavLink
          to="/content"
          icon={<FileText className="h-4 w-4" />}
          label="Content"
          isActive={currentPath === "/content"}
        />
        <NavLink
          to="/settings"
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
          isActive={currentPath === "/settings"}
        />
      </div>

      <div className="flex items-center gap-2">
        <UserToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}

// Mobile bottom navigation for engagement page
export function MobileBottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center justify-around h-16">
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2",
            currentPath === "/"
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs">Home</span>
        </Link>
        <Link
          to="/engagement"
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2",
            currentPath === "/engagement"
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-xs">Engage</span>
        </Link>
        <Link
          to="/content"
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2",
            currentPath === "/content"
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs">Content</span>
        </Link>
        <Link
          to="/settings"
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2",
            currentPath === "/settings"
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <Settings className="h-5 w-5" />
          <span className="text-xs">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
