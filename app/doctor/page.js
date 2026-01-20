"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as tf from '@tensorflow/tfjs';
import { ArrowLeft, Sprout, ScanLine, AlertTriangle, Leaf } from 'lucide-react';

// IMPORT HANDBOOK
import { diseaseSolutions } from '../../lib/diseaseData'; 

export default function DoctorPage() {
  const [model, setModel] = useState(null);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const imageRef = useRef(null);

  useEffect(() => {
    async function loadModel() {
      try {
        const loadedModel = await tf.loadGraphModel('/model/model.json');
        const response = await fetch('/model/dict.txt');
        const text = await response.text();
        setLabels(text.trim().split('\n'));
        setModel(loadedModel);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load model:", err);
      }
    }
    loadModel();
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target.result);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const predict = async () => {
    if (!model || !imageRef.current) return;

    // Normalization [0,1]
    const tensor = tf.browser.fromPixels(imageRef.current)
      .resizeNearestNeighbor([224, 224])
      .toFloat()
      .div(tf.scalar(255.0))
      .expandDims();

    const predictions = await model.predict(tensor).data();
    
    // Get Top 2 Results for comparison
    const results = Array.from(predictions)
        .map((score, i) => ({ score, label: labels[i] }))
        .sort((a, b) => b.score - a.score);

    const top = results[0];
    const second = results[1];

    // Helper to get Crop Name (e.g., "Tomato" from "Tomato___Blight")
    const getCropName = (label) => label.split('___')[0];
    
    // --- SMART FILTER LOGIC ---
    let isValidLeaf = false;

    // Rule 1: High Confidence (It's definitely a leaf)
    if (top.score > 0.60) {
        isValidLeaf = true;
    } 
    // Rule 2: Consistent Crop (It thinks it's Tomato, just unsure which disease)
    else if (top.score > 0.30 && getCropName(top.label) === getCropName(second.label)) {
        isValidLeaf = true;
    }
    // Rule 3: Clear Winner (It's 40% sure it's Corn, and 2nd guess is 5% something else)
    else if (top.score > 0.30 && (top.score - second.score > 0.15)) {
        isValidLeaf = true;
    }

    // --- DISPLAY RESULT ---
    if (isValidLeaf) {
        const rawName = top.label; 
        const info = diseaseSolutions?.[rawName] || { 
             status: "Unknown Status", 
             cure: "Consult a local agri-expert.", 
             precaution: "Isolate this plant." 
        };

        setResult({ 
            name: rawName.replace(/_/g, ' '), 
            isUnknown: false, 
            status: info.status || "Unknown",
            cure: info.cure,           
            precaution: info.precaution 
        });

    } else {
        // REJECT: It's likely a random object (Car, Dog, Face)
        setResult({ 
            name: "Not a Leaf / Unclear", 
            isUnknown: true, 
            message: "I cannot identify this image. Please upload a clear photo of a crop leaf.",
            status: "Unknown", 
            cure: "",
            precaution: ""
        });
    }
    
    tensor.dispose();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-xl mx-auto mb-8 flex items-center gap-4">
        <Link href="/">
          <button className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-emerald-50 text-slate-600 shadow-sm"><ArrowLeft size={24} /></button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-emerald-900 uppercase italic tracking-tighter">Krishak Crop Doctor</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Advanced Disease Diagnosis</p>
        </div>
      </div>

      <main className="max-w-xl mx-auto">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
          
          <div className="flex items-center gap-3 mb-6 z-10 relative">
            <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600"><Leaf size={24} /></div>
            <div>
                <h3 className="font-black text-slate-800 text-lg uppercase italic tracking-tighter">Scanner Ready</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{loading ? "Initializing..." : "System Online"}</p>
            </div>
          </div>
          
          {loading ? (
            <div className="h-40 flex flex-col items-center justify-center text-emerald-600 animate-pulse">
                <ScanLine size={40} className="mb-2"/><p className="text-xs font-bold uppercase tracking-widest">Loading...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {!imageSrc && (
                  <label className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer hover:bg-emerald-50 transition-all">
                      <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm"><Sprout size={24} className="text-emerald-500" /></div>
                      <p className="text-sm font-bold text-slate-600">Click to Upload Leaf Photo</p>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
              )}

              {imageSrc && (
                <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-black">
                        <img ref={imageRef} src={imageSrc} alt="Preview" className="w-full object-contain max-h-80" />
                        <button onClick={() => { setImageSrc(null); setResult(null); }} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                    </div>
                    {!result && (
                        <button onClick={predict} className="w-full bg-emerald-600 text-white font-black text-sm uppercase tracking-widest py-5 rounded-2xl hover:bg-emerald-700 shadow-xl flex items-center justify-center gap-2">
                            <ScanLine size={20} /> Start Diagnosis
                        </button>
                    )}
                </div>
              )}

              {result && (
                <div className={`p-6 rounded-[2rem] text-center animate-in slide-in-from-bottom-4 border-2 ${result.isUnknown ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  
                  {result.isUnknown ? (
                      <>
                        <div className="flex justify-center mb-3 text-orange-500"><AlertTriangle size={40} /></div>
                        <h2 className="text-2xl font-black text-orange-900 leading-tight uppercase italic">Unclear Result</h2>
                        <p className="text-sm text-orange-700 mt-2 font-medium">{result.message}</p>
                      </>
                  ) : (
                      <>
                        <p className="text-xs text-emerald-600 uppercase font-black tracking-[0.2em] mb-2">Diagnosis Complete</p>
                        <h2 className="text-3xl font-black text-slate-800 leading-none uppercase italic tracking-tighter mb-4">{result.name}</h2>
                        
                        {/* CLEAN STATUS BADGE (No Percent) */}
                        <div className="inline-flex items-center gap-2 bg-white border border-emerald-100 px-4 py-2 rounded-full shadow-sm mb-6">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${result.status?.includes('Healthy') ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{result.status || "Unknown"}</span>
                        </div>

                        {result.status && !result.status.includes('Healthy') && (
                            <div className="bg-white rounded-2xl p-5 text-left space-y-4 shadow-sm border border-slate-100 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">💊 Recommended Cure</p>
                                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{result.cure}</p>
                                </div>
                                <div className="w-full h-px bg-slate-100"></div>
                                <div>
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">🛡️ Precaution</p>
                                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{result.precaution}</p>
                                </div>
                            </div>
                        )}

                        {result.status?.includes('Healthy') && (
                            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 text-emerald-800 text-sm font-medium">
                                🎉 Great news! Your crop is healthy. {result.cure}
                            </div>
                        )}
                      </>
                  )}
                  
                  <button onClick={() => { setImageSrc(null); setResult(null); }} className="w-full mt-6 bg-white border border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-widest py-4 rounded-xl hover:bg-slate-50 transition-colors">Scan New Leaf</button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}