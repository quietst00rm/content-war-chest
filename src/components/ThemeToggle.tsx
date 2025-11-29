import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="default"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="gap-2"
    >
      <span className="text-base">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};
