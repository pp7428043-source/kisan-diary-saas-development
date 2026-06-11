"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Home, Sprout, BookText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/translations";

const navItems = [
  { href: "/app/home", icon: Home, labelKey: "home" as const, emoji: "🏠" },
  { href: "/app/farms", icon: Sprout, labelKey: "season" as const, emoji: "🌾" },
  { href: "/app/khata", icon: BookText, labelKey: "khata" as const, emoji: "📒" },
  { href: "/app/settings", icon: Settings, labelKey: "settings" as const, emoji: "⚙️" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useApp();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center flex flex-col items-center">
          <Image src="/logo.jpg" alt="Kisan Diary" width={80} height={80} className="rounded-full mb-4 animate-pulse" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  const lang = user?.language ?? "hi";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">

      {/* Top bar: show Login button when not logged in */}
      {!user && (
        <div className="bg-green-600 text-white text-xs flex items-center justify-between px-4 py-2 sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="Kisan Diary" width={24} height={24} className="rounded-full" />
            <span className="font-semibold">किसान डायरी — बिना लॉगिन के देखें</span>
          </div>
          <Link
            href="/login"
            className="bg-white text-green-700 font-semibold px-3 py-1 rounded-full text-xs"
          >
            🔑 लॉगिन / साइन अप
          </Link>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* AdMob Banner Placeholder */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-lg bg-gray-100 border-t border-gray-200 h-12 flex items-center justify-center z-30">
        <span className="text-xs text-gray-400">📢 Advertisement</span>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 z-40 shadow-lg">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                  isActive ? "text-green-700" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <item.icon className={cn("w-6 h-6", isActive ? "stroke-[2.5]" : "stroke-2")} />
                <span className={cn("text-[10px] font-bold", isActive && "text-green-700")}>
                  {t(lang, item.labelKey)}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-green-600 mt-0.5 absolute bottom-1" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
