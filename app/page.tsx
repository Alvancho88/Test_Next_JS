"use client"

import { PageLayout } from "@/components/page-layout"
import { useState, ChangeEvent } from "react"
import Image from "next/image"
import axios from 'axios'
import { 
  Camera, Upload, X, Star, CheckCircle, Info, Loader2, Plus, 
  Trash2, ArrowRight, UtensilsCrossed, Coffee, IceCream, Apple
} from "lucide-react"

interface NutritionItem {
  f: string;
  sugar: number;
  c: number;
  gi: string;
  tip: string;
}

interface AnalysisResults {
  recommended: NutritionItem | null;
  ranking: NutritionItem[];
  category: string;
}

export default function RecommendationPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { id: 'Appetizer', label: 'Appetizer', icon: <Apple size={24} /> },
    { id: 'Main Dish', label: 'Main Dish', icon: <UtensilsCrossed size={24} /> },
    { id: 'Dessert', label: 'Dessert', icon: <IceCream size={24} /> },
    { id: 'Drinks', label: 'Drinks', icon: <Coffee size={24} /> },
  ];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).slice(0, 5);
      const remainingSlots = 5 - files.length;
      const finalToUpload = selected.slice(0, remainingSlots);

      setFiles(prev => [...prev, ...finalToUpload]);
      const newPreviews = finalToUpload.map(f => URL.createObjectURL(f));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async (category: string) => {
    setLoading(true);
    setSelectedCategory(category);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('file', f));
      formData.append('userText', manualText);
      formData.append('category', category);
      
      // Pointing directly to Flask port to avoid "Socket Hang Up" proxy errors
      const API_URL = process.env.NODE_ENV === 'development' 
        ? 'http://127.0.0.1:5328/api/predict' 
        : '/api/predict';

      const res = await axios.post(API_URL, formData);
      setResults(res.data);
    } catch (err) {
      console.error(err);
      alert("Analysis failed. Make sure your Python backend is running on port 5328.");
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
      <div className="max-w-5xl mx-auto p-6 pb-24 font-sans">
        {!results ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Photo Input Area */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 font-bold text-gray-800">
                  <Upload size={20} className="text-blue-500" /> 1. Upload/Take Photo
                </div>
                <div className="flex flex-wrap gap-3 mb-4 min-h-[100px]">
                  {previews.map((src, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border">
                      <Image src={src} alt="preview" fill className="object-cover" />
                      <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {files.length < 5 && (
                    <label className="w-24 h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 text-blue-500">
                      <Plus size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Add</span>
                      <input type="file" multiple hidden onChange={handleFileChange} accept="image/*" />
                    </label>
                  )}
                </div>
                <button onClick={() => {setFiles([]); setPreviews([]);}} className="w-full py-2 text-red-500 text-xs font-bold flex items-center justify-center gap-2 border border-red-50 border-dashed rounded-xl">
                  <Trash2 size={14} /> Clear Photos
                </button>
              </div>

              {/* Text Input Area */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 font-bold text-gray-800">
                  <UtensilsCrossed size={20} className="text-blue-500" /> 2. Or Type Food Name
                </div>
                <textarea
                  className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 h-28 outline-none focus:border-blue-200 resize-none text-sm"
                  placeholder="e.g. Nasi Lemak, Teh Tarik..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
              </div>
            </div>

            {/* Step 3: Category Trigger Buttons */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
              <h3 className="text-xl font-bold mb-2">3. Select Category to Analyse</h3>
              <p className="text-gray-400 text-sm mb-8 italic">Results will be ranked by lowest GI and Sugar</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleAnalyze(cat.id)}
                    disabled={loading || (files.length === 0 && !manualText)}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group disabled:opacity-30"
                  >
                    <div className="text-blue-500 mb-3 group-hover:scale-110 transition-transform">
                      {loading && selectedCategory === cat.id ? <Loader2 className="animate-spin" /> : cat.icon}
                    </div>
                    <span className="font-bold text-gray-800">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
             {/* Result Header & Ranking Items (Same as previous step) */}
             <header className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Analysis Result: {results.category}</h2>
              <button onClick={() => setResults(null)} className="text-blue-500 font-bold text-sm underline">Change Category</button>
            </header>

            {/* BEST CHOICE DISPLAY */}
            {results.recommended && (
              <div className="mb-6">
                <div className="bg-[#0f4c6a] text-white px-4 py-2 rounded-t-xl text-sm font-bold flex items-center gap-2">
                  <Star size={16} fill="white" /> Recommended Choice
                </div>
                <div className="bg-white border-2 border-gray-100 p-6 rounded-b-xl shadow-sm relative">
                  <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(results.recommended.gi)}`}>
                    GI: {results.recommended.gi}
                  </div>
                  <h3 className="text-xl font-bold mb-4">{results.recommended.f}</h3>
                  <div className="flex gap-3 mb-6">
                    <span className="bg-gray-100 px-4 py-1.5 rounded-full text-sm font-medium">Sugar: {results.recommended.sugar}g</span>
                    <span className="bg-gray-100 px-4 py-1.5 rounded-full text-sm font-medium">Calories: {results.recommended.c} kcal</span>
                  </div>
                  <div className="bg-blue-50/50 p-4 rounded-xl flex items-center gap-3 border border-blue-100 text-sm">
                    <Info size={18} className="text-blue-500 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Encouragement:</span> {results.recommended.tip}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OTHER RANKED ITEMS */}
            <div className="space-y-4">
              {results.ranking.slice(1).map((item, i) => (
                <div key={i} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm relative">
                  <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(item.gi)}`}>
                    GI: {item.gi}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.f}</h3>
                  <div className="flex gap-3 mb-4">
                    <span className="text-xs text-gray-500">Sugar: {item.sugar}g</span>
                    <span className="text-xs text-gray-500">Calories: {item.c} kcal</span>
                  </div>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg italic">Tip: {item.tip}</p>
                </div>
              ))}
            </div>

            <button 
              onClick={() => {setResults(null); setFiles([]); setPreviews([]); setManualText("");}}
              className="w-full mt-10 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              Start New Analysis
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}