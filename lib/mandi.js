// lib/mandi.js
export async function getLiveMandiPrice(city, commodity) {
  // Use NEXT_PUBLIC_ if you are calling this from a "use client" page
  const apiKey = process.env.NEXT_PUBLIC_DATA_GOV_API_KEY; 
  const resourceId = "9ef84268-d588-465a-a308-a864a43d0070";

  if (!apiKey) {
    console.error("API Key is missing! Check your .env.local file.");
    return null;
  }

  // Ensure the URL is properly formatted
  const url = `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json&filters[market]=${encodeURIComponent(city)}&filters[commodity]=${encodeURIComponent(commodity)}&limit=1`;

  try {
    // Adding mode: 'cors' or moving this to a server-side route is the standard fix
    const res = await fetch(url, { 
      method: "GET",
      cache: "no-store" 
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const data = await res.json();
    return data.records?.[0] ?? null;
  } catch (error) {
    console.error("Mandi API Fetch Failed:", error);
    return null; // Return null so extractSoilData doesn't crash
  }
}