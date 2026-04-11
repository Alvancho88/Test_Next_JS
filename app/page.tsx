"use client"

import { PageLayout } from "@/components/page-layout"
import { useState, useEffect } from "react"
import axios from 'axios'
import { Camera, X, Star, Loader2, Plus, Trash2, UtensilsCrossed, Coffee, IceCream, Apple, RefreshCcw, Layers, AlertCircle } from "lucide-react"
import Image from "next/image"

export default function RecommendationPage() {
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [fullResults, setFullResults] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null); // Start with no category selected

  useEffect(() => { setMounted(true); }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('file', f));
      formData.append('userText', manualText);
      const res = await axios.post('http://127.0.0.1:5328/api/predict', formData);
      setFullResults(res.data);
      setActiveCategory(null); // Show the picker first
    } catch (err) { alert("Analysis Error"); }
    finally { setLoading(false); }
  };

  const getRiskStyles = (risk: string) => {
    if (risk === "Low") return "text-emerald-500 border-emerald-100 bg-emerald-50";
    if (risk === "Medium") return "text-amber-500 border-amber-100 bg-amber-50";
    return "text-red-600 border-red-200 bg-red-50 font-black"; // High Risk is Bright Red
  };

  const categories = [
    { id: 'Appetizer', icon: <Apple size={20} /> },
    { id: 'Main Dish', icon: <UtensilsCrossed size={20} /> },
    { id: 'Dessert', icon: <IceCream size={20} /> },
    { id: 'Drinks', icon: <Coffee size={20} /> },
  ];

  if (!mounted) return null;

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto p-4 pb-32">
        
        {!fullResults ? (
          /* Input Sections stay same... */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h3 className="font-black text-gray-700 mb-4 flex items-center gap-2"><Camera size={20}/> 1. Scan</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {previews.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border">
                      <Image src={src} alt="p" fill className="object-cover" />
                    </div>
                  ))}
                  <label className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer text-gray-300">
                    <Plus /><input type="file" hidden multiple onChange={async (e) => {
                       if (e.target.files) {
                         const fArr = Array.from(e.target.files);
                         setFiles([...files, ...fArr]);
                         setPreviews([...previews, ...fArr.map(f => URL.createObjectURL(f))]);
                       }
                    }}/>
                  </label>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h3 className="font-black text-gray-700 mb-4 flex items-center gap-2"><Plus size={20}/> 2. Type</h3>
                <textarea 
                  placeholder="Ais Kacang, Air Putih, etc..."
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none h-24 resize-none text-sm outline-none"
                  value={manualText} onChange={(e) => setManualText(e.target.value)}
                />
              </div>
            </div>
            <button onClick={handleAnalyze} className="w-full py-5 bg-[#0f4c6a] text-white rounded-[2rem] font-black shadow-xl">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "ANALYSE NOW"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Show Categories First */}
            {!activeCategory ? (
              <div className="text-center space-y-8 py-10">
                <h2 className="text-2xl font-black text-[#0f4c6a]">Select a category to view recommendations</h2>
                <div className="grid grid-cols-2 gap-4">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                      className="flex flex-col items-center gap-4 p-8 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-[#0f4c6a] transition-all group">
                      <div className="p-4 bg-gray-50 rounded-2xl text-[#0f4c6a] group-hover:bg-[#0f4c6a] group-hover:text-white transition-colors">
                        {cat.icon}
                      </div>
                      <span className="font-black text-gray-600">{cat.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Results View */
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex bg-gray-100/50 p-1.5 rounded-2xl mb-8">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                      className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${activeCategory === cat.id ? 'bg-white shadow-sm text-[#0f4c6a]' : 'text-gray-400'}`}>
                      {cat.id}
                    </button>
                  ))}
                </div>

                {fullResults[activeCategory]?.ranking?.length > 0 ? (
                  <div className="space-y-6">
                    {/* Top Recommended Card */}
                    {(() => {
                      const top = fullResults[activeCategory].ranking[0];
                      return (
                        <div className={`p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden ${top.risk === 'High' ? 'bg-red-50 border-4 border-red-600' : 'bg-[#0f4c6a] text-white'}`}>
                           <div className="flex justify-between items-center mb-6">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${getRiskStyles(top.risk)}`}>{top.risk} RISK</span>
                              <span className="px-4 py-1.5 bg-black/10 rounded-full text-[10px] font-black">GI: {top.gi_val}</span>
                           </div>
                           <h2 className={`text-3xl font-black mb-4 ${top.risk === 'High' ? 'text-red-600' : 'text-white'}`}>{top.f}</h2>
                           <div className="flex gap-8 mb-8">
                              <div><p className="text-[10px] opacity-60 uppercase font-bold">Sugar</p><p className="text-xl font-black">{top.sugar}g</p></div>
                              <div><p className="text-[10px] opacity-60 uppercase font-bold">Energy</p><p className="text-xl font-black">{top.c} kcal</p></div>
                           </div>
                           <div className="bg-black/5 p-4 rounded-2xl flex gap-3 items-start">
                              <Star size={18} className="shrink-0 text-yellow-500" />
                              <p className="text-xs font-bold italic">{top.tip}</p>
                           </div>
                        </div>
                      );
                    })()}

                    {/* Secondary Ranking List */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Other Options</h3>
                      {fullResults[activeCategory].ranking.slice(1).map((item: any, i: number) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                           <div className="flex justify-between items-start mb-4">
                              <p className={`font-black text-lg ${item.risk === 'High' ? 'text-red-600' : 'text-gray-800'}`}>{item.f}</p>
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${getRiskStyles(item.risk)}`}>{item.risk}</span>
                           </div>
                           {/* Variables correctly shown for secondary items */}
                           <div className="grid grid-cols-3 gap-2 mb-4 border-y border-gray-50 py-3">
                              <div className="text-center"><p className="text-[8px] text-gray-400 uppercase font-bold">Sugar</p><p className="font-black text-gray-700">{item.sugar}g</p></div>
                              <div className="text-center"><p className="text-[8px] text-gray-400 uppercase font-bold">Calories</p><p className="font-black text-gray-700">{item.c} kcal</p></div>
                              <div className="text-center"><p className="text-[8px] text-gray-400 uppercase font-bold">GI</p><p className="font-black text-gray-700">{item.gi_val}</p></div>
                           </div>
                           {/* Tip included for secondary items */}
                           <p className="text-[11px] text-gray-500 italic font-medium">Tip: {item.tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center text-gray-400 font-black italic bg-gray-50 rounded-[2.5rem]">No items found.</div>
                )}
              </div>
            )}

            {/* Bottom Controls */}
            <div className="fixed bottom-8 left-0 right-0 px-4 flex gap-4 max-w-4xl mx-auto z-50">
              <button onClick={() => setActiveCategory(null)} className="flex-1 bg-white border-2 border-[#0f4c6a] text-[#0f4c6a] py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg">
                <Layers size={18}/> Change Category
              </button>
              <button onClick={() => {setFullResults(null); setFiles([]); setPreviews([]); setManualText("");}} className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg">
                <RefreshCcw size={18}/> New Scan
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}