import { useUser, USERS, UserSlug } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, ChevronDown, Check } from "lucide-react";

export function UserToggle() {
  const { currentUser, switchUser } = useUser();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <User className="h-4 w-4" />
          <span className="font-medium">{currentUser.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {(Object.keys(USERS) as UserSlug[]).map((slug) => (
          <DropdownMenuItem
            key={slug}
            onClick={() => switchUser(slug)}
            className="flex items-center justify-between"
          >
            <span>{USERS[slug].name}</span>
            {currentUser.slug === slug && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
