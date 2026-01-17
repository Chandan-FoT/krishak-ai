import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLiveMandiPrice } from './mandi';

// Initialize ONCE at the top.
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

export async function extractSoilData(base64Data, fileType, weatherContext) {
  // Model version updated to match your current logic
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const liveMandi = await getLiveMandiPrice("Delhi", "Mustard");

    const prompt = `
      REAL-TIME MARKET DATA (Sourced from Agmarknet API):
    - Commodity: ${liveMandi?.commodity || "N/A"}
    - Variety: ${liveMandi?.variety || "N/A"}
    - Modal Price: ₹${liveMandi?.modal_price || "No data"}/quintal
    - Arrival Date: ${liveMandi?.arrival_date || "N/A"}
    You are a multilingual Agri-Scientist. 
    You have to Answer as per chat language of farmer. i.e if language of question is english, than answer in english. if hindi or hinglish, then answer in hindi. And so on.
      Analyze this Soil Health Card. Using the nutrient data found:
      CURRENT CLIMATE DATA: ${JSON.stringify(weatherContext)}
    1. Recommend the best crop for the farmer's profit.
    2. Forecast yield and profit margins.
    3. Assign a sustainability score.
    4.Search your internal 2026 database for the LATEST Agmarknet mandi prices for this crop in India.
    IMPORTANT: In "reason", explain why this crop is chosen for this SPECIFIC soil AND the upcoming weather.
    (e.g., "Expected rain in 2 days makes this the perfect time to sow Mustard for natural irrigation.")
    5. Inlude live mandi price too in report with its analysis from Agmarknet api
    CRITICAL: For the "reason" field, do NOT use scientific terms like pH, Nitrogen, or Phosphorus. 
    Instead, explain the choice from a FARMER'S perspective. Focus on:
    - Why this crop is a safe bet for their specific soil.
    - How it helps them make more money or save on costs.
    - Why it's a good choice for the current local climate/season.

    Return ONLY this JSON structure:
    {
      "cropName": "Name",
      "yieldForecast": "XX quintals/acre",
      "profitMargin": "₹XX,XXX/acre",
      "sustainabilityScore": "XX/100",
      "reason": "Explain in simple words: e.g., 'This crop grows fast with very little water and is currently selling at a high price in the local mandi."
    }
  `;

    const result = await model.generateContent([
      { inlineData: { data: base64Data, mimeType: fileType } },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json|```/g, "").trim(); 
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini Forecast Error:", error);
    throw error;
  }
}

// THE CHAT ENGINE - UPDATED TO HANDLE IMAGES
export async function getGeminiChatResponse(userQuery, weatherContext, userPlace, imageObj = null) {
  try {
    const liveMandi = await getLiveMandiPrice(userPlace?.city || "Delhi", "Mustard");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
    REAL-TIME MARKET DATA (Sourced from Agmarknet API):
    - Commodity: ${liveMandi?.commodity || "N/A"}
    - Variety: ${liveMandi?.variety || "N/A"}
    - Modal Price: ₹${liveMandi?.modal_price || "No data"}/quintal
    - Arrival Date: ${liveMandi?.arrival_date || "N/A"}
    You are a multilingual Agri-Scientist. 
    1. The farmer is asking: "${userQuery}".
    2. use Current Weather Context(if needed): ${JSON.stringify(weatherContext)}.
    3. If the user asks in Hindi, Marathi, or any local language, respond in THAT SAME language.
    4. Answer any agricultural realated question from, it can include sowing to harvesting to selling(everyting farming related)(if farmer asked)
    5. If asked about prices of any crop in market, retrieve from agmarknet according to farmer current location.
    5. Provide ACTIONABLE advice (e.g., "Irrigate today" or "Wait for rain").
    Keep responses short and helpful for a farmer.
    -> When farmer upload any plant diagnose the plant disease and suggest organic treatments available in India. 
    Keep the tone helpful and use simple language as per weather condition.
    `;
    
    // Check if an image was provided and structure the request accordingly
    let result;
    if (imageObj) {
      result = await model.generateContent([
        { inlineData: { data: imageObj.data, mimeType: imageObj.mimeType } },
        { text: prompt }
      ]);
    } else {
      result = await model.generateContent(prompt);
    }

    return result.response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}