# Watchtower

Watchtower shows live weather readings for small airstrips in Rwanda and neighbouring countries (Uganda, Burundi, DR Congo, Tanzania, Kenya). Pilots and ground crews can quickly check temperature, wind speed and conditions, and see a simple risk level from 1 (low) to 4 (high) before a flight.

Watchtower gives general information only. It does not replace official air-control guidelines and data.

Repository: https://github.com/IGIRANEZASammyBelin/watch-tower

Demo video: ADD_VIDEO_LINK

## Features

- Search airstrips by name
- Filter by country and by weather condition
- Sort by name, temperature, wind speed or risk
- Refresh button to get new readings
- Clear error messages if the weather API cannot be reached

## API used

- Open-Meteo Weather API: https://open-meteo.com/en/docs
- Free for non-commercial use. No API key is needed, so there are no secrets in this repo.
- Credit: weather data by Open-Meteo (https://open-meteo.com/)

## Run locally

1. Clone the repo:
   ```
   git clone https://github.com/IGIRANEZASammyBelin/watch-tower.git
   cd watch-tower
   ```
2. Open `index.html` in your browser. That's all.

When opened as a local file, the app calls Open-Meteo directly. No login is needed.

## Project structure

```
watch-tower/
├── index.html
├── style.css
├── script.js
├── nginx/
│   ├── web.conf     (config for Web01 and Web02)
│   └── lb.conf      (config for Lb01)
├── scripts/
│   └── setup.sh     (installs and configures each server)
├── README.md
└── .gitignore
```

## Deployment

Servers: Web01 (WEB01_IP), Web02 (WEB02_IP), Lb01 (LB01_IP).

### Web01 and Web02

1. SSH into the server.
2. Clone the repo and enter it:
   ```
   git clone https://github.com/IGIRANEZASammyBelin/watch-tower.git
   cd watch-tower
   ```
3. Run the setup script:
   - On Web01: `sudo bash scripts/setup.sh Web01`
   - On Web02: `sudo bash scripts/setup.sh Web02`

The script installs Nginx, copies the site files to `/var/www/Watchtower`, installs `nginx/web.conf` (with the server name filled in), removes the default site, tests the config and reloads Nginx.

What `web.conf` does:
- Serves the static files.
- Adds an `X-Served-By` header so we can see which server answered.
- Proxies `/api/weather` to Open-Meteo and caches good answers for 10 minutes. This means fewer API calls, and the page can still show data if the API is briefly down.
- Adds security headers (`X-Content-Type-Options`, `X-Frame-Options`).
- Has a `/server-info` page that returns the server name, used to prove load balancing.

### Lb01 (load balancer)

1. SSH into Lb01, then clone the repo and enter it (same commands as above).
2. Run:
   ```
   sudo bash scripts/setup.sh Lb01 WEB01_IP WEB02_IP
   ```

What `lb.conf` does:
- Defines an `upstream` with Web01 and Web02, using round-robin (requests alternate between them).
- `max_fails=3 fail_timeout=30s`: a server that fails 3 times is skipped for 30 seconds.
- `proxy_next_upstream`: if one server errors or times out, the request is retried on the other.
- Passes the original host and client IP to the web servers.
- Adds an `X-Upstream` header showing which backend answered.

## Testing the load balancer

1. Open each server by its own IP and check the app loads.
2. Run `curl http://LB01_IP/server-info` several times. The server name alternates between Web01 and Web02.
3. Run `curl -I http://LB01_IP/` several times and check the `X-Served-By` header.
4. Stop Nginx on Web01 (`sudo systemctl stop nginx`). The site still works through Lb01, served by Web02. Start it again afterwards.
5. Open `http://LB01_IP/` in a browser and use the search, filters and sorting.

## Challenges and how I solved them

- **Typos and mismatched names:** some HTML ids and option values did not match the JavaScript, so filters silently failed. I fixed them by comparing the ids and values one by one.
- **Calling the API from the browser:** I proxied the weather API through Nginx so the browser only talks to its own server.
- **Proving load balancing:** I added the `X-Served-By` header and the `/server-info` page so each server can be identified.
- **Failed requests:** the app shows a clear message if the API cannot be reached, and Nginx serves cached data when possible.

## Credits

- Weather data: Open-Meteo (https://open-meteo.com/)
- Nginx documentation: https://nginx.org/en/docs/
