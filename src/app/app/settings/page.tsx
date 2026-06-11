"use client";

import { useApp } from "@/context/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t, Language, LANGUAGES } from "@/lib/translations";
import { User, LogOut, Globe, Phone, MapPin, Shield, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, language, setLanguage, logout } = useApp();
  const router = useRouter();
  const lang = language;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleLanguageChange = (value: Language) => {
    setLanguage(value);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-5xl mb-4">⚙️</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">लॉगिन आवश्यक है</h2>
        <p className="text-gray-500 text-sm mb-6">सेटिंग्स देखने के लिए कृपया लॉगिन करें</p>
        <Button onClick={() => router.push("/login")}>🔑 {t(lang, "login")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-4 pt-12 pb-8 rounded-b-3xl">
        <h1 className="text-white text-2xl font-bold mb-1">⚙️ {t(lang, "settings")}</h1>
        <p className="text-slate-200 text-sm">खाता और प्राथमिकताएं</p>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* Profile Card */}
        <Card className="p-4 border-none shadow-md">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-4 mb-4">
            <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-2xl font-bold shadow-inner">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
              <p className="text-gray-500 text-sm font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
                Kisan Pro
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <Phone size={18} className="text-slate-400" />
              <span className="text-sm font-medium">{user.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin size={18} className="text-slate-400" />
              <span className="text-sm font-medium">{user.state}</span>
            </div>
          </div>
        </Card>

        {/* Preferences */}
        <Card className="p-4 border-none shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Globe size={18} className="text-blue-500" /> भाषा / Language
          </h3>
          <Select value={language} onValueChange={(val) => handleLanguageChange(val as Language)}>
            <SelectTrigger className="w-full h-12 bg-gray-50 border-gray-200 rounded-xl">
              <SelectValue placeholder="भाषा चुनें" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  <div className="flex items-center gap-2 font-medium">
                    {l.name} <span className="text-gray-400 text-xs">({l.englishName})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Support & Legal */}
        <Card className="p-2 border-none shadow-sm">
          <div className="divide-y divide-gray-100">
            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors rounded-lg text-left">
              <div className="flex items-center gap-3 text-gray-700">
                <HelpCircle size={18} className="text-amber-500" />
                <span className="font-medium text-sm">सहायता और सपोर्ट</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors rounded-lg text-left">
              <div className="flex items-center gap-3 text-gray-700">
                <Shield size={18} className="text-emerald-500" />
                <span className="font-medium text-sm">प्राइवेसी पॉलिसी</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
          </div>
        </Card>

        {/* Logout */}
        <Button 
          variant="outline" 
          className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl mt-4 shadow-sm"
          onClick={handleLogout}
        >
          <LogOut size={18} className="mr-2" /> लॉगआउट (Logout)
        </Button>
        
        <p className="text-center text-xs text-gray-400 mt-6 pb-4">
          Kisan Diary SaaS v1.0.0
        </p>
      </div>
    </div>
  );
}
