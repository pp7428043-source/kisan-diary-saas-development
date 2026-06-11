"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Language } from "@/lib/translations";

interface User {
  id: string;
  phone: string;
  username?: string;
  name: string;
  state: string;
  language: Language;
  isAdmin: boolean;
}

interface Farm {
  id: string;
  name: string;
  sizeAcre: number;
  location: string;
  activeSeason?: Season | null;
}

interface Season {
  id: string;
  farmId: string;
  cropName: string;
  startDate: string;
  endDate?: string | null;
  status: string;
}

interface AppContextType {
  user: User | null;
  token: string | null;
  language: Language;
  farms: Farm[];
  activeFarm: Farm | null;
  activeSeason: Season | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  setActiveFarm: (farm: Farm | null) => void;
  setActiveSeason: (season: Season | null) => void;
  refreshFarms: () => Promise<void>;
  apiCall: <T>(url: string, options?: RequestInit) => Promise<T>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [language, setLanguageState] = useState<Language>("hi");
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarm, setActiveFarm] = useState<Farm | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("kisan_token");
    const savedUser = localStorage.getItem("kisan_user");
    const savedLang = localStorage.getItem("kisan_lang") as Language;

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    if (savedLang) setLanguageState(savedLang);
    setIsLoading(false);
  }, []);

  const apiCall = useCallback(async <T,>(url: string, options?: RequestInit): Promise<T> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    };

    const currentToken = localStorage.getItem("kisan_token");
    if (currentToken) {
      headers["Authorization"] = `Bearer ${currentToken}`;
    }

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data as T;
  }, []);

  const refreshFarms = useCallback(async () => {
    if (!token) return;
    try {
      const result = await apiCall<{ success: boolean; data: Farm[] }>("/api/farms");
      if (result.success) {
        setFarms(result.data);
        if (result.data.length > 0 && !activeFarm) {
          setActiveFarm(result.data[0]);
          if (result.data[0].activeSeason) {
            setActiveSeason(result.data[0].activeSeason);
          }
        }
      }
    } catch (error) {
      console.error("Failed to refresh farms:", error);
    }
  }, [token, apiCall, activeFarm]);

  useEffect(() => {
    if (token) {
      refreshFarms();
    }
  }, [token, refreshFarms]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setLanguageState(newUser.language as Language);
    localStorage.setItem("kisan_token", newToken);
    localStorage.setItem("kisan_user", JSON.stringify(newUser));
    localStorage.setItem("kisan_lang", newUser.language);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setFarms([]);
    setActiveFarm(null);
    setActiveSeason(null);
    localStorage.removeItem("kisan_token");
    localStorage.removeItem("kisan_user");
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("kisan_lang", lang);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        language,
        farms,
        activeFarm,
        activeSeason,
        isLoading,
        login,
        logout,
        setLanguage,
        setActiveFarm,
        setActiveSeason,
        refreshFarms,
        apiCall,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
