# Watchtower — East Africa Airstrip Weather & Flight Window Advisory

Watchtower is a data-driven web application built for pilots, charter operators, and regional travelers across East Africa (Rwanda, Uganda, Tanzania, Burundi, DR Congo, and Kenya). It fetches real-time and 24-hour hourly forecast metrics from the Open-Meteo API, evaluates operational weather risks, and recommends safer departure windows during hazardous weather conditions.

**Live app (load balancer):** http://18.132.97.88

**Repository:** https://github.com/IGIRANEZASammyBelin/watch-tower
**DEMO VID LINK:**   https://www.youtube.com/watch?v=083gIc4M38Y

---

## Live Multi-Tier Architecture

Watchtower is deployed across a three-server Nginx architecture to ensure high availability, fault tolerance, and balanced traffic distribution:

* **Load Balancer (`Lb01`):** `http://18.132.97.88` — Nginx reverse proxy configured with round-robin load balancing and passive health checks (`max_fails=2 fail_timeout=10s`, `proxy_next_upstream error timeout http_502 http_503`).
* **Web Server 1 (`Web01`):** `18.133.245.231` — Nginx web server hosting static frontend assets and injecting the `X-Served-By` response header.
* **Web Server 2 (`Web02`):** `18.130.235.146` — Nginx web server hosting static frontend assets and injecting the `X-Served-By` response header.

---

## Core Features

* **Live & 24-Hour Regional Forecasts:** Retrieves hourly temperature (`°C`), wind speed (`km/h`), visibility (`km`), and WMO weather codes for 7 East African locations (Kanombe, Bugesera, Kasese, Mwanza, Bujumbura, Goma, and Wilson Airport).
* **Automated Weather Risk Classification:** Evaluates weather metrics and assigns a 4-tier operational risk level:
  * **Risk 4/4 — Natural Disaster Alert:** Severe thunderstorm weather codes (`95`, `96`, `99`).
  * **Risk 3/4 — Foggy or Strong Winds:** Visibility below `1,000 m` or wind speeds `>= 30 km/h`.
  * **Risk 2/4 — Rainy:** Drizzle, rain, or shower weather codes (`51–65`, `80–82`).
  * **Risk 1/4 — Sunny:** Clear and favorable travel conditions.
* **Interactive Flight Window Planner & Rescheduling:** Allows users to preview departure horizons (`Live`, `+3 Hours`, `+6 Hours`, `+12 Hours`, `+24 Hours`). Whenever a selected location exhibits elevated risk (`Risk >= 2`), Watchtower scans upcoming hourly slots and provides a one-click reschedule button to shift the dashboard to the next safe departure window.
* **Client-Side Search, Filtering, and Sorting:** Fetches forecast data once on load/refresh and executes instant local filtering by location name, country, or weather condition, as well as sorting by highest risk, alphabetical name, temperature, or wind speed.
* **Resilient Error Handling:** Uses `Promise.allSettled()` so an individual coordinate failure does not crash the dashboard, while displaying clear user feedback if the external API is unreachable.

---

## How to Use the App

1. Open the live app at http://18.132.97.88.
2. Type in the search box to filter locations by name, country, or weather condition.
3. Use the country and condition filters to narrow the list.
4. Use the sort menu to order results by risk, name, temperature, or wind speed.
5. Pick a departure time (Live, +3, +6, +12, or +24 hours). If a location is Risk 2 or higher, use the reschedule button to jump to the next safer window.

---

## User Feedback

> ⭐⭐⭐⭐⭐ **"I'd give this 5 stars. I find it very helpful to carry a weather app on my phone for East Africa whenever I want to travel, even by car instead of airplanes—very helpful!"**
> — *Watchtower User, East Africa*

---

## Project Structure

```text
watch-tower/
├── index.html          # Semantic HTML structure, filters, and flight window controls
├── styles.css          # Responsive CSS Grid layout and color-coded risk indicators
├── web.js              # Open-Meteo API integration, risk scoring, and DOM rendering
├── nginx/
│   ├── web.conf        # Nginx server block for Web01 and Web02 (with X-Served-By header)
│   └── lb.conf         # Nginx upstream and reverse proxy block for Lb01
├── .gitignore          # Excludes local environment files, keys, and editor metadata
└── README.md           # Project documentation, deployment steps, and API attribution
```

---

## Local Setup & Execution

1. **Clone the repository:**
   ```bash
   git clone https://github.com/IGIRANEZASammyBelin/watch-tower.git
   cd watch-tower
   ```
2. **Start a local HTTP server:**
   ```bash
   python3 -m http.server 8000
   ```
3. **Open in your browser:**
   Navigate to `http://localhost:8000`.

---

## Server Deployment & Load Balancer Configuration

### 1. Deploying to Web Servers (`Web01` and `Web02`)

Connect via SSH to **`Web01` (`18.133.245.231`)** and **`Web02` (`18.130.235.146`)**, and run the following commands on each server:

```bash
# Install Nginx and Git
sudo apt update && sudo apt install -y nginx git

# Create the web root directory
sudo mkdir -p /var/www/watchtower

# Clone the repository and copy application files
rm -rf /tmp/watch-tower
git clone https://github.com/IGIRANEZASammyBelin/watch-tower.git /tmp/watch-tower
sudo cp /tmp/watch-tower/index.html /tmp/watch-tower/styles.css /tmp/watch-tower/web.js /var/www/watchtower/

# Apply the web server Nginx configuration and reload
sudo cp /tmp/watch-tower/nginx/web.conf /etc/nginx/sites-available/default
sudo nginx -t && sudo systemctl reload nginx
```

Verify locally on each web server that Nginx serves the page and attaches the custom hostname header:
```bash
curl -I http://localhost
```

### 2. Configuring the Load Balancer (`Lb01`)

Connect via SSH to **`Lb01` (`18.132.97.88`)** and apply the upstream reverse proxy configuration (`nginx/lb.conf`). If another service such as HAProxy is already using port 80, stop and disable it first (`sudo systemctl stop haproxy && sudo systemctl disable haproxy`).

```bash
# Install Nginx and Git
sudo apt update && sudo apt install -y nginx git

# Clone the repository and copy the load balancer configuration
rm -rf /tmp/watch-tower
git clone https://github.com/IGIRANEZASammyBelin/watch-tower.git /tmp/watch-tower
sudo cp /tmp/watch-tower/nginx/lb.conf /etc/nginx/sites-available/default

# Validate syntax and start Nginx
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl restart nginx
```

### 3. Verifying Load Distribution & Failover

From a local terminal, send repeated `HEAD` requests to the load balancer's public IP address:

```bash
for i in 1 2 3 4; do curl -sI http://18.132.97.88 | grep -i x-served; done
```

* **Load Balancing Verification:** Repeated requests return the `X-Served-By` header alternating between `7288-web-01` and `7288-web-02`.
* **Failover Verification:** If Nginx on `Web01` is stopped (`sudo systemctl stop nginx`), `Lb01` routes all traffic to `Web02`.

---

## Challenges and Solutions


* **Poor AI code checking in general:** AI tools gave confident but incomplete advice, such as a placeholder-filled deployment guide and a wrong file name (`lb_1.conf` instead of `lb.conf`). I fixed this by checking every command against the real repo files and the real server output.
* **HAProxy already using port 80 on Lb01:** Nginx failed to start with `bind() to 0.0.0.0:80 failed (Address already in use)`. The server image came with HAProxy running, so the balancing I first saw was not coming from my Nginx config. I diagnosed it with `ss -ltnp`, then stopped and disabled HAProxy and started Nginx, and confirmed with the `Server: nginx` header.
* **Finding the right SSH keys:** Connecting needed the correct key, so I tested access with a quick `hostname` command on each server before deploying.
* **Inconsistent files across servers:** An early check showed different file sizes on Web01 and Web02. I compared `md5sum` of the deployed files on both servers to confirm they were identical.

---

## API & Resource Attribution

* **Weather Forecast API:** Weather data is provided by [Open-Meteo](https://open-meteo.com) under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license. Open-Meteo requires no API key, ensuring zero credentials are exposed in client-side code or public version control.
* **Web Server & Reverse Proxy:** Built and deployed using [Nginx](https://nginx.org).

---

## AI Tools Disclosure

AI assistants were used to help draft this README and for debugging suggestions. All commands were run and verified on the real servers, and the Nginx errors described above were found and fixed by testing, not by trusting the AI output.

---

## Disclaimer

Watchtower is an educational aviation and travel weather advisory tool. It provides general meteorological guidance and does not replace official civil aviation weather briefings or air traffic control instructions.
