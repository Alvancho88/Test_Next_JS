"use client"

import { PageLayout } from "@/components/page-layout"
import { useState } from "react"
import axios from 'axios'
import { 
  Camera, Upload, X, Star, Info, Loader2, Plus, 
  Trash2, UtensilsCrossed, Coffee, IceCream, Apple, CheckCircle
} from "lucide-react"
import Image from "next/image"

export default function RecommendationPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Storage for the full analysis
  const [fullResults, setFullResults] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Main Dish");

  const categories = [
    { id: 'Appetizer', icon: <Apple size={20} /> },
    { id: 'Main Dish', icon: <UtensilsCrossed size={20} /> },
    { id: 'Dessert', icon: <IceCream size={20} /> },
    { id: 'Drinks', icon: <Coffee size={20} /> },
  ];

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('file', f));
      formData.append('userText', manualText);
      
      const res = await axios.post('http://127.0.0.1:5328/api/predict', formData);
      setFullResults(res.data);
    } catch (err) {
      alert("Analysis failed. Please check backend.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (gi: string) => {
    if (gi === "Low") return "text-cyan-500 bg-cyan-50 border-cyan-100";
    if (gi === "Med") return "text-yellow-600 bg-yellow-50 border-yellow-100";
    return "text-pink-500 bg-pink-50 border-pink-100";
  };

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto p-6 pb-24">
        {/* INPUT SECTION - Always visible until analyzed */}
        {!fullResults && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h2 className="font-bold flex items-center gap-2 mb-4"><Camera /> 1. Scan or Add</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {previews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <Image src={src} alt="p" fill className="object-cover" />
                  </div>
                ))}
                <label className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50">
                  <Plus />
                  <input type="file" hidden multiple onChange={(e) => {
                    if (e.target.files) {
                      const fArr = Array.from(e.target.files);
                      setFiles([...files, ...fArr]);
                      setPreviews([...previews, ...fArr.map(f => URL.createObjectURL(f))]);
                    }
                  }} />
                </label>
              </div>
              <textarea 
                placeholder="Type items separated by commas (e.g. Ais Kacang, Kopi-O)" 
                className="w-full p-4 bg-gray-50 rounded-xl border-none h-24 resize-none"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
              />
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={loading || (files.length === 0 && !manualText)}
              className="w-full py-5 bg-[#0f4c6a] text-white rounded-2xl font-black shadow-lg disabled:bg-gray-200"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "ANALYSE NOW"}
            </button>
          </div>
        )}

        {/* RESULTS SECTION */}
        {fullResults && (
          <div className="space-y-6">
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeCategory === cat.id ? 'bg-white shadow-sm text-[#0f4c6a]' : 'text-gray-400'}`}
                >
                  {cat.icon} <span className="hidden md:inline text-xs">{cat.id}</span>
                </button>
              ))}
            </div>

            {/* View the selected category results */}
            {fullResults[activeCategory]?.recommended ? (
              <>
                <div className="bg-[#0f4c6a] text-white p-6 rounded-3xl relative">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold">BEST CHOICE</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold bg-white text-[#0f4c6a]`}>
                      GI: {fullResults[activeCategory].recommended.gi}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black mb-2">{fullResults[activeCategory].recommended.f}</h2>
                  <div className="flex gap-4 text-sm opacity-90 mb-4">
                    <span>Sugar: {fullResults[activeCategory].recommended.sugar}g</span>
                    <span>{fullResults[activeCategory].recommended.c} kcal</span>
                  </div>
                  <p className="bg-white/10 p-3 rounded-xl text-xs italic">
                    Tip: {fullResults[activeCategory].recommended.tip}
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-gray-400 text-xs px-2 uppercase">Other Options</h3>
                  {fullResults[activeCategory].ranking.slice(1).map((item: any, i: number) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">{item.f}</p>
                        <p className="text-[10px] text-gray-400">Sugar: {item.sugar}g • {item.c} kcal</p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${getRiskColor(item.gi)}`}>
                        {item.gi}
                      </span >
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-bold">No items found for this category.</p>
              </div>
            )}

            <button 
              onClick={() => {setFullResults(null); setFiles([]); setPreviews([]); setManualText("")}} 
              className="w-full py-4 text-gray-400 font-bold text-sm"
            >
              ← Start New Scan
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}