// Weather data: fetching from api.met.no and turning raw numbers into
// kid-friendly Icelandic summaries.
(function () {
  const API = "https://api.met.no/weatherapi/locationforecast/2.0/complete";
  const CACHE_KEY = "dashboard.weather.v1";

  async function fetchForecast(lat, lon) {
    const url = `${API}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`met.no svaraði ${res.status}`);
    const json = await res.json();
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), json })); } catch (e) {}
    return json;
  }

  function cachedForecast() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
  }

  // Fake forecast so the layout can be tested offline (?demo=1).
  function demoForecast() {
    const start = new Date();
    start.setUTCMinutes(0, 0, 0);
    const timeseries = [];
    for (let h = 0; h < 48; h++) {
      const t = new Date(start.getTime() + h * 3600e3);
      const hour = t.getUTCHours();
      const temp = 4 + 4 * Math.sin(((hour - 9) / 24) * 2 * Math.PI) + h * 0.03;
      const rain = h >= 3 && h <= 6 ? 0.4 + (h % 2) * 0.5 : 0;
      timeseries.push({
        time: t.toISOString(),
        data: {
          instant: { details: {
            air_temperature: +temp.toFixed(1),
            wind_speed: +(4.5 + 3 * Math.sin(h / 5)).toFixed(1),
            wind_speed_of_gust: +(8 + 4 * Math.sin(h / 5)).toFixed(1),
            wind_from_direction: 35 + h * 3,
            air_pressure_at_sea_level: +(1008 + h * 0.15).toFixed(1),
            relative_humidity: 80,
          } },
          next_1_hours: {
            summary: { symbol_code: rain ? "lightrain" : h % 7 < 3 ? "partlycloudy_day" : "cloudy" },
            details: { precipitation_amount: rain },
          },
        },
      });
    }
    return { properties: { meta: { updated_at: start.toISOString() }, timeseries } };
  }

  // ---------- helpers ----------

  // Wind chill (JAG/TI formula used by most met services). v in m/s.
  function windChill(t, v) {
    const kmh = v * 3.6;
    if (t > 10 || kmh < 4.8) return t;
    const p = Math.pow(kmh, 0.16);
    return 13.12 + 0.6215 * t - 11.37 * p + 0.3965 * t * p;
  }

  // Icelandic Beaufort names with a fun line for the kids.
  const BEAUFORT = [
    [0.3, "Logn", "Sápukúluveður!"],
    [1.6, "Andvari", "Varla hreyfir vind."],
    [3.4, "Kul", "Laufin bærast aðeins."],
    [5.5, "Gola", "Fínt flugdrekaveður!"],
    [8.0, "Stinningsgola", "Flugdrekinn flýgur hátt!"],
    [10.8, "Kaldi", "Hárið fýkur í allar áttir!"],
    [13.9, "Stinningskaldi", "Erfitt að halda á regnhlíf."],
    [17.2, "Allhvass vindur", "Haldið fast í húfuna!"],
    [20.8, "Hvassviðri", "Erfitt að ganga á móti vindi."],
    [24.5, "Stormur", "Verum inni í dag!"],
    [28.5, "Rok", "Tré geta brotnað. Inni!"],
    [32.7, "Ofsaveður", "Allir inni!"],
    [Infinity, "Fárviðri", "Allir inni!"],
  ];
  function beaufort(v) {
    const i = BEAUFORT.findIndex(([max]) => v < max);
    return { level: i, name: BEAUFORT[i][1], fun: BEAUFORT[i][2] };
  }

  const DIRS = ["Norðan", "Norðaustan", "Austan", "Suðaustan", "Sunnan", "Suðvestan", "Vestan", "Norðvestan"];
  function directionName(deg) {
    return DIRS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
  }

  const SYMBOLS = [
    ["thunder", "⛈️", "Þrumuveður"],
    ["sleet", "🌨️", "Slydda"],
    ["snowshowers", "🌨️", "Snjóél"],
    ["snow", "❄️", "Snjókoma"],
    ["rainshowers", "🌦️", "Skúrir"],
    ["heavyrain", "🌧️", "Mikil rigning"],
    ["rain", "🌧️", "Rigning"],
    ["fog", "🌫️", "Þoka"],
    ["cloudy", "☁️", "Skýjað"],
    ["partlycloudy", "⛅", "Hálfskýjað"],
    ["fair", "🌤️", "Léttskýjað"],
    ["clearsky", "☀️", "Heiðskírt"],
  ];
  function symbolInfo(code) {
    code = code || "cloudy";
    const night = code.endsWith("_night");
    const hit = SYMBOLS.find(([k]) => code.includes(k)) || SYMBOLS[8];
    let emoji = hit[1];
    if (night && (hit[0] === "clearsky" || hit[0] === "fair")) emoji = "🌙";
    return { emoji, text: hit[2], kind: hit[0] };
  }

  function precipKind(code, temp) {
    if (!code) return "none";
    if (code.includes("snow") || (code.includes("sleet") && temp < 1)) return "snow";
    if (code.includes("sleet") || code.includes("rain") || code.includes("thunder")) return "rain";
    return "none";
  }

  // ---------- summary ----------

  function summarize(forecast, tz) {
    const series = forecast.properties.timeseries;
    const now = Date.now();
    // first entry that is not more than an hour in the past
    let idx = series.findIndex(s => new Date(s.time).getTime() > now - 3600e3);
    if (idx < 0) idx = 0;
    const cur = series[idx];
    const d = cur.data.instant.details;
    const next1 = cur.data.next_1_hours || cur.data.next_6_hours || {};
    const symbol = next1.summary ? next1.summary.symbol_code : "cloudy";
    const precipNow = next1.details ? next1.details.precipitation_amount || 0 : 0;

    const in24 = series.filter(s => {
      const t = new Date(s.time).getTime();
      return t >= new Date(cur.time).getTime() && t < new Date(cur.time).getTime() + 24 * 3600e3;
    });
    const in12 = in24.slice(0, 12);
    const temps = in24.map(s => s.data.instant.details.air_temperature);

    // gusts (fall back to wind speed if the model has no gust value)
    let gust = { v: -1, time: cur.time };
    in12.forEach(s => {
      const det = s.data.instant.details;
      const g = det.wind_speed_of_gust != null ? det.wind_speed_of_gust : det.wind_speed;
      if (g > gust.v) gust = { v: g, time: s.time };
    });

    // precipitation for the rest of today (local date in the configured zone)
    const dayKey = t => new Date(t).toLocaleDateString("en-CA", { timeZone: tz });
    const today = dayKey(now);
    let rainToday = 0, rainLater = 0, laterKind = "none";
    series.slice(idx).forEach((s, i) => {
      const p = s.data.next_1_hours && s.data.next_1_hours.details ? s.data.next_1_hours.details.precipitation_amount || 0 : 0;
      if (dayKey(s.time) === today) rainToday += p;
      if (i > 0 && i < 12 && p > 0.1) {
        rainLater += p;
        if (laterKind === "none") laterKind = precipKind(s.data.next_1_hours.summary.symbol_code, s.data.instant.details.air_temperature);
      }
    });

    // pressure trend over the next 12 hours
    const p0 = d.air_pressure_at_sea_level;
    const p12entry = in24[Math.min(12, in24.length - 1)];
    const p12 = p12entry.data.instant.details.air_pressure_at_sea_level;

    const hourly = series.slice(idx, idx + 12).map(s => {
      const n = s.data.next_1_hours;
      return {
        time: s.time,
        temp: s.data.instant.details.air_temperature,
        wind: s.data.instant.details.wind_speed,
        precip: n && n.details ? n.details.precipitation_amount || 0 : 0,
        symbol: symbolInfo(n && n.summary ? n.summary.symbol_code : null),
      };
    });

    return {
      updatedAt: forecast.properties.meta && forecast.properties.meta.updated_at,
      temp: d.air_temperature,
      feels: windChill(d.air_temperature, d.wind_speed),
      max: Math.max(...temps),
      min: Math.min(...temps),
      wind: d.wind_speed,
      windDir: d.wind_from_direction,
      windDirName: directionName(d.wind_from_direction),
      beaufort: beaufort(d.wind_speed),
      gustMax: gust.v,
      gustTime: gust.time,
      humidity: d.relative_humidity,
      symbol: symbolInfo(symbol),
      symbolCode: symbol,
      precipNow,
      precipKind: precipNow > 0.05 ? precipKind(symbol, d.air_temperature) : "none",
      rainToday,
      rainLater,
      laterKind,
      pressure: p0,
      pressureDelta: p12 - p0,
      hourly,
    };
  }

  // ---------- kid advice ----------

  // Returns outfit flags for the character plus the sentence to show.
  function outfitFor(w) {
    const f = w.feels;
    const wet = w.precipKind === "rain" || (w.laterKind === "rain" && w.rainLater > 0.5);
    const snowy = w.precipKind === "snow" || (w.laterKind === "snow" && w.rainLater > 0.3);
    const o = { jacket: false, hat: false, mittens: false, scarf: false, sunglasses: false,
                raincoat: false, boots: false, umbrella: false, snowsuit: false, text: "" };

    if (snowy) {
      Object.assign(o, { snowsuit: true, hat: true, mittens: true, scarf: true, boots: true });
      o.text = "Kuldagalli, húfa og vettlingar – það snjóar!";
    } else if (wet) {
      Object.assign(o, { raincoat: true, boots: true, umbrella: w.wind < 8, hat: f < 3, mittens: f < 3 });
      o.text = f < 3 ? "Pollagalli, stígvél og hlýir vettlingar!" : "Pollagalli og stígvél í dag!";
    } else if (f >= 15) {
      o.sunglasses = w.symbol.kind === "clearsky" || w.symbol.kind === "fair";
      o.text = "Stuttermabolur dugar í dag!";
    } else if (f >= 9) {
      o.jacket = true;
      o.text = "Peysa eða léttur jakki duga í dag.";
    } else if (f >= 3) {
      o.jacket = true;
      o.text = "Úlpa og góðir skór duga í dag.";
    } else if (f >= -4) {
      Object.assign(o, { jacket: true, hat: true, mittens: true });
      o.text = "Hlý úlpa, húfa og vettlingar!";
    } else {
      Object.assign(o, { snowsuit: true, hat: true, mittens: true, scarf: true, boots: true });
      o.text = "Kuldagalli, húfa, trefill og vettlingar!";
    }
    return o;
  }

  // "Can we play outside?" traffic light.
  function playLight(w) {
    const gust = Math.max(w.gustMax, w.wind);
    if (w.wind >= 15 || gust >= 22 || w.feels <= -15 || w.precipNow >= 3 || w.symbol.kind === "thunder") {
      return { color: "red", title: "Best að vera inni", text: w.wind >= 15 || gust >= 22 ? "Of hvasst til að leika úti." : "Veðrið er of slæmt núna." };
    }
    if (w.wind >= 10 || gust >= 15 || w.feels <= -7 || w.precipNow >= 0.5) {
      return { color: "yellow", title: "Klæðið ykkur vel", text: "Það má fara út en klæða sig eftir veðri." };
    }
    return { color: "green", title: "Allir út að leika", text: "Fínt veður til að leika úti." };
  }

  function rainText(w) {
    if (w.precipKind === "snow") return "Það snjóar núna ❄️";
    if (w.precipKind === "rain") return "Það rignir núna";
    if (w.rainLater > 0.2) return w.laterKind === "snow" ? "Það gæti snjóað seinna" : "Það gæti rignt seinna";
    if (w.rainToday > 0) return "Smá dropar í kortunum";
    return "Engin rigning í kortunum";
  }

  function trend(w) {
    const dp = w.pressureDelta;
    if (dp > 1.5) return { title: "Líklega betra veður ↗", text: "loftvogin er að hækka" };
    if (dp < -1.5) return { title: "Líklega verra veður ↘", text: "loftvogin er að falla" };
    return { title: "Líklega helst veðrið svipað →", text: "loftvogin stendur í stað" };
  }

  window.Weather = { fetchForecast, cachedForecast, demoForecast, summarize, outfitFor, playLight, rainText, trend };
})();
