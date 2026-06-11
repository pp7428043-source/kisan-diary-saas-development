"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, formatCurrency, daysDiff } from "@/lib/utils";
import { t } from "@/lib/translations";
import type { TranslationKey } from "@/lib/translations";
import { Plus, Droplets, Leaf, Users, Package, MoreHorizontal, MapPin, Clock, Activity, CheckCircle2, ChevronRight, Sprout, HandCoins, Calendar, BookText, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ActivityLog {
  id: string;
  activityType: string;
  date: string;
  note?: string;
  workers?: number;
}

interface SeasonSummary {
  totalLogs: number;
  totalExpense: number;
  totalIncome: number;
  netProfitLoss: number;
}

const QUICK_ACTIONS = [
  { type: "khata", translationKey: "khata", emoji: "📒", icon: BookText, color: "bg-yellow-50 border-yellow-100 text-yellow-700", hoverColor: "group-hover:bg-yellow-100", shadow: "shadow-yellow-100", href: "/app/khata" },
  { type: "paani", translationKey: "water", emoji: "💧", icon: Droplets, color: "bg-blue-50 border-blue-100 text-blue-700", hoverColor: "group-hover:bg-blue-100", shadow: "shadow-blue-100" },
  { type: "dawai", translationKey: "pesticide", emoji: "🌿", icon: Leaf, color: "bg-emerald-50 border-emerald-100 text-emerald-700", hoverColor: "group-hover:bg-emerald-100", shadow: "shadow-emerald-100" },
  { type: "majdoor", translationKey: "workers", emoji: "👷", icon: Users, color: "bg-orange-50 border-orange-100 text-orange-700", hoverColor: "group-hover:bg-orange-100", shadow: "shadow-orange-100" },
  { type: "beej", translationKey: "seed", emoji: "🌱", icon: Package, color: "bg-purple-50 border-purple-100 text-purple-700", hoverColor: "group-hover:bg-purple-100", shadow: "shadow-purple-100" },
];

const getActionColor = (type: string) => {
  switch(type) {
    case "paani": return "bg-blue-400";
    case "dawai": return "bg-emerald-400";
    case "majdoor": return "bg-orange-400";
    case "beej": return "bg-purple-400";
    default: return "bg-gray-400";
  }
};

export default function HomePage() {
  const { user, activeSeason, activeFarm, apiCall, language, farms } = useApp();
  const router = useRouter();
  const [todayLogs, setTodayLogs] = useState<ActivityLog[]>([]);
  const [seasonSummary, setSeasonSummary] = useState<SeasonSummary | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState("");
  const [logNote, setLogNote] = useState("");
  const [logWorkers, setLogWorkers] = useState("");
  const [logAmount, setLogAmount] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState("");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const fetchTodayLogs = useCallback(async () => {
    if (!activeSeason?.id) return;
    try {
      const result = await apiCall<{ success: boolean; data: ActivityLog[] }>(
        `/api/seasons/${activeSeason.id}/logs`
      );
      if (result.success) {
        const today = new Date().toDateString();
        setTodayLogs(result.data.filter((l) => new Date(l.date).toDateString() === today));
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeSeason?.id, apiCall]);

  const fetchSeasonSummary = useCallback(async () => {
    if (!activeSeason?.id) return;
    try {
      const result = await apiCall<{ success: boolean; data: { summary: SeasonSummary } }>(
        `/api/seasons/${activeSeason.id}/report`
      );
      if (result.success) {
        setSeasonSummary(result.data.summary);
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeSeason?.id, apiCall]);

  useEffect(() => {
    fetchTodayLogs();
    fetchSeasonSummary();
  }, [fetchTodayLogs, fetchSeasonSummary]);

  const openLogModal = (actionType: string) => {
    setEditingLogId(null);
    setSelectedAction(actionType);
    setLogNote("");
    setLogWorkers("");
    setLogAmount("");
    setLogDate(new Date().toISOString().split("T")[0]);
    setLogError("");
    setShowLogModal(true);
  };

  const openEditModal = (log: ActivityLog) => {
    setEditingLogId(log.id);
    setSelectedAction(log.activityType);
    setLogNote(log.note || "");
    setLogWorkers(log.workers ? log.workers.toString() : "");
    setLogAmount("");
    setLogDate(new Date(log.date).toISOString().split("T")[0]);
    setLogError("");
    setShowLogModal(true);
  };

  const handleSaveLog = async () => {
    if (!activeSeason?.id) {
      setLogError(t(lang, "noActiveSeason" as TranslationKey));
      return;
    }
    setIsLogging(true);
    setLogError("");
    try {
      if (editingLogId) {
        await apiCall(`/api/seasons/${activeSeason.id}/logs/${editingLogId}`, {
          method: "PUT",
          body: JSON.stringify({
            activityType: selectedAction,
            date: logDate,
            note: logNote || undefined,
            workers: logWorkers ? parseInt(logWorkers) : undefined,
          }),
        });
      } else {
        await apiCall(`/api/seasons/${activeSeason.id}/logs`, {
          method: "POST",
          body: JSON.stringify({
            activityType: selectedAction,
            date: logDate,
            note: logNote || undefined,
            workers: logWorkers ? parseInt(logWorkers) : undefined,
            amount: logAmount ? parseFloat(logAmount) : undefined,
          }),
        });
      }
      setShowLogModal(false);
      await fetchTodayLogs();
    } catch (e) {
      setLogError(t(lang, "error" as TranslationKey));
      console.error(e);
    } finally {
      setIsLogging(false);
    }
  };

  const lang = language || "hi";
  const greeting = new Date().getHours() < 12 ? (lang === "en" ? "Good Morning" : "सुप्रभात") : new Date().getHours() < 17 ? (lang === "en" ? "Good Afternoon" : "नमस्ते") : (lang === "en" ? "Good Evening" : "शुभ संध्या");
  const daysActive = activeSeason ? daysDiff(activeSeason.startDate) : 0;
  
  const userName = user?.name || (lang === "en" ? "Farmer" : "किसान");
  const userState = user?.state || (lang === "en" ? "India" : "भारत");

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      {/* Header (Enterprise Design) */}
      <div className="relative bg-[#064e3b] px-5 pt-14 pb-10 overflow-hidden rounded-b-[2rem] shadow-md border-b border-green-800">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-green-300 opacity-10 blur-2xl"></div>

        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <span className="text-green-100 text-xs font-medium tracking-wider uppercase mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {greeting}
            </span>
            <h1 className="text-white text-3xl font-bold tracking-tight flex items-center gap-2">
              {userName}
            </h1>
            <p className="text-green-200 text-sm mt-1 flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5" /> {userState}
            </p>
          </div>
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-300 to-white rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative bg-white p-1 rounded-full border border-green-200 shadow-sm">
              <Image src="/logo.jpg" alt="Logo" width={56} height={56} className="rounded-full object-cover" />
            </div>
          </div>
        </div>

        {/* Active Season Card */}
        {activeSeason ? (
          <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/30 border border-green-400/30 text-green-50 text-xs font-medium mb-3 shadow-inner">
                  <Activity className="w-3.5 h-3.5" /> {t(lang, "activeSeasonLabel" as TranslationKey)}
                </div>
                <h2 className="text-white text-2xl font-bold tracking-tight mb-1 flex items-center gap-2">
                  <Sprout className="w-6 h-6 text-green-300" /> {activeSeason.cropName}
                </h2>
                <p className="text-green-100 text-sm flex items-center gap-1.5 opacity-90">
                  <Calendar className="w-4 h-4" /> {t(lang, "startedOn" as TranslationKey)} <span className="font-medium">{formatDate(activeSeason.startDate)}</span>
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="bg-white/20 px-3 py-1.5 rounded-xl border border-white/10 shadow-sm mb-2 text-center min-w-[70px]">
                  <p className="text-white text-3xl font-black leading-none mb-0.5">{daysActive}</p>
                  <p className="text-green-100 text-[10px] uppercase tracking-wider font-semibold">{t(lang, "days" as TranslationKey)}</p>
                </div>
                {seasonSummary && (
                  <div className={`inline-flex flex-col items-end gap-0.5 px-3 py-1.5 rounded-xl border shadow-sm ${
                    (seasonSummary.netProfitLoss || 0) > 0 ? 'bg-green-500/30 border-green-400/40 text-green-100' :
                    (seasonSummary.netProfitLoss || 0) < 0 ? 'bg-red-500/30 border-red-400/40 text-red-100' :
                    'bg-amber-900/40 border-amber-500/30 text-amber-100'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold text-sm">
                       <BookText className="w-4 h-4" /> 
                       {(seasonSummary.netProfitLoss || 0) >= 0 ? '+' : ''}{formatCurrency(seasonSummary.netProfitLoss || 0)}
                    </div>
                    <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80">{t(lang, "netBalance" as TranslationKey) || "Net Balance"}</span>
                  </div>
                )}
              </div>
            </div>
            {activeFarm && (
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <p className="text-green-100 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-300" /> <span className="font-semibold">{activeFarm.name}</span>
                </p>
                <span className="text-xs bg-white/20 px-2 py-1 rounded text-white font-medium">
                  {activeFarm.sizeAcre} {t(lang, "acre" as TranslationKey)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center shadow-lg border-dashed border-white/40">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sprout className="w-8 h-8 text-green-100" />
            </div>
            <p className="text-green-50 font-medium mb-4 text-lg">{t(lang, "noActiveSeason" as TranslationKey)}</p>
            <Button
              onClick={() => router.push("/app/farms")}
              className="bg-white text-green-700 hover:bg-green-50 shadow-md border-0 font-bold rounded-xl px-6 py-5 w-full max-w-[200px]"
            >
              <Plus className="w-5 h-5 mr-2" /> {t(lang, "addSeason" as TranslationKey)}
            </Button>
          </div>
        )}
      </div>

      {/* Today's Status */}
      <div className="px-5 -mt-6 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-5 mb-8 hover:shadow-2xl transition-shadow duration-300 flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${todayLogs.length > 0 ? 'bg-gradient-to-br from-green-100 to-green-200 text-green-600' : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400'}`}>
              {todayLogs.length > 0 ? <CheckCircle2 className="w-7 h-7" /> : <Activity className="w-7 h-7" />}
            </div>
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{t(lang, "todayWork" as TranslationKey)}</p>
              <p className="text-gray-900 font-extrabold text-xl">
                {todayLogs.length > 0 ? `${todayLogs.length} ${t(lang, "completedTasks" as TranslationKey)}` : t(lang, "nothingYet" as TranslationKey)}
              </p>
            </div>
          </div>
          {todayLogs.length > 0 && (
            <div className="text-right">
              <div className="flex -space-x-2">
                 {todayLogs.slice(0, 3).map((log, i) => {
                    const action = QUICK_ACTIONS.find(a => a.type === log.activityType);
                    const ActionIcon = action?.icon || Activity;
                    return (
                       <div key={i} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm relative ${action?.color.split(' ')[0]} ${action?.color.split(' ')[2]}`} style={{ zIndex: 10 - i }}>
                          <ActionIcon className="w-4 h-4" strokeWidth={2.5} />
                       </div>
                    )
                 })}
                 {todayLogs.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm relative z-0">
                      +{todayLogs.length - 3}
                    </div>
                 )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-800 font-bold text-lg flex items-center gap-2">
            {t(lang, "quickActions" as TranslationKey)}
          </h2>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const ActionIcon = action.icon;
            return (
            <button
              key={action.type}
              onClick={() => {
                if (action.href) {
                  router.push(action.href);
                } else {
                  openLogModal(action.type);
                }
              }}
              className="group relative flex flex-col items-center gap-2"
            >
              <div className={`w-full aspect-square rounded-[1.25rem] border ${action.color} ${action.hoverColor} ${action.shadow} shadow-sm flex items-center justify-center transition-all duration-300 transform group-hover:-translate-y-1 group-hover:shadow-md group-active:scale-95 group-active:translate-y-0 relative overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <ActionIcon className="w-8 h-8 drop-shadow-sm group-hover:scale-110 transition-transform duration-300 relative z-10" strokeWidth={2.5} />
              </div>
              <span className="text-[11px] font-bold text-gray-600 text-center leading-tight group-hover:text-gray-900 transition-colors">
                {t(lang, action.translationKey as TranslationKey)}
              </span>
            </button>
            );
          })}
        </div>
      </div>

      {/* No farms CTA (Enterprise Empty State) */}
      {farms.length === 0 && (
        <div className="mx-5 mb-8">
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 text-lg">No Farms Registered</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs leading-relaxed">
              Start your digital farming journey by adding your first farm. Track expenses, activities, and harvests easily.
            </p>
            <Button 
              onClick={() => router.push("/app/farms")} 
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-6 h-11 font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" /> {t(lang, "addFarm" as TranslationKey)}
            </Button>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {todayLogs.length > 0 && (
        <div className="px-5 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-800 font-bold text-lg flex items-center gap-2">
              {t(lang, "recentActivity" as TranslationKey)}
            </h2>
            <button className="text-green-600 text-xs font-bold uppercase tracking-wider hover:text-green-700 flex items-center">
              {t(lang, "viewAll" as TranslationKey)} <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
          <div className="space-y-3">
            {todayLogs.map((log) => {
              const action = QUICK_ACTIONS.find(a => a.type === log.activityType);
              const ActionIcon = action?.icon || Activity;
              
              return (
                <div key={log.id} className="group bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-green-200 hover:shadow-md transition-all duration-300 relative overflow-hidden flex items-center gap-4 cursor-pointer">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${getActionColor(log.activityType)} opacity-70`}></div>
                  
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${action?.color}`}>
                    <ActionIcon className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-gray-800">{action ? t(lang, action.translationKey as TranslationKey) : log.activityType}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-400 text-[11px] font-medium whitespace-nowrap">
                          {formatDate(log.date)}
                        </p>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEditModal(log); }}
                          className="p-1 text-gray-400 hover:text-green-600 bg-gray-50 hover:bg-green-50 rounded transition-colors"
                          title={t(lang, "edit" as TranslationKey) || "Edit"}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    {log.note && <p className="text-gray-600 text-sm line-clamp-1">{log.note}</p>}
                    {log.workers && (
                      <div className="mt-2 inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                        <Users className="w-3 h-3" /> {log.workers} मजदूर
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-md mx-auto rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl">
          <div className={`px-6 py-8 ${QUICK_ACTIONS.find(a => a.type === selectedAction)?.color.split(' ')[0] || 'bg-gray-50'}`}>
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md mb-4 transform hover:scale-110 transition-transform ${QUICK_ACTIONS.find(a => a.type === selectedAction)?.color.split(' ')[2]}`}>
                 {(() => {
                    const action = QUICK_ACTIONS.find(a => a.type === selectedAction);
                    const ActionIcon = action?.icon || Activity;
                    return <ActionIcon className="w-10 h-10" strokeWidth={2.5} />;
                 })()}
              </div>
              <DialogTitle className="text-2xl font-black text-gray-800">
                {editingLogId ? t(lang, "edit" as TranslationKey) || "Edit Log" : t(lang, "addLog" as TranslationKey)}
              </DialogTitle>
              <p className="text-gray-600 text-sm mt-2 font-medium">
                {QUICK_ACTIONS.find(a => a.type === selectedAction) ? t(lang, QUICK_ACTIONS.find(a => a.type === selectedAction)!.translationKey as TranslationKey) : ""}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5 bg-white">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">📅 {t(lang, "date" as TranslationKey)}</label>
              <Input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-green-500 focus:border-green-500 transition-all text-gray-800 font-medium"
              />
            </div>

            {!editingLogId && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>💰 Kharcha (Amount in ₹)</span>
                  <span className="text-[10px] text-gray-400 normal-case font-normal">(Optional, adds to Khata)</span>
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={logAmount}
                  onChange={(e) => setLogAmount(e.target.value)}
                  min="0"
                  className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-green-500 focus:border-green-500 transition-all text-gray-800 font-medium"
                />
              </div>
            )}

            {selectedAction === "majdoor" && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">👷 {t(lang, "workerCount" as TranslationKey)}</label>
                <Input
                  type="number"
                  placeholder="e.g. 5"
                  value={logWorkers}
                  onChange={(e) => setLogWorkers(e.target.value)}
                  min="1"
                  className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-800 font-medium"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">📝 {t(lang, "note" as TranslationKey)}</label>
              <Input
                placeholder="..."
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-green-500 focus:border-green-500 transition-all text-gray-800 font-medium"
              />
            </div>

            {logError && (
              <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-2 font-medium">
                <span className="text-xl leading-none">⚠️</span> {logError}
              </div>
            )}

            <div className="pt-2">
              <Button
                className={`w-full h-14 rounded-xl text-white font-bold text-lg shadow-lg transition-all active:scale-95 ${
                  selectedAction === 'majdoor' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20' : 
                  selectedAction === 'paani' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' :
                  'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                }`}
                onClick={handleSaveLog}
                isLoading={isLogging}
              >
                {t(lang, "save")} ✓
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

