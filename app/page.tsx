"use client"

import { PageLayout } from "@/components/page-layout"
import { useState, ChangeEvent } from "react"
import Image from "next/image"
import axios from 'axios'
import { 
  Camera, Upload, X, Star, CheckCircle, Info, Loader2, Plus, Trash2, ArrowRight
} from "lucide-react"

interface NutritionItem {
  f: string;
  c: number;
  ft: number;
  gi: string;
}

interface AnalysisResults {
  best: NutritionItem | null;
  next_three: NutritionItem[];
  all: NutritionItem[];
}

export default function RecommendationPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);

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

  const handleAnalyze = async () => {
    setLoading(true);
    setResults(null);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('file', f));
      formData.append('userText', manualText);
      
      const res = await axios.post('/api/predict', formData);
      setResults(res.data);
    } catch (err) {
      console.error(err);
      alert("Ralat analisis. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto p-6 pb-24">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black text-primary mb-2 italic">MANIS Check</h1>
          <p className="text-gray-500 font-bold">Pilihan Bijak untuk Kesihatan Anda</p>
        </header>

        {/* Input Section */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border-4 border-gray-50 mb-10">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">
            <Camera className="text-primary" /> Imbas atau Taip Menu
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Multi-Image Display */}
            <div className="flex flex-wrap gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-md">
                  <Image src={src} alt="preview" fill className="object-cover" />
                  <button 
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:scale-110 transition-transform"
                  >
                    <X size={14} strokeWidth={3}/>
                  </button>
                </div>
              ))}
              {files.length < 5 && (
                <label className="w-24 h-24 border-4 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
                  <Plus className="text-gray-300 group-hover:text-primary transition-colors" size={32} />
                  <span className="text-[10px] font-black text-gray-300 group-hover:text-primary">TAMBAH</span>
                  <input type="file" multiple hidden onChange={handleFileChange} accept="image/*" />
                </label>
              )}
            </div>

            {/* Manual Input */}
            <textarea
              className="w-full p-5 rounded-3xl bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all font-medium text-gray-700 min-h-[120px]"
              placeholder="Tiada gambar? Taip nama menu di sini..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={loading || (files.length === 0 && !manualText)}
            className="w-full mt-8 py-5 bg-primary text-white font-black rounded-[2rem] shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:bg-gray-200 disabled:shadow-none"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Star fill="currentColor" />}
            {loading ? "Sila Tunggu..." : "Mula Analisis Kesihatan"}
          </button>
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* HIGHLIGHT: BEST CHOICE */}
            {results.best && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative p-10 bg-white border-4 border-green-100 rounded-[3rem] shadow-2xl">
                  <div className="absolute top-6 right-8 bg-green-500 text-white px-6 py-2 rounded-full font-black text-xs tracking-widest shadow-lg">
                    REKOMENDASI TERBAIK
                  </div>
                  <h3 className="text-xs font-black text-green-500 uppercase tracking-widest mb-2">MENU PALING SELAMAT</h3>
                  <h2 className="text-5xl font-black text-gray-900 leading-tight mb-6">{results.best.f}</h2>
                  
                  <div className="flex flex-wrap gap-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                        <Star fill="currentColor" size={28} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Indeks GI</p>
                        <p className="text-2xl font-black text-green-600">{results.best.gi}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                        <CheckCircle size={28} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Kalori Anggaran</p>
                        <p className="text-2xl font-black text-orange-600">{results.best.c} kcal</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECONDARY CHOICES */}
            {results.next_three.length > 0 && (
              <div>
                <h3 className="text-2xl font-black text-gray-800 mb-6 px-4">Alternatif Lain</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {results.next_three.map((item, i) => (
                    <div key={i} className="p-6 bg-white border-2 border-gray-50 rounded-[2rem] hover:border-primary/20 transition-all shadow-sm">
                      <h4 className="font-black text-gray-800 text-lg mb-3">{item.f}</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-400">{item.c} kcal</span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg">GI: {item.gi}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  )
}