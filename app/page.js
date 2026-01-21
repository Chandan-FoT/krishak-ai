"use client"; // Required for client-side hooks and Web Speech API
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Sprout, UploadCloud, MapPin, Mic, Send,
  Leaf, LocateFixed, MessageSquare, ArrowRight, Store, Camera,
  Volume2, Square 
} from 'lucide-react';
import { extractSoilData, getGeminiChatResponse } from '../lib/gemini'; 
import { getWeatherData } from '../lib/weather';
import { getUserLocation } from '../lib/location';

export default function KrishakDashboard() {
  // --- CORE STATES ---
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); 
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  
  // Ref for Auto-Scrolling
  const chatEndRef = useRef(null);

  // --- CONTEXTUAL STATES ---
  const [userPlace, setUserPlace] = useState({ city: "Detecting...", state: "" });
  const [coords, setCoords] = useState({ lat: 28.6139, lon: 77.2090 });
  const [currentWeather, setCurrentWeather] = useState({ 
    temp: "--", condition: "Loading...", icon: "01d", forecast: [] 
  });

  // --- INITIALIZATION & SCROLL LOGIC ---
  useEffect(() => {
    handleLocationDetection();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- STOP SPEECH LOGIC ---
  const handleStopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // --- SPEAKER LOGIC ---
  const handleSpeak = (text) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.9;
      
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => v.lang.includes('hi'));
      if (hindiVoice) utterance.voice = hindiVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleLocationDetection = async () => {
    try {
      const loc = await getUserLocation();
      setUserPlace({ city: loc.city, state: loc.state });
      const weather = await getWeatherData(loc.lat, loc.lon);
      if (weather) {
        setCurrentWeather({ 
          temp: weather.currentTemp, condition: weather.currentCondition, 
          icon: weather.currentIcon, forecast: weather.fiveDayForecast || []
        });
      }
    } catch (err) {
      setUserPlace({ city: "Delhi", state: "India" });
    }
  };

  // --- CAMERA & PLANT ANALYSIS LOGIC ---
  const handleChatImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      setMessages(prev => [...prev, { 
        role: 'user', 
        text: "Analyzing this plant photo...", 
        image: base64Data 
      }]);
      
      setLoading(true);
      try {
        const pureBase64 = base64Data.split(',')[1];
        const response = await getGeminiChatResponse(
          "Identify this plant and detect any diseases. Suggest organic treatments.", 
          currentWeather, 
          userPlace,
          { data: pureBase64, mimeType: file.type }
        );
        setMessages(prev => [...prev, { role: 'ai', text: response }]);
      } catch (error) {
        setMessages(prev => [...prev, { role: 'ai', text: "Error uploading photo." }]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- VOICE & TEXT CHAT LOGIC ---
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Microphone not supported.");
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      setChatInput(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', text: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setLoading(true);
    try {
      const response = await getGeminiChatResponse(chatInput, currentWeather, userPlace);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Connection error." }]);
    } finally {
      setLoading(false);
    }
  };

  // --- SOIL ANALYSIS LOGIC ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        const aiResponse = await extractSoilData(base64Data, file.type, currentWeather);
        setPrediction({
          crop: aiResponse.cropName, yield: aiResponse.yieldForecast,
          profit: aiResponse.profitMargin, sustainability: aiResponse.sustainabilityScore, reason: aiResponse.reason
        });
      } catch (error) {
        alert("AI could not read the report.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-900">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-emerald-900 tracking-tighter italic uppercase">Krishak AI</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Voice & Visual Agri-Intelligence</p>
        </div>
        <div className="bg-emerald-600 p-4 rounded-3xl text-white shadow-xl rotate-3"><Sprout size={32} /></div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: WEATHER & SOIL SCAN */}
        <div className="lg:col-span-1 space-y-6">
          
          <Link href="/doctor">
            <div className="mb-6 bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-xl hover:bg-emerald-700 transition-all cursor-pointer relative overflow-hidden group">
              <div className="relative z-10 flex flex-col gap-2">
                <div className="bg-white/20 w-fit p-3 rounded-2xl backdrop-blur-sm mb-2">
                    <Sprout size={32} />
                </div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                  Open Crop Doctor
                </h3>
                <p className="font-medium opacity-90 text-sm tracking-wide">
                  Click to scan leaves & detect diseases
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/30 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
            </div>
          </Link>

          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm">
                <MapPin size={18} className="text-emerald-600" />
                <span>{userPlace.city}</span>
              </div>
              <button onClick={handleLocationDetection} className="p-2 bg-slate-50 rounded-xl text-emerald-600 hover:bg-emerald-50">
                <LocateFixed size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6 text-center font-black">
              <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                <p className="text-3xl text-slate-900">{currentWeather.temp}</p>
                <p className="text-[10px] uppercase text-orange-600">Temp</p>
              </div>
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center">
                <img 
                  src={`https://openweathermap.org/img/wn/${currentWeather.icon}@2x.png`} 
                  alt={currentWeather.condition} 
                  className="w-12 h-12" 
                  onError={(e) => { e.target.src = "https://openweathermap.org/img/wn/01d@2x.png" }}
                />
                <p className="text-[10px] uppercase text-blue-600 truncate w-full text-center capitalize">{currentWeather.condition}</p>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide pt-2">
              {currentWeather.forecast?.map((day, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-3xl text-center min-w-[85px] border border-slate-100 flex flex-col items-center transition-all hover:bg-white hover:shadow-md">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">{day.date}</p>
                  <img src={`https://openweathermap.org/img/wn/${day.icon}.png`} alt="weather" className="w-10 h-10 mx-auto" />
                  <p className="text-[8px] font-bold text-emerald-600 truncate w-full mb-1 capitalize tracking-tight">{day.condition}</p>
                  <p className="text-sm font-black text-slate-800">{day.temp}</p>
                </div>
              ))}
              {(!currentWeather.forecast || currentWeather.forecast.length === 0) && (
                <p className="text-xs text-slate-300 italic py-4 w-full text-center">Loading forecast...</p>
              )}
            </div>
          </div>

          <div className="h-fit">
            {prediction ? (
              <div className="bg-white p-8 rounded-[2.5rem] border-b-8 border-emerald-500 shadow-xl">
                <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tighter uppercase italic">{prediction.crop}</h2>
                <div className="space-y-4 mb-6 font-black text-xs">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between text-emerald-700">
                    <p className="text-slate-400 uppercase tracking-widest">Yield</p>
                    <p className="text-lg">{prediction.yield}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between text-blue-700">
                    <p className="text-slate-400 uppercase tracking-widest">Profit</p>
                    <p className="text-lg">{prediction.profit}</p>
                  </div>
                </div>
                <button onClick={() => setPrediction(null)} className="w-full text-xs font-black uppercase text-slate-400 hover:text-red-500">Reset Scan</button>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
                <UploadCloud size={50} className="mb-4 text-emerald-500 opacity-40" />
                <h3 className="text-lg font-bold text-slate-800 mb-2 italic">Soil Health Card</h3>
                <p className="text-xs text-slate-400 mb-8">Upload report for 2026 predictions.</p>
                <label className="bg-emerald-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest cursor-pointer shadow-xl active:scale-95 transition-all">
                  Select Report
                  <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHAT & MARKET */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CHATBOT (Height Reduced to 500px) */}
          <div className="bg-emerald-900 h-[700px] rounded-[3rem] text-white shadow-2xl flex flex-col overflow-hidden relative">
            
            {isSpeaking && (
              <button 
                onClick={handleStopSpeaking}
                className="absolute top-24 right-10 z-50 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl animate-pulse transition-all font-black uppercase text-[10px] tracking-widest"
              >
                <Square size={14} fill="white" /> Stop Listening (बंद करें)
              </button>
            )}

            <div className="p-8 pb-4 flex items-center gap-3 border-b border-emerald-800/50">
              <div className="bg-emerald-800 p-3 rounded-2xl shadow-inner"><MessageSquare size={24} className="text-emerald-400" /></div>
              <div>
                <h3 className="font-black text-sm tracking-widest uppercase italic">Krishak AI Assistant</h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest italic opacity-80 underline underline-offset-4 decoration-emerald-500">Visual Diagnosis Enabled</p>
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto p-10 space-y-6 custom-scrollbar">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
                  <Camera size={64} className="mb-4" />
                  <p className="text-lg font-bold italic uppercase tracking-tighter">Ask anything about your crop</p>
                  <p className="text-xs mt-2 font-medium">Ask in any Indian language</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`relative max-w-[85%] p-6 rounded-3xl text-sm leading-relaxed shadow-lg ${
                    m.role === 'user' ? 'bg-emerald-800 border border-emerald-700 rounded-tr-none' : 'bg-slate-800 border border-slate-700 rounded-tl-none font-medium'
                  }`}>
                    {m.image && (
                      <img src={m.image} alt="plant" className="w-full h-40 object-cover rounded-xl mb-3 border-2 border-emerald-500 shadow-md" />
                    )}
                    {m.text}
                    
                    {m.role === 'ai' && (
                      <div className="flex gap-4 mt-3">
                        <button 
                          onClick={() => handleSpeak(m.text)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <Volume2 size={14} /> Listen (सुनें)
                        </button>
                        
                        {isSpeaking && (
                          <button 
                            onClick={handleStopSpeaking}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Square size={12} fill="currentColor" /> Stop
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-slate-800 p-4 rounded-2xl text-xs font-black text-emerald-400 uppercase tracking-widest italic">AI is analyzing...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-8 pt-4 border-t border-emerald-800/50">
              <div className="relative">
                <input 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                  onKeyPress={(e) => e.key === 'Enter' && handleChat()} 
                  placeholder="Ask or upload plant photo..." 
                  className="w-full bg-emerald-950/50 border border-emerald-700 rounded-2xl py-6 pl-8 pr-44 text-sm focus:ring-4 ring-emerald-500/20 outline-none placeholder:text-emerald-800 font-medium" 
                />
                <div className="absolute right-4 top-[1.2rem] flex gap-2">
                  <label className="p-3 bg-emerald-700 hover:bg-emerald-600 rounded-xl cursor-pointer shadow-lg transition-all active:scale-90">
                    <Camera size={22} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleChatImageUpload} />
                  </label>
                  <button onClick={startListening} className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-emerald-700 hover:bg-emerald-600'}`}><Mic size={22} /></button>
                  <button onClick={handleChat} className="p-3 bg-white text-emerald-900 rounded-xl hover:bg-emerald-50 transition-all shadow-xl"><Send size={22} /></button>
                </div>
              </div>
            </div>
          </div>

          {/* MARKET PORTAL BUTTON (Moved Below Chat) */}
          <Link href="/mandi" className="block transform transition-all hover:scale-[1.02] active:scale-[0.98]">
            <button style={{ backgroundColor: '#065f46', color: '#ffffff' }} className="w-full py-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center gap-2 border-b-[10px] border-[#043d2c] outline-none">
              <div className="flex items-center gap-4">
                <Store size={26} className="text-emerald-300" />
                <span className="text-xl font-black uppercase tracking-tighter italic">VIEW MARKET PORTAL</span>
                <ArrowRight size={26} className="text-emerald-300" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-100/90 tracking-widest">LIVE AGMARKNET PRICES 2026</span>
            </button>
          </Link>

        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.4); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.6); }
      `}</style>
    </div>
  );
}