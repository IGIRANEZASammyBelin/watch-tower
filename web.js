const airstrips = [
    { name: "Kanombe Airstrip", country:"Rwanda", lat: -1.9686, lon: 30.1395 },
    { name: "Bugesera Airstrip", country: "Rwanda", lat: -2.2167, lon: 30.1500 },
    { name: "Kasese Airstrip", country : "Uganda", lat: 0.1833, lon: 30.0833 }, 
    { name: "Mwanza Airstrip", country : "Tanzania", lat: -2.5167, lon:32.9167 },
    { name: "Bujumbura Airstrip", country: "Burundi", lat: -3.3131, lon: 29.2333 },
    { name: "Goma Airstrip", country: "DR Congo", lat: -1.6833, lon: 29.2333 },
    { name: "Wilson Aistrip", country: "Kenya", lat: -1.3182, lon: 36.8100 }

];
const searchInput = document.getElementById("search");
const countrySelect = document.getElementById("countryFilter");
const conditionSelect = document.getElementById("conditions");
const flightTimeSelect = document.getElementById("flightTime");
const sortSelect = document.getElementById("sortBy");
const refreshBtn = document.getElementById("refresh");
const resultsContainer = document.getElementById("results");
const statusText = document.getElementById("status");

const RISK_LEVELS = {
    "Natural Disaster Alert": 4,
    "Foggy": 3,
    "Strong winds": 3,
    "Rainy": 2,
    "Sunny": 1
};
const SORTERS = {
    name: (a,b) => a.name.localeCompare(b.name),
    temperature: (a,b) => a.temperature - b.temperature,
    wind: (a,b) => b.wind - a.wind,
    risk: (a,b) => b.risk - a.risk
};
let forecasts = [];
function getCondition(code, wind, visibility){
    if ([95, 96, 99].includes(code)) return "Natural Disaster Alert";
    if  (wind < 1000) return "Foggy";
    if (wind >=30) return "strong winds";
    if ([51, 53, 55, 61, 61, 65, 80, 81, 82].includes(code)) return "Rainy";
    return "Sunny";
}
function buildAdvisory(item) {
    if (item.risk === 1) {
        return `<div class="advisory-box"><strong>Cleared for Takeoff:</strong> Favorable conditions at ${item.timeLabel}.</div>`;

    }
    const levelClass = item.risk >= 3 ? "danger" : "caution";
    const message = item.nextSafe
       ? `Suggested reschedule: <strong>${item.nextSafe.timeLabel}</strong> (+${item.nextSafe.offset}h, ${item.nextSafe.condition}).`
       : "No possiblity for Takeoff in the next 24 hours please consider Delaying";
    const button = item.nextSafe
       ? `<button class="reschedule-btn" type="button" onclick="shiftFlightTime(${item.nextSafe.offset})">Switch All to +${item.nextSafe.offset}h Window</button>`
       :"";
    return `
       <div class="advisory-box ${levelClass}">
           <strong>flight Caution (risk ${item.risk}/4):</strong> ${message}
           ${button}

       </div>
    `;
}
function renderAirstrips() {
    const offset = Number(flightTimeSelect.value);
    const query = searchInput.value.toLowerCase();
    const visible = forecasts
       .map(strip => {
         const slot = strip.hourly[offset] || strip.hourly[0];
         const nextSafe = slot.risk > 1 ? strip.hourly.slice(offset +1).find(h => h.risk === 1) : null;
         return { name:strip.name,country:strip.country, ...slot, nextSafe };


       })
       .filter(item =>
          item.name.toLowerCase().includes(query) &&
          (!countrySelect.value || item.country === countrySelect.value) &&
          (!conditionSelect.value || item.condition === conditionSelect.value)
       )  
        .sort(SORTERS[sortSelect.value]);
    const label =offset === 0 ? "Live Weather" : `+${offset}hForecast`;
    statusText.textContent = `${visible.length} airstrip(s) shown(${label}.`;

    if (visible.length === 0) {
      resultsContainer.innerHTML = "<p class='error'>NO airstrip matches the selected conditions.</P";
      return;
    }
    resultsContainer.innerHTML = visible.map(item =>`
        <article class="card ${item.risk >= 3 ? "warning-border" : ""}">
            <div>
                <h2>${item.name}</h2>
                <p class="country">${item.country} - window: ${item.timeLabel}</p>
                <span class="condition ${item.condition.toLowerCase().replace(/\s+/g, "-") }">${item.condition}</span>
                <p class="weather">
                    temperature: <strong>${item.temperature}°C</strong><br>
                    Wind speed: <strong>${item.wind} km/h</strong><br>
                    visibility: <strong>${(item.visibility / 1000).toFixed(1)} km</strong>
                </p>   
            </div>
            ${buildAdvisory(item)}
        </article>

    `).join("");
}
window.shiftFlightTime = function(targetOffset) {
    const options = Array.from(flightTimeSelect.options).map(o => Number(o.value));
    const closest = options.reduce((prev, curr) =>
       Math.abs(curr - targetOffset) < Math.abs(prev-targetOffset) ? curr : prev
    ); 
       flightTimeSelect.value = String(closest);
       renderAirstrips();
    };


    async function loadWeather() {
        resultsContainer.innerHTML = "";
        statusText.textContent = "Loading live and 24-hour forecast";
        const responses = await Promise.allSettled(
            airstrips.map(async strip => {
                const url =`https://api.open-meteo.com/v1/forecast?latitude=${strip.lat}&longitude=${strip.lon}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&forecast_days=2&timezone=auto`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const { hourly } =await res.json();
                const startIdx = Math.max(0, hourly.time.findIndex(t => new Date(t) >= new Date()));
                const slots = Array.from({ length: 25 }, (_, offset) => {
                    const i = startIdx + offset;
                    const condition = getCondition(hourly.weather_code[i], hourly.wind_speed_10m[i], hourly.visibility[i]);
                    return {
                        offset,
                        timeLabel: new Date(hourly.time[i]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit"}),
                        temperature: hourly.temperature_2m[i],
                        wind: hourly.wind_speed_10m[i],
                        visibility: hourly.visibility[i],
                        condition,
                        risk: RISK_LEVELS[condition]
                    };

                });
                return { name: strip.name, country: strip.country, hourly: slots};

            })
        );
        const fulfilled = responses.filter(r => r.status === "fulfilled").map(r => r.value);
        if (fulfilled.length === 0) {
            statusText.textContent = "";
            resultsContainer.innerHTML = "<p class='error'>Unable to Load weather Data, please try again later.</p>";
            return;
        }
        forecasts =fulfilled;
        renderAirstrips();

    }
    [searchInput, countrySelect, conditionSelect, flightTimeSelect, sortSelect].forEach(el =>
        el.addEventListener(el === searchInput ? "input" : "change", renderAirstrips)

    )

refreshBtn.addEventListener("click", loadWeather);
loadWeather();


       

