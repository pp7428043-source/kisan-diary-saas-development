"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { t, TranslationKey } from "@/lib/translations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddExpenseModal } from "@/components/modals/AddExpenseModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { TrendingDown, TrendingUp, Plus, Minus, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LedgerEntry {
  id: string;
  type: "income" | "expense";
  amount: number;
  title: string;
  category?: string;
  unit?: string;
  date: string;
  sourceId: string;
}

interface ProcessedLedgerEntry extends LedgerEntry {
  runningBalance: number;
}

export default function KhataPage() {
  const { user, activeSeason, apiCall, language } = useApp();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);

  const lang = language || "hi";

  const fetchLedger = useCallback(async () => {
    if (!activeSeason?.id) {
       setIsLoading(false);
       return;
    }
    try {
      const res = await apiCall<{ success: boolean; data: LedgerEntry[] }>(`/api/seasons/${activeSeason.id}/ledger`);
      if (res.success) {
        setEntries(res.data);
      }
      
      const reportRes = await apiCall<{ success: boolean; data: any }>(`/api/seasons/${activeSeason.id}/report`);
      if (reportRes.success && reportRes.data.summary) {
         setTotalIncome(reportRes.data.summary.totalIncome || 0);
         setTotalExpense(reportRes.data.summary.totalExpense || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [activeSeason?.id, apiCall]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const processedEntries = useMemo(() => {
    // Sort oldest first to calculate running balance
    const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let currentBalance = 0;
    const processed: ProcessedLedgerEntry[] = sorted.map(entry => {
      if (entry.type === 'income') {
        currentBalance += entry.amount;
      } else {
        currentBalance -= entry.amount;
      }
      return { ...entry, runningBalance: currentBalance };
    });
    // Reverse back to newest first
    return processed.reverse();
  }, [entries]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, ProcessedLedgerEntry[]> = {};
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    processedEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      const dateStr = entryDate.toISOString().split('T')[0];
      
      let groupName = "Older";
      if (dateStr === today) {
        groupName = "Today";
      } else if (dateStr === yesterday) {
        groupName = "Yesterday";
      } else if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
        groupName = "This Month";
      }

      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(entry);
    });

    return groups;
  }, [processedEntries]);

  const netBalance = totalIncome - totalExpense;

  if (isLoading) {
     return <div className="p-8 text-center text-gray-500">{t(lang, "loading" as TranslationKey)}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32">
      {/* Top Header & Summary Card */}
      <div className="bg-gradient-to-br from-[#166534] via-[#15803d] to-[#22c55e] px-5 pt-8 pb-10 rounded-b-[2.5rem] shadow-lg">
         <h1 className="text-white text-2xl font-extrabold tracking-tight mb-5 flex items-center gap-2">
           📒 {t(lang, "khata" as TranslationKey) || "Khata"}
         </h1>
         
         <div className="bg-white rounded-[1.5rem] p-5 shadow-xl">
            <div className="text-center mb-5">
               <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">{t(lang, "netBalance" as TranslationKey) || "Net Balance"}</p>
               <h2 className={`text-4xl font-black tracking-tight ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
               </h2>
            </div>
            
            <div className="flex justify-between border-t border-gray-100 pt-4 mt-2">
               <div className="text-center flex-1 border-r border-gray-100">
                  <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">{t(lang, "totalIncome" as TranslationKey)} (आमदनी)</p>
                  <p className="text-green-600 font-extrabold text-lg flex items-center justify-center gap-1">
                     <TrendingUp className="w-4 h-4" /> {formatCurrency(totalIncome)}
                  </p>
               </div>
               <div className="text-center flex-1">
                  <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">{t(lang, "totalExpense" as TranslationKey)} (खर्च)</p>
                  <p className="text-red-600 font-extrabold text-lg flex items-center justify-center gap-1">
                     <TrendingDown className="w-4 h-4" /> {formatCurrency(totalExpense)}
                  </p>
               </div>
            </div>
         </div>
      </div>

      {/* Transaction Feed */}
      <div className="px-5 mt-6 relative z-10">
         {processedEntries.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 mt-4">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sprout className="w-8 h-8 text-gray-400" />
               </div>
               <p className="text-gray-500 font-medium mb-2">अभी तक कोई खर्च या आमदनी नहीं जोड़ी गई।</p>
               <p className="text-gray-400 text-sm">नीचे दिए गए बटन से पहला रिकॉर्ड जोड़ें।</p>
            </div>
         ) : (
            <div className="space-y-6">
               {Object.entries(groupedEntries).map(([group, groupEntries]) => (
                 <div key={group}>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 pl-1">{group}</h3>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                       {groupEntries.map(entry => (
                          <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner flex-shrink-0 ${entry.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                   {entry.type === 'income' ? <Plus className="w-5 h-5" strokeWidth={3} /> : <Minus className="w-5 h-5" strokeWidth={3} />}
                                </div>
                                <div>
                                   <p className="font-bold text-gray-800 leading-tight">
                                      {entry.type === 'income' ? '🟢' : '🔴'} {t(lang, entry.title as TranslationKey) || entry.title}
                                   </p>
                                   <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                                      {formatDate(entry.date)} {entry.category || entry.unit ? `• ${entry.category || entry.unit}` : ''}
                                   </p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className={`font-black ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                   {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                   Bal: {formatCurrency(entry.runningBalance)}
                                </p>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
         )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-[4rem] left-1/2 -translate-x-1/2 w-full max-w-lg p-4 bg-gradient-to-t from-white via-white/95 to-transparent z-30 pb-6 pointer-events-none">
         <div className="flex gap-3 pointer-events-auto">
            <Button 
              onClick={() => setShowExpenseModal(true)}
              className="flex-1 h-14 rounded-2xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-lg shadow-sm active:scale-95 transition-all border border-red-200"
            >
               🔴 खर्च जोड़ें
            </Button>
            <Button 
              onClick={() => setShowIncomeModal(true)}
              className="flex-1 h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-md shadow-green-600/20 active:scale-95 transition-all"
            >
               🟢 आमदनी जोड़ें
            </Button>
         </div>
      </div>

      <AddExpenseModal open={showExpenseModal} onOpenChange={setShowExpenseModal} onSuccess={fetchLedger} />
      <AddIncomeModal open={showIncomeModal} onOpenChange={setShowIncomeModal} onSuccess={fetchLedger} />
    </div>
  );
}
