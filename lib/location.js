export async function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await res.json();
          resolve({
            lat: latitude,
            lon: longitude,
            city: data.city || "New Delhi",
            state: data.principalSubdivision || "Delhi"
          });
        } catch {
          resolve({ lat: latitude, lon: longitude, city: "Delhi", state: "India" });
        }
      },
      (error) => reject(error)
    );
  });
}