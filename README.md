# Fjölskyldumælaborð

Family dashboard: kid-friendly weather now, school & sports calendar next.
See [PROJECT.md](PROJECT.md) for the vision, original prompt and roadmap.

## Run it

Plain HTML, CSS and JavaScript – no install, no build step, no API key.
Just open `index.html` in a browser (double-click it), or put the folder on
any static web host (e.g. GitHub Pages) to show it on a tablet or TV.

Add these to the address if you like:

- `?demo=1` – fake weather data (handy for testing the layout offline)
- `?lat=64.1355&lon=-21.8954&name=Reykjavík` – another location

The default location and refresh rate are set in `js/config.js`.
Weather data: [MET Norway Locationforecast 2.0](https://api.met.no/).

## Files

| File | What it does |
|---|---|
| `index.html` | Page layout (panels) |
| `css/style.css` | Styling, animations, responsive layout |
| `js/config.js` | Location and settings |
| `js/weather.js` | Fetches met.no data and turns it into kid-friendly Icelandic advice |
| `js/steve.js` | Pixel-art, Minecraft-style character that dresses for the weather |
| `js/app.js` | Draws the panels and refreshes every 15 minutes |
