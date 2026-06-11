"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { t } from "@/lib/translations";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
}

const CATEGORIES = [
  { value: "beej", label: "🌱 बीज", color: "bg-green-100 text-green-800" },
  { value: "khad", label: "🧪 खाद", color: "bg-yellow-100 text-yellow-800" },
  { value: "dawai", label: "💊 दवाई", color: "bg-red-100 text-red-800" },
  { value: "majdoor", label: "👷 मजदूर", color: "bg-orange-100 text-orange-800" },
  { value: "machinary", label: "🚜 मशीनरी", color: "bg-blue-100 text-blue-800" },
  { value: "other", label: "📦 अन्य", color: "bg-gray-100 text-gray-800" },
];

const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[5];

export default function KharchaPage() {
  const { activeSeason, activeFarm, apiCall, language } = useApp();
  const router = useRouter();
  const lang = language;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<Record<string, number>>({});
  const [totalExpense, setTotalExpense] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!activeSeason?.id) return;
    try {
      const [listResult, summaryResult] = await Promise.all([
        apiCall<{ success: boolean; data: Expense[] }>(`/api/seasons/${activeSeason.id}/expenses`),
        apiCall<{ success: boolean; data: { summary: Record<string, number>; total: number } }>(
          `/api/seasons/${activeSeason.id}/expenses?summary=true`
        ),
      ]);
      if (listResult.success) setExpenses(listResult.data);
      if (summaryResult.success) {
        setMonthlySummary(summaryResult.data.summary);
        setTotalExpense(summaryResult.data.total);
      }
    } catch (e) { console.error(e); }
  }, [activeSeason?.id, apiCall]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleAddExpense = async () => {
    if (!category) { setError("श्रेणी चुनें"); return; }
    if (!amount || parseFloat(amount) <= 0) { setError("सही रकम दर्ज करें"); return; }
    if (!activeSeason?.id) { setError("कोई फसल चालू नहीं"); return; }
    setIsLoading(true);
    setError("");
    try {
      await apiCall(`/api/seasons/${activeSeason.id}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          category,
          amount: parseFloat(amount),
          date: expenseDate,
          description: description || undefined,
        }),
      });
      setShowAddModal(false);
      setCategory("");
      setAmount("");
      setDescription("");
      await fetchExpenses();
    } catch (e) {
      setError("खर्चा जोड़ने में गड़बड़ी");
      console.error(e);
    } finally { setIsLoading(false); }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await apiCall(`/api/expenses/${id}`, { method: "DELETE" });
      await fetchExpenses();
    } catch (e) { console.error(e); }
    finally { setIsDeleting(null); }
  };

  // Group expenses by date
  const grouped = expenses.reduce((acc, exp) => {
    const dateKey = new Date(exp.date).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(exp);
    return acc;
  }, {} as Record<string, Expense[]>);

  if (!activeSeason) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-5xl mb-4">💰</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">कोई फसल चालू नहीं</h2>
        <p className="text-gray-500 text-center text-sm mb-6">खर्चा जोड़ने के लिए पहले फसल शुरू करें</p>
        <Button onClick={() => router.push("/app/farms")}>🌱 फसल शुरू करें</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-4 pt-12 pb-6">
        <h1 className="text-white text-xl font-bold mb-1">💰 {t(lang, "expense")}</h1>
        <p className="text-orange-100 text-sm">{activeFarm?.name} • {activeSeason.cropName}</p>

        <div className="mt-4 bg-white/20 rounded-2xl p-4">
          <p className="text-orange-100 text-xs mb-1">कुल खर्चा</p>
          <p className="text-white text-3xl font-bold">{formatCurrency(totalExpense)}</p>
        </div>
      </div>

      {/* Category Summary */}
      <div className="px-4 -mt-2 mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3">श्रेणीवार खर्चा</p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => {
              const amt = monthlySummary[cat.value] || 0;
              if (amt === 0) return null;
              return (
                <div key={cat.value} className={`rounded-xl p-2 text-center ${cat.color}`}>
                  <p className="text-xs font-medium">{cat.label}</p>
                  <p className="text-sm font-bold">₹{amt.toLocaleString("en-IN")}</p>
                </div>
              );
            })}
          </div>
          {Object.values(monthlySummary).every(v => v === 0) && (
            <p className="text-gray-400 text-sm text-center">अभी तक कोई खर्चा नहीं</p>
          )}
        </div>
      </div>

      {/* Expense List */}
      <div className="px-4 mb-24">
        {Object.entries(grouped).map(([date, dateExpenses]) => (
          <div key={date} className="mb-4">
            <p className="text-gray-500 text-xs font-semibold uppercase mb-2">
              📅 {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
            </p>
            <div className="space-y-2">
              {dateExpenses.map(exp => {
                const catInfo = getCategoryInfo(exp.category);
                return (
                  <Card key={exp.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${catInfo.color}`}>
                        {catInfo.label}
                      </span>
                      <div className="flex-1">
                        {exp.description && (
                          <p className="text-gray-600 text-xs">{exp.description}</p>
                        )}
                      </div>
                      <p className="text-gray-800 font-bold">{formatCurrency(exp.amount)}</p>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        disabled={isDeleting === exp.id}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {expenses.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💸</div>
            <p className="text-gray-500">अभी तक कोई खर्चा नहीं</p>
            <p className="text-gray-400 text-sm">+ बटन से जोड़ें</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          setCategory("");
          setAmount("");
          setDescription("");
          setExpenseDate(new Date().toISOString().split("T")[0]);
          setError("");
          setShowAddModal(true);
        }}
        className="fixed bottom-32 right-4 bg-amber-500 hover:bg-amber-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-20 transition-transform active:scale-95"
      >
        <Plus size={24} />
      </button>

      {/* Add Expense Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>💰 {t(lang, "addExpense")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">श्रेणी</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="खर्चे का प्रकार चुनें" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">💵 रकम (₹)</label>
              <Input
                type="number"
                placeholder="जैसे: 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">📅 तारीख</label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">📝 विवरण (वैकल्पिक)</label>
              <Input
                placeholder="जैसे: 50 किलो DAP खाद"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">⚠️ {error}</div>
            )}

            <Button className="w-full h-12" onClick={handleAddExpense} isLoading={isLoading}>
              💾 {t(lang, "save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
