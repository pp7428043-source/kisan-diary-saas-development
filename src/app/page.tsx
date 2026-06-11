"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { t } from "@/lib/translations";
import type { TranslationKey } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { 
  Leaf, 
  TrendingUp, 
  CloudSun, 
  Sprout, 
  ShieldCheck, 
  Smartphone,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function RootPage() {
  const { user, isLoading, language } = useApp();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleActionClick = () => {
    if (!isLoading) {
      if (user) {
        if (user.isAdmin) {
          router.push("/admin/dashboard");
        } else {
          router.push("/app/home");
        }
      } else {
        router.push("/login");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-green-200">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="Kisan Diary Logo" width={48} height={48} className="rounded-full shadow-sm" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-800 to-green-600">
              Kisan Diary
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 mr-4">
              <Link href="#features" className="hover:text-green-600 transition-colors">{t(language, "features" as TranslationKey)}</Link>
              <Link href="#how-it-works" className="hover:text-green-600 transition-colors">{t(language, "howItWorks" as TranslationKey)}</Link>
              <Link href="#testimonials" className="hover:text-green-600 transition-colors">{t(language, "stories" as TranslationKey)}</Link>
              <button 
                onClick={() => useApp().setLanguage(language === "en" ? "hi" : "en")}
                className="text-xs font-bold px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors border border-green-200"
              >
                {language === "en" ? "हिंदी" : "English"}
              </button>
            </div>
            {mounted && (
              <Button 
                onClick={handleActionClick} 
                className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6 shadow-md hover:shadow-lg transition-all"
                disabled={isLoading}
              >
                {isLoading ? t(language, "loading" as TranslationKey) : user ? t(language, "goToDashboard" as TranslationKey) : t(language, "login" as TranslationKey)}
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-green-400 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-sm font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
            The #1 Enterprise Farm Management Solution
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
            {t(language, "landingTitle" as TranslationKey).split(',')[0]} <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
              {t(language, "landingTitle" as TranslationKey).split(',')[1] || ''}
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t(language, "landingSubtitle" as TranslationKey)}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={handleActionClick} 
              className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 h-14 text-lg w-full sm:w-auto shadow-xl shadow-green-600/20 hover:shadow-2xl hover:shadow-green-600/30 transition-all group"
            >
              {t(language, "startManaging" as TranslationKey)}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="rounded-full px-8 h-14 text-lg w-full sm:w-auto border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                {t(language, "viewDemo" as TranslationKey)}
              </Button>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-24 bg-gray-50/50 border-t border-gray-100 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t(language, "enterpriseTools" as TranslationKey)}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{t(language, "enterpriseToolsDesc" as TranslationKey)}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-shadow card-hover group">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t(language, "financialAnalytics" as TranslationKey)}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t(language, "financialAnalyticsDesc" as TranslationKey)}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-shadow card-hover group">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sprout className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t(language, "cropLifecycle" as TranslationKey)}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t(language, "cropLifecycleDesc" as TranslationKey)}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-shadow card-hover group">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CloudSun className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t(language, "smartPlanning" as TranslationKey)}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t(language, "smartPlanningDesc" as TranslationKey)}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-shadow card-hover group">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t(language, "mobileFirst" as TranslationKey)}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t(language, "mobileFirstDesc" as TranslationKey)}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-shadow card-hover group">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t(language, "securePrivate" as TranslationKey)}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t(language, "securePrivateDesc" as TranslationKey)}
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-green-600 to-green-800 p-8 rounded-3xl shadow-lg flex flex-col justify-between text-white card-hover relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div>
                <h3 className="text-2xl font-bold mb-4">{t(language, "readyTransform" as TranslationKey)}</h3>
                <p className="text-green-100 mb-8 leading-relaxed">
                  {t(language, "readyTransformDesc" as TranslationKey)}
                </p>
              </div>
              <Button 
                onClick={handleActionClick}
                className="bg-white text-green-700 hover:bg-gray-50 rounded-xl py-6 w-full font-bold group"
              >
                {t(language, "getStartedFree" as TranslationKey)}
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/logo.jpg" alt="Kisan Diary Logo" width={48} height={48} className="rounded-full bg-white shadow" />
              <span className="text-2xl font-bold text-white">Kisan Diary</span>
            </div>
            <p className="text-gray-400 max-w-sm">
              Building the digital infrastructure for modern agriculture. Empowering farmers with technology.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:text-green-400 transition-colors">Features</Link></li>
              <li><Link href="#" className="hover:text-green-400 transition-colors">Pricing</Link></li>
              <li><Link href="#" className="hover:text-green-400 transition-colors">Mobile App</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:text-green-400 transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-green-400 transition-colors">Contact</Link></li>
              <li><Link href="#" className="hover:text-green-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-gray-800 text-sm text-center text-gray-500">
          © {new Date().getFullYear()} Kisan Diary. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
