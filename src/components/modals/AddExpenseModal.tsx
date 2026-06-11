"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/context/AppContext";
import { t, TranslationKey } from "@/lib/translations";

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: "beej", labelKey: "seed" },
  { value: "khad", labelKey: "pesticide" }, // We don't have khad in translation, will use generic or fallback
  { value: "dawai", labelKey: "pesticide" },
  { value: "majdoor", labelKey: "workers" },
  { value: "machinary", labelKey: "other" },
  { value: "other", labelKey: "other" },
];

export function AddExpenseModal({ open, onOpenChange, onSuccess }: AddExpenseModalProps) {
  const { activeSeason, apiCall, language } = useApp();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const lang = language || "hi";

  const handleSave = async () => {
    if (!activeSeason?.id) {
      setError(t(lang, "noActiveSeason" as TranslationKey));
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError(t(lang, "error" as TranslationKey));
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const res = await apiCall<{ success: boolean; error?: string }>(`/api/seasons/${activeSeason.id}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          category,
          description: description || undefined,
          date,
        }),
      });
      if (res.success) {
        setAmount("");
        setDescription("");
        setCategory("other");
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
        <div className="px-6 py-6 bg-red-50 border-b border-red-100 flex flex-col items-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-3 text-red-500 text-3xl">
            💸
          </div>
          <DialogTitle className="text-2xl font-black text-red-900">
            {t(lang, "addExpense" as TranslationKey)}
          </DialogTitle>
        </div>

        <div className="p-6 space-y-4 bg-white">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{t(lang, "amount" as TranslationKey)} (₹)</label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-red-500 focus:border-red-500 text-lg font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{t(lang, "category" as TranslationKey)}</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-red-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {t(lang, cat.labelKey as TranslationKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{t(lang, "description" as TranslationKey)}</label>
            <Input
              placeholder="..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">📅 {t(lang, "date" as TranslationKey)}</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100 font-medium">
              ⚠️ {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              className="w-full h-14 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg shadow-lg shadow-red-600/20 active:scale-95 transition-all"
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
