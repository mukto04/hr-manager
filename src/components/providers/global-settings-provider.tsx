"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface GlobalSettings {
  country: string;
  currencySymbol: string;
  timezone: string;
  language: string;
}

const GlobalSettingsContext = createContext<GlobalSettings>({
  country: "Bangladesh",
  currencySymbol: "৳",
  timezone: "Asia/Dhaka",
  language: "en"
});

export const useGlobalSettings = () => useContext(GlobalSettingsContext);

export function GlobalSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>({
    country: "Bangladesh",
    currencySymbol: "৳",
    timezone: "Asia/Dhaka",
    language: "en"
  });

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);

    // Now that we are on the client, try to load from localStorage
    const cached = localStorage.getItem("global-settings");
    if (cached) {
      try {
        setSettings(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse cached settings");
      }
    }

    // Sync with API
    fetch("/api/settings/global")
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSettings(data);
          localStorage.setItem("global-settings", JSON.stringify(data));
        }
      })
      .catch(err => console.error("Failed to load global settings:", err))
      .finally(() => setLoading(false));
  }, []);

  // During SSR and until the component mounts on the client, show the loader.
  // This ensures the HTML matches exactly between server and client.
  if (!mounted || (loading && settings.language === "en")) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-[9999]">
         <div className="h-8 w-8 border-4 border-slate-100 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <GlobalSettingsContext.Provider value={settings}>
      {children}
    </GlobalSettingsContext.Provider>
  );
}
