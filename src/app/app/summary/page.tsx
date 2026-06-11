"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate, daysDiff } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SeasonReport {
  season: { id: string; cropName: string; startDate: string; endDate?: string; status: string };
  farm: { name: string; sizeAcre: number; location: string };
  summary: {
    totalExpense: number;
    totalIncome: number;
    netProfitLoss: number;
    isProfit: boolean;
    workingDays: number;
    totalLogs: number;
    totalHarvests: number;
  };
  expensePieData: { name: string; value: number }[];
  weeklyChartData: { week: string; count: number }[];
  activitySummary: Record<string, number>;
  harvests: { id: string; quantity: number; unit: string; pricePerUnit: number; totalIncome: number; date: string; buyerName?: string }[];
}

const EXPENSE_COLORS: Record<string, string> = {
  beej: "#22c55e",
  khad: "#f59e0b",
  dawai: "#ef4444",
  majdoor: "#f97316",
  machinary: "#3b82f6",
  other: "#8b5cf6",
};

const EXPENSE_LABELS: Record<string, string> = {
  beej: "🌱 बीज",
  khad: "🧪 खाद",
  dawai: "💊 दवाई",
  majdoor: "👷 मजदूर",
  machinary: "🚜 मशीनरी",
  other: "📦 अन्य",
};

const ACTIVITY_LABELS: Record<string, string> = {
  paani: "💧 पानी",
  dawai: "🌿 दवाई",
  beej: "🌱 बीज",
  majdoor: "👷 मजदूर",
  other: "✏️ अन्य",
};

export default function SummaryPage() {
  const { activeSeason, activeFarm, apiCall } = useApp();
  const router = useRouter();
  const [report, setReport] = useState<SeasonReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [harvestQuantity, setHarvestQuantity] = useState("");
  const [harvestUnit, setHarvestUnit] = useState<"quintal" | "kg" | "ton">("quintal");
  const [harvestPrice, setHarvestPrice] = useState("");
  const [harvestBuyer, setHarvestBuyer] = useState("");
  const [isAddingHarvest, setIsAddingHarvest] = useState(false);
  const [harvestError, setHarvestError] = useState("");

  const fetchReport = useCallback(async () => {
    if (!activeSeason?.id) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const result = await apiCall<{ success: boolean; data: SeasonReport }>(
        `/api/seasons/${activeSeason.id}/report`
      );
      if (result.success) setReport(result.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [activeSeason?.id, apiCall]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleAddHarvest = async () => {
    if (!harvestQuantity || !harvestPrice) { setHarvestError("मात्रा और कीमत जरूरी है"); return; }
    if (!activeSeason?.id) return;
    setIsAddingHarvest(true);
    setHarvestError("");
    try {
      await apiCall(`/api/seasons/${activeSeason.id}/harvests`, {
        method: "POST",
        body: JSON.stringify({
          quantity: parseFloat(harvestQuantity),
          unit: harvestUnit,
          pricePerUnit: parseFloat(harvestPrice),
          buyerName: harvestBuyer || undefined,
        }),
      });
      setShowHarvestModal(false);
      setHarvestQuantity(""); setHarvestPrice(""); setHarvestBuyer("");
      await fetchReport();
    } catch (e) {
      setHarvestError("कटाई जोड़ने में गड़बड़ी");
      console.error(e);
    } finally { setIsAddingHarvest(false); }
  };

  if (!activeSeason) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">कोई फसल चालू नहीं</h2>
        <p className="text-gray-500 text-sm mb-6">रिपोर्ट देखने के लिए फसल शुरू करें</p>
        <Button onClick={() => router.push("/app/farms")}>🌱 फसल शुरू करें</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
          <p className="text-gray-500">रिपोर्ट तैयार हो रही है...</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const { summary, expensePieData, weeklyChartData, activitySummary, harvests } = report;
  const daysActive = daysDiff(report.season.startDate, report.season.endDate);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className={`px-4 pt-12 pb-8 ${summary.isProfit ? "bg-gradient-to-r from-green-600 to-emerald-700" : "bg-gradient-to-r from-red-500 to-rose-700"}`}>
        <h1 className="text-white text-xl font-bold mb-1">📊 फसल रिपोर्ट</h1>
        <p className="text-white/80 text-sm">{activeFarm?.name} • {activeSeason.cropName}</p>
        <p className="text-white/60 text-xs mt-1">
          {formatDate(report.season.startDate)} — {report.season.endDate ? formatDate(report.season.endDate) : "जारी है"}
          {" · "}{daysActive} दिन
        </p>

        {/* Big Numbers */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-white/15 rounded-2xl p-4">
            <p className="text-white/70 text-xs mb-1">कुल खर्चा</p>
            <p className="text-white text-xl font-bold">{formatCurrency(summary.totalExpense)}</p>
          </div>
          <div className="bg-white/15 rounded-2xl p-4">
            <p className="text-white/70 text-xs mb-1">कुल कमाई</p>
            <p className="text-white text-xl font-bold">{formatCurrency(summary.totalIncome)}</p>
          </div>
        </div>

        <div className="bg-white/20 rounded-2xl p-4 mt-3">
          <p className="text-white/70 text-xs mb-1">
            {summary.isProfit ? "💚 कुल फायदा" : "🔴 कुल नुकसान"}
          </p>
          <p className="text-white text-3xl font-bold">
            {summary.isProfit ? "+" : "-"}{formatCurrency(Math.abs(summary.netProfitLoss))}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 -mt-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-800">{summary.workingDays}</p>
              <p className="text-gray-500 text-xs">काम के दिन</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{summary.totalLogs}</p>
              <p className="text-gray-500 text-xs">कुल रिकॉर्ड</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{summary.totalHarvests}</p>
              <p className="text-gray-500 text-xs">कटाई बिक्री</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Harvest Button */}
      <div className="px-4 mb-6">
        <Button
          className="w-full h-12"
          variant="amber"
          onClick={() => { setHarvestError(""); setShowHarvestModal(true); }}
        >
          🌾 कटाई जोड़ें / Harvest Log
        </Button>
      </div>

      {/* Expense Pie Chart */}
      {expensePieData.length > 0 && (
        <div className="px-4 mb-6">
          <Card className="p-4">
            <h3 className="font-semibold text-gray-800 mb-4">💰 खर्चे का विवरण</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={expensePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expensePieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={EXPENSE_COLORS[entry.name] || "#8b5cf6"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), ""]}
                />
                <Legend
                  formatter={(value) => EXPENSE_LABELS[value] || value}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Weekly Activity Chart */}
      {weeklyChartData.length > 0 && (
        <div className="px-4 mb-6">
          <Card className="p-4">
            <h3 className="font-semibold text-gray-800 mb-4">📅 साप्ताहिक गतिविधि</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyChartData}>
                <XAxis
                  dataKey="week"
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                />
                <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} name="काम" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Activity Summary */}
      {Object.keys(activitySummary).length > 0 && (
        <div className="px-4 mb-6">
          <Card className="p-4">
            <h3 className="font-semibold text-gray-800 mb-3">📋 गतिविधि सारांश</h3>
            <div className="space-y-2">
              {Object.entries(activitySummary).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm">{ACTIVITY_LABELS[type] || type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.min((count / summary.totalLogs) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Harvest History */}
      {harvests.length > 0 && (
        <div className="px-4 mb-6">
          <Card className="p-4">
            <h3 className="font-semibold text-gray-800 mb-3">🌾 कटाई का हिसाब</h3>
            <div className="space-y-3">
              {harvests.map(h => (
                <div key={h.id} className="flex justify-between items-start border-b border-gray-100 pb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{h.quantity} {h.unit}</p>
                    <p className="text-xs text-gray-500">₹{h.pricePerUnit}/{h.unit}</p>
                    {h.buyerName && <p className="text-xs text-gray-400">खरीदार: {h.buyerName}</p>}
                    <p className="text-xs text-gray-400">{formatDate(h.date)}</p>
                  </div>
                  <p className="text-green-600 font-bold">{formatCurrency(h.totalIncome)}</p>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1">
                <p className="font-semibold text-gray-700">कुल कमाई</p>
                <p className="font-bold text-green-600 text-lg">{formatCurrency(summary.totalIncome)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Harvest Modal */}
      <Dialog open={showHarvestModal} onOpenChange={setShowHarvestModal}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>🌾 कटाई जोड़ें</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">मात्रा</label>
              <Input
                type="number"
                placeholder="जैसे: 20"
                value={harvestQuantity}
                onChange={(e) => setHarvestQuantity(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">इकाई</label>
              <Select value={harvestUnit} onValueChange={(v) => setHarvestUnit(v as typeof harvestUnit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quintal">क्विंटल (Quintal)</SelectItem>
                  <SelectItem value="kg">किलोग्राम (KG)</SelectItem>
                  <SelectItem value="ton">टन (Ton)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">प्रति इकाई कीमत (₹)</label>
              <Input
                type="number"
                placeholder="जैसे: 1800"
                value={harvestPrice}
                onChange={(e) => setHarvestPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">खरीदार (वैकल्पिक)</label>
              <Input
                placeholder="खरीदार का नाम"
                value={harvestBuyer}
                onChange={(e) => setHarvestBuyer(e.target.value)}
              />
            </div>
            {harvestQuantity && harvestPrice && (
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-green-700 font-bold text-lg">
                  कुल: {formatCurrency(parseFloat(harvestQuantity) * parseFloat(harvestPrice))}
                </p>
              </div>
            )}
            {harvestError && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">⚠️ {harvestError}</div>
            )}
            <Button className="w-full h-12" onClick={handleAddHarvest} isLoading={isAddingHarvest}>
              💾 सेव करें
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
