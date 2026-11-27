const airstrips = [
    { name: "kanombe Airstrip", country: "Rwanda", lat: -1.9686, lon: 30.1395 },
    { name: "Bugesera Airstrip", country: "Rwanda", lat: -2.2167, lon: 30.1500},
    { name: "kasese Airstrip", country: "Uganda", lat: 0.1833, lon: 30.0833 },
    { name: "Mwanza Airstrip", country: "Tanzania", lat: -2.5167, lon: 32.9167 },
    { name: "Bujumbura Airstrip", country: "Burundi", lat: -3.3131, lon: 29.2333},
    { name : "Goma Airstrip", country: "Dr Congo", lat: -1.6833, lon: 29.2333 },
    { name: "Wilson Airport", country: "Kenya", lat: -1.3183, lon: 36.8100 } 
];

const search = document.getElementById("search");
const country = document.getElementById("countryFilter");
const conditions = document.getElementById("conditions");
const sort = document.getElementById("sortBy");
const refresh = document.getElementById("refresh");
const results = document.getElementById("results");
const status = document.getElementById("status");

function getCondition(data) {
    const code = data.current.weather_code;
    const wind = data.current.wind_speed_10m;
    if ([95,96,99].includes(code)) return "Natural Disaster Alert";
    if (data.current.visibility < 1000) return "Foggy";
    if (wind >= 30) return "Strong winds";
    if ([51,53,55,61,63,65,80,81,82].includes(code)) return "Rainy";
    return "Sunny";
}
function getRisk(condition,wind) {
    if (condition === "Natural Disaster Alert") return 4;
    if (condition === "Foggy" || condition === "Strong winds") return 3;
    if (condition === "Rainy") return 2;
    return 1;
}
async function loadWeather() {
    results.innerHTML = "";
    status.textContent = "loading weather...";
    const selected =airstrips.filter(item => {
        return item.name.toLowerCase().includes(search.value.toLowerCase()) && ( !country.value || item.country === country.value);

    });
    if (selected.length === 0) {
        status.textContent = "No airstrips match your filters.";
        return;
    }
    try { const weather = await Promise.allSettled(
        selected.map(async item => {
            const url =
             `https://api.open-meteo.com/v1/forecast?latitude=${item.lat}` +
             `&longitude=${item.lon}` +
             `&current=temperature_2m,weather_code,wind_speed_10m,visibility`;
          const response = await fetch(url);
          if ( !response.ok) {
            throw new Error("Weather API error");

          }
          const data = await response.json();
          const weatherCondition = getCondition(data);
          return {
            ...item,
            condition: weatherCondition,
            temperature: data.current.temperature_2m,
            wind: data.current.wind_speed_10m,
            risk: getRisk(weatherCondition, data.current.wind_speed_10m)

          };



        })
    );
    let visible = weather;
        .filter(r => r.status === "fulfilled")
        .map(r => r.value);
    if (conditions.value) {
        visible = visible.filter(item => item.condition === conditions.value);

    }
    if (sort.value === "name") {
        visible.sort((a,b) => a.name.localeCompare(b.name));

    } else if (sort.value === "temperature") {
      visible.sort((a, b) => a.temperature - b.temperature);
    } else if (sort.value === "wind"){
        visible.sort((a, b) => b.wind - a.wind);

    } else if (sort.value === "risk") {
        visible.sort((a, b) => b.risk - a.risk);

    }
    status.textContent = `${visible.length} airstrip(s) found.`;
    if (visible.length === 0) {
        results.innerHTML = 
         "<P class='error'>No airstrips match the selected codition.</p>";
        return; 
    }

    results.innerHTML = visible.map(item => `
        <article class="card">
        <h2>${item.name}</h2>
        <p class="country">${item.country}</p>
        <span class="condition ${item.condition.toLowerCase().replace(/\s+/g, "-")}"> ${item.condition}
        </span>
        <p class="weather">
          Temperature: ${item.temperature}°C<br>
          wind speed: ${item.wind} km/h<br>
          Risk level: ${item.risk}/4
        </p>
    </article>    

    `).join("");
  
    } catch (error) {
        status.textContent = "";
        results.innerHTML =
          "<p class='error'>Unable to load weather data. Please check your internet or try again later.</p>";

    } 


} 
search.addEventListener("input", loadWeather);
country.addEventListener("change", loadWeather);
conditions.addEventListener("change", loadWeather);
sort.addEventListener("change", loadWeather);
refresh.addEventListener("click", loadWeather);
loadWeather();