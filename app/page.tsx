"use client";

import React, { useState, ChangeEvent } from 'react';
import axios from 'axios';

interface NutritionItem {
  f: string;  // Food name
  c: number;  // Calories
  ft: number; // Fat
  gi: string; // Glycemic Index
}

export default function ManisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<NutritionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResults([]); 
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Sila pilih gambar menu terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Points to our Flask api/index.py via Next.js rewrites
      const response = await axios.post('/api/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResults(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error("Upload error details:", err);
      const detail = err.response?.data?.details || "Server logic error";
      setError(`Gagal memproses: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <header className="text-center mb-10">
          <h1 className="text-5xl font-black text-blue-600 tracking-tighter mb-2">MANIS</h1>
          <p className="text-gray-400 font-medium italic">Master of AI Nutrition Project</p>
        </header>

        {/* Camera / Upload Section */}
        <div className="relative group flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-3xl p-8 mb-8 transition-colors hover:border-blue-300 bg-gray-50">
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-72 rounded-2xl shadow-lg mb-4" />
          ) : (
            <div className="text-gray-300 mb-4 text-center">
              <span className="text-7xl block mb-2">📸</span>
              <p className="text-sm font-bold uppercase tracking-widest">Sila ambil gambar menu</p>
            </div>
          )}
          
          <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          {!preview && <p className="text-xs text-blue-500 mt-2 font-bold">Klik untuk buka kamera</p>}
        </div>

        <button 
          onClick={handleUpload}
          disabled={loading || !file}
          className={`w-full py-5 rounded-2xl text-2xl font-black transition-all transform active:scale-95 shadow-xl ${
            loading ? 'bg-gray-300 animate-pulse' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? "MENGANALISIS..." : "IMBAS MENU"}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border-2 border-red-100 text-red-600 rounded-2xl text-center font-bold">
            ⚠️ {error}
          </div>
        )}

        {/* Results Card Display */}
        <div className="mt-12">
          {results.length > 0 && (
            <h2 className="text-3xl font-black text-gray-800 mb-6 border-b-4 border-blue-100 pb-2 inline-block">Hasil Imbasan</h2>
          )}
          
          <div className="grid gap-4">
            {results.map((item, index) => (
              <div key={index} className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{item.f}</h3>
                  <div className="mt-2 flex gap-4 text-gray-500 font-bold">
                    <span className="bg-blue-50 px-3 py-1 rounded-lg">🔥 {item.c} kcal</span>
                    <span className="bg-orange-50 px-3 py-1 rounded-lg">⚖️ {item.ft}g Lemak</span>
                  </div>
                </div>
                <div className={`px-5 py-3 rounded-2xl text-lg font-black shadow-inner ${
                  item.gi === 'Low' ? 'bg-green-100 text-green-700' : 
                  item.gi === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>
                  GI: {item.gi}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}