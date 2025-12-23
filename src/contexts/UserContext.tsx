import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// User IDs match the database seed values
export const USERS = {
  joe: {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Joe",
    slug: "joe",
  },
  kristen: {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Kristen",
    slug: "kristen",
  },
} as const;

export type UserSlug = keyof typeof USERS;
export type User = (typeof USERS)[UserSlug];

interface UserContextType {
  currentUser: User;
  switchUser: (slug: UserSlug) => void;
  isJoe: boolean;
  isKristen: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = "content-war-chest-user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    // Initialize from localStorage or default to Joe
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "kristen") {
        return USERS.kristen;
      }
    }
    return USERS.joe;
  });

  // Persist to localStorage when user changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentUser.slug);
  }, [currentUser]);

  const switchUser = (slug: UserSlug) => {
    setCurrentUser(USERS[slug]);
  };

  const value: UserContextType = {
    currentUser,
    switchUser,
    isJoe: currentUser.slug === "joe",
    isKristen: currentUser.slug === "kristen",
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
