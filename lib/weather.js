export async function getWeatherData(lat, lon) {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather fetch failed");
    const data = await res.json();
    
    const current = data.list[0];
    const fiveDay = data.list.filter(item => item.dt_txt.includes("12:00:00"));

    return {
      currentTemp: `${Math.round(current.main.temp)}°C`,
      // Use weather[0].main for broad categories (Rain, Clouds, Clear)
      // Or weather[0].description for detail (light rain, scattered clouds)
      currentCondition: current.weather[0].main, 
      currentIcon: current.weather[0].icon, 
      fiveDayForecast: fiveDay.map(day => ({
        date: new Date(day.dt * 1000).toLocaleDateString(undefined, { weekday: 'short' }),
        temp: `${Math.round(day.main.temp)}°C`,
        condition: day.weather[0].main,
        icon: day.weather[0].icon
      }))
    };
  } catch (error) {
    console.error("Weather API Error:", error);
    return null;
  }
}