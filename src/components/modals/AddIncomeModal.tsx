"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/context/AppContext";
import { t, TranslationKey } from "@/lib/translations";

interface AddIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const UNITS = [
  { value: "quintal", label: "क्विंटल (Quintal)" },
  { value: "kg", label: "किलो (Kg)" },
  { value: "ton", label: "टन (Ton)" },
];

export function AddIncomeModal({ open, onOpenChange, onSuccess }: AddIncomeModalProps) {
  const { activeSeason, apiCall, language } = useApp();
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("quintal");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const lang = language || "hi";
  const totalCalculated = (Number(quantity) || 0) * (Number(pricePerUnit) || 0);

  const handleSave = async () => {
    if (!activeSeason?.id) {
      setError(t(lang, "noActiveSeason" as TranslationKey));
      return;
    }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setError("Please enter a valid quantity");
      return;
    }
    if (!pricePerUnit || isNaN(Number(pricePerUnit)) || Number(pricePerUnit) <= 0) {
      setError("Please enter a valid price");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const res = await apiCall<{ success: boolean; error?: string }>(`/api/seasons/${activeSeason.id}/harvests`, {
        method: "POST",
        body: JSON.stringify({
          quantity: Number(quantity),
          unit,
          pricePerUnit: Number(pricePerUnit),
          buyerName: buyerName || undefined,
          date,
        }),
      });
      if (res.success) {
        setQuantity("");
        setPricePerUnit("");
        setBuyerName("");
        onSuccess();
        onOpenChange(false);
      } else {
        setError(res.error || t(lang, "error" as TranslationKey));
      }
    } catch (e) {
      setError(t(lang, "error" as TranslationKey));
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl">
        <div className="px-6 py-6 bg-green-50 border-b border-green-100 flex flex-col items-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-3 text-green-500 text-3xl">
            💰
          </div>
          <DialogTitle className="text-2xl font-black text-green-900">
            {t(lang, "addIncome" as TranslationKey)}
          </DialogTitle>
        </div>

        <div className="p-6 space-y-4 bg-white">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{t(lang, "quantity" as TranslationKey)}</label>
              <Input
                type="number"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-green-500 focus:border-green-500 text-lg font-bold"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{t(lang, "unit" as TranslationKey)}</label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-green-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{t(lang, "pricePerUnit" as TranslationKey)} (₹)</label>
            <Input
              type="number"
              placeholder="0"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-green-500 focus:border-green-500 text-lg font-bold"
            />
          </div>

          {totalCalculated > 0 && (
             <div className="bg-green-50 p-3 rounded-xl border border-green-200 flex justify-between items-center">
                <span className="text-sm font-bold text-green-800">Total / कुल:</span>
                <span className="text-lg font-black text-green-700">₹{totalCalculated.toLocaleString('en-IN')}</span>
             </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{t(lang, "buyerName" as TranslationKey)}</label>
            <Input
              placeholder="..."
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">📅 {t(lang, "date" as TranslationKey)}</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100 font-medium">
              ⚠️ {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              className="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg shadow-green-600/20 active:scale-95 transition-all"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? t(lang, "loading" as TranslationKey) : t(lang, "save" as TranslationKey)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
