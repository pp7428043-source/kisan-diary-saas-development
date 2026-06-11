"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/translations";
import { Plus, MapPin, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function FarmsPage() {
  const { user, farms, activeFarm, activeSeason, setActiveFarm, setActiveSeason, apiCall, refreshFarms, language } = useApp();
  const lang = language;

  const [showAddFarmModal, setShowAddFarmModal] = useState(false);
  const [showAddSeasonModal, setShowAddSeasonModal] = useState<{ farmId: string, farmName: string } | null>(null);

  // Add Farm Form
  const [farmName, setFarmName] = useState("");
  const [farmSize, setFarmSize] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [isAddingFarm, setIsAddingFarm] = useState(false);
  const [farmError, setFarmError] = useState("");

  // Add Season Form
  const [cropName, setCropName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [isAddingSeason, setIsAddingSeason] = useState(false);
  const [seasonError, setSeasonError] = useState("");

  const handleAddFarm = async () => {
    if (!farmName || !farmSize || !farmLocation) {
      setFarmError("सभी जानकारी भरें");
      return;
    }
    setIsAddingFarm(true);
    setFarmError("");
    try {
      await apiCall("/api/farms", {
        method: "POST",
        body: JSON.stringify({
          name: farmName,
          sizeAcre: parseFloat(farmSize),
          location: farmLocation,
        }),
      });
      setShowAddFarmModal(false);
      setFarmName(""); setFarmSize(""); setFarmLocation("");
      await refreshFarms();
    } catch (e) {
      setFarmError("खेत जोड़ने में गड़बड़ी");
    } finally {
      setIsAddingFarm(false);
    }
  };

  const handleAddSeason = async () => {
    if (!showAddSeasonModal?.farmId || !cropName || !startDate) {
      setSeasonError("फसल का नाम और तारीख जरूरी है");
      return;
    }
    setIsAddingSeason(true);
    setSeasonError("");
    try {
      await apiCall(`/api/farms/${showAddSeasonModal.farmId}/seasons`, {
        method: "POST",
        body: JSON.stringify({
          cropName,
          startDate,
        }),
      });
      setShowAddSeasonModal(null);
      setCropName("");
      await refreshFarms();
    } catch (e) {
      setSeasonError("फसल शुरू करने में गड़बड़ी");
    } finally {
      setIsAddingSeason(false);
    }
  };

  const handleSelectFarm = (farm: any) => {
    setActiveFarm(farm);
    if (farm.activeSeason) {
      setActiveSeason(farm.activeSeason);
    } else {
      setActiveSeason(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-4 pt-12 pb-8 rounded-b-3xl">
        <h1 className="text-white text-2xl font-bold mb-1">🌾 {t(lang, "myFarms")}</h1>
        <p className="text-emerald-100 text-sm">अपने खेतों और फसलों का प्रबंधन करें</p>
        
        <div className="mt-4 flex gap-3">
          <Button 
            onClick={() => setShowAddFarmModal(true)}
            className="bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl flex-1 font-semibold"
          >
            <Plus size={18} className="mr-2" /> {t(lang, "addFarm")}
          </Button>
        </div>
      </div>

      {/* Farms List */}
      <div className="px-4 mt-6 space-y-4">
        {farms.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🚜</div>
            <p className="text-gray-500 font-medium">कोई खेत नहीं जोड़ा गया है</p>
            <p className="text-gray-400 text-sm mt-1">ऊपर दिए गए बटन से पहला खेत जोड़ें</p>
          </div>
        ) : (
          farms.map((farm) => {
            const isActive = activeFarm?.id === farm.id;
            return (
              <Card 
                key={farm.id} 
                className={`overflow-hidden border-2 transition-all ${isActive ? 'border-emerald-500 shadow-emerald-100/50 shadow-lg' : 'border-transparent hover:border-emerald-200'}`}
              >
                <div 
                  className="p-4 cursor-pointer flex justify-between items-start"
                  onClick={() => handleSelectFarm(farm)}
                >
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                      {farm.name}
                      {isActive && <CheckCircle2 size={16} className="text-emerald-500" />}
                    </h3>
                    <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                      <MapPin size={14} /> {farm.location} • {farm.sizeAcre} {t(lang, "acre")}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50/80 px-4 py-3 border-t border-gray-100">
                  {farm.activeSeason ? (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">वर्तमान फसल</p>
                        <p className="font-medium text-emerald-700">{farm.activeSeason.cropName}</p>
                        <p className="text-xs text-gray-500">शुरू: {formatDate(farm.activeSeason.startDate)}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleSelectFarm(farm)} className="text-xs rounded-full">
                        प्रबंधन करें
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-full">कोई फसल चालू नहीं</p>
                      <Button 
                        size="sm" 
                        variant="amber" 
                        className="rounded-full text-xs shadow-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddSeasonModal({ farmId: farm.id, farmName: farm.name });
                        }}
                      >
                        <Plus size={14} className="mr-1" /> फसल शुरू करें
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Farm Modal */}
      <Dialog open={showAddFarmModal} onOpenChange={setShowAddFarmModal}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>🚜 {t(lang, "addFarm")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t(lang, "farmName")}</label>
              <Input
                placeholder="जैसे: घर वाला खेत"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t(lang, "farmSize")}</label>
              <Input
                type="number"
                placeholder="जैसे: 5"
                value={farmSize}
                onChange={(e) => setFarmSize(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t(lang, "location")}</label>
              <Input
                placeholder="गाँव या जगह का नाम"
                value={farmLocation}
                onChange={(e) => setFarmLocation(e.target.value)}
              />
            </div>
            {farmError && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">⚠️ {farmError}</div>
            )}
            <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" onClick={handleAddFarm} isLoading={isAddingFarm}>
              💾 सुरक्षित करें
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Season Modal */}
      <Dialog open={!!showAddSeasonModal} onOpenChange={(open) => !open && setShowAddSeasonModal(null)}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>🌱 {showAddSeasonModal?.farmName} में फसल शुरू करें</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t(lang, "cropName")}</label>
              <Input
                placeholder="जैसे: गेहूँ, धान, कपास"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t(lang, "startDate")}</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {seasonError && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">⚠️ {seasonError}</div>
            )}
            <Button className="w-full h-12" variant="amber" onClick={handleAddSeason} isLoading={isAddingSeason}>
              🚀 फसल शुरू करें
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
