"use client";

import { useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";

export default function MandiPricePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPrices = async () => {
    setLoading(true);
    setError("");
    setRecords([]);

    try {
      const apiKey = process.env.NEXT_PUBLIC_DATA_GOV_API_KEY;

      const url =
        "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070" +
        `?api-key=${apiKey}&format=json&limit=25`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.records || data.records.length === 0) {
        setError("No price data available right now.");
        return;
      }

      setRecords(data.records);
    } catch (err) {
      setError("Failed to fetch data from government site.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-black to-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-12 text-white">
          <h1 className="text-4xl md:text-5xl font-black tracking-wide">
            MANDI PRICE TRACKER
          </h1>
          <p className="mt-3 text-slate-300 text-lg">
            Live crop prices from Government of India (Agmarknet)
          </p>

          <button
            onClick={fetchPrices}
            disabled={loading}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCcw size={18} />}
            {loading ? "Fetching..." : "Fetch Latest Prices"}
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700 font-semibold">
            {error}
          </div>
        )}

        {records.length > 0 && (
          <div className="rounded-2xl bg-white shadow-lg border">
            <div className="border-b px-6 py-4 bg-slate-50">
              <h2 className="text-2xl font-black text-slate-800">
                Latest Mandi Prices
              </h2>
              <p className="text-slate-500">
                Showing latest reported prices across India
              </p>
            </div>

            {/* TABLE WRAPPER (IMPORTANT FIX) */}
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="w-1/4 px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                      Commodity
                    </th>
                    <th className="w-1/4 px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                      Market
                    </th>
                    <th className="w-1/4 px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                      State
                    </th>
                    <th className="w-1/6 px-6 py-4 text-center text-xs font-black uppercase text-slate-600">
                      Price (₹)
                    </th>
                    <th className="w-1/6 px-6 py-4 text-right text-xs font-black uppercase text-slate-600">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {records.map((r, i) => (
                    <tr key={i} className="hover:bg-emerald-50/40">
                      <td className="px-6 py-4 font-semibold text-slate-800 break-words">
                        {r.commodity}
                      </td>
                      <td className="px-6 py-4 text-slate-700 break-words">
                        {r.market}
                      </td>
                      <td className="px-6 py-4 text-slate-700 break-words">
                        {r.state}
                      </td>
                      <td className="px-6 py-4 text-center font-black text-emerald-700">
                        ₹{r.modal_price}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 whitespace-nowrap">
                        {r.arrival_date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && records.length === 0 && !error && (
          <div className="mt-20 text-center text-slate-500">
            Click <span className="font-bold">“Fetch Latest Prices”</span> to load
            mandi data from the government.
          </div>
        )}
      </main>
    </div>
  );
}