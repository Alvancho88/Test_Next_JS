"use client"

import { PageLayout } from "@/components/page-layout"
import { useState, useEffect } from "react"
import axios from 'axios'
import { 
  Camera, X, Star, Loader2, Plus, Trash2, 
  UtensilsCrossed, Coffee, IceCream, Apple, RefreshCcw, Layers
} from "lucide-react"
import Image from "next/image"

export default function RecommendationPage() {
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [fullResults, setFullResults] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Main Dish");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new (window as any).Image();
        img.src = e.target?.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH; canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.7);
        };
      };
    });
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('file', f));
      formData.append('userText', manualText);
      const res = await axios.post('http://127.0.0.1:5328/api/predict', formData);
      setFullResults(res.data);
    } catch (err) { alert("Analysis Error"); }
    finally { setLoading(false); }
  };

  const getRiskStyles = (risk: string) => {
    if (risk === "Low") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (risk === "Medium") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-rose-100 text-rose-700 border-rose-200";
  };

  const categories = [
    { id: 'Appetizer', icon: <Apple size={18} /> },
    { id: 'Main Dish', icon: <UtensilsCrossed size={18} /> },
    { id: 'Dessert', icon: <IceCream size={18} /> },
    { id: 'Drinks', icon: <Coffee size={18} /> },
  ];

  if (!mounted) return null;

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto p-4 pb-32" suppressHydrationWarning>
        
        {!fullResults ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h3 className="font-black text-gray-700 mb-4 flex items-center gap-2"><Camera size={20}/> Scan Menu</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {previews.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border">
                      <Image src={src} alt="p" fill className="object-cover" />
                    </div>
                  ))}
                  <label className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer text-gray-300">
                    <Plus /><input type="file" hidden multiple onChange={async (e) => {
                      if (e.target.files) {
                        const compressed = await Promise.all(Array.from(e.target.files).map(compressImage));
                        setFiles([...files, ...compressed]);
                        setPreviews([...previews, ...compressed.map(f => URL.createObjectURL(f))]);
                      }
                    }}/>
                  </label>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h3 className="font-black text-gray-700 mb-4 flex items-center gap-2"><Plus size={20}/> Manual Entry</h3>
                <textarea 
                  placeholder="e.g. Chinese Tea, Nasi Lemak..."
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none h-24 resize-none text-sm focus:ring-0"
                  value={manualText} onChange={(e) => setManualText(e.target.value)}
                />
              </div>
            </div>

            <button onClick={handleAnalyze} disabled={loading} className="w-full py-5 bg-[#0f4c6a] text-white rounded-[2rem] font-black shadow-xl disabled:bg-gray-300">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "ANALYSE MENU"}
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Category Picker Card (Shown when clicking Change Category) */}
            {showCategoryPicker && (
              <div className="bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100 mb-6 grid grid-cols-2 gap-2 animate-in zoom-in-95 duration-200">
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => {setActiveCategory(cat.id); setShowCategoryPicker(false);}}
                    className={`flex items-center gap-3 p-4 rounded-2xl font-black text-xs transition-all ${activeCategory === cat.id ? 'bg-[#0f4c6a] text-white' : 'bg-gray-50 text-gray-500'}`}>
                    {cat.icon} {cat.id}
                  </button>
                ))}
              </div>
            )}

            {/* Main Result */}
            {fullResults[activeCategory]?.recommended ? (
              <div className="space-y-6">
                <div className="bg-[#0f4c6a] text-white p-8 rounded-[2.5rem] shadow-2xl relative">
                   <div className="flex justify-between items-start mb-6">
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${getRiskStyles(fullResults[activeCategory].recommended.risk)}`}>
                        {fullResults[activeCategory].recommended.risk} RISK
                      </div>
                      <div className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">GI: {fullResults[activeCategory].recommended.gi_val}</div>
                   </div>
                   <h2 className="text-3xl font-black mb-4">{fullResults[activeCategory].recommended.f}</h2>
                   <div className="flex gap-8 mb-8">
                      <div><p className="text-[10px] opacity-60 font-bold uppercase">Sugar</p><p className="text-xl font-black">{fullResults[activeCategory].recommended.sugar}g</p></div>
                      <div><p className="text-[10px] opacity-60 font-bold uppercase">Energy</p><p className="text-xl font-black">{fullResults[activeCategory].recommended.c} kcal</p></div>
                   </div>
                   <div className="bg-white/10 p-4 rounded-2xl flex gap-3 items-start border border-white/10">
                      <Star className="text-yellow-400 shrink-0" size={20} />
                      <p className="text-xs font-bold italic leading-relaxed">{fullResults[activeCategory].recommended.tip}</p>
                   </div>
                </div>

                <div className="space-y-2">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Other {activeCategory}s</h4>
                   {fullResults[activeCategory].ranking.slice(1).map((item: any, i: number) => (
                     <div key={i} className="bg-white p-5 rounded-[1.5rem] border border-gray-100 flex justify-between items-center shadow-sm">
                        <div>
                          <p className="font-black text-gray-800">{item.f}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Sugar: {item.sugar}g • GI: {item.gi_val}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black border ${getRiskStyles(item.risk)}`}>{item.risk}</div>
                     </div>
                   ))}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-black">No {activeCategory} items found.</p>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="fixed bottom-8 left-0 right-0 px-4 flex gap-4 max-w-4xl mx-auto">
              <button 
                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                className="flex-1 bg-white border-2 border-[#0f4c6a] text-[#0f4c6a] py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <Layers size={18}/> Change Category
              </button>
              <button 
                onClick={() => {setFullResults(null); setFiles([]); setPreviews([]); setManualText("");}}
                className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <RefreshCcw size={18}/> New Scan
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}