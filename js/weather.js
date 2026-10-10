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
            cloud_area_fraction: h < 20 ? 90 : 25,
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

  // Average conditions over a list of forecast hours.
  function conditions(entries) {
    const n = entries.length;
    const avg = f => entries.reduce((a, s) => a + f(s), 0) / n;
    const det = s => s.data.instant.details;
    const precip = s => {
      const x = s.data.next_1_hours || s.data.next_6_hours;
      if (!x || !x.details) return 0;
      return (x.details.precipitation_amount || 0) / (s.data.next_1_hours ? 1 : 6);
    };
    const sym = s => {
      const x = s.data.next_1_hours || s.data.next_6_hours;
      return x && x.summary ? x.summary.symbol_code : "cloudy";
    };
    const mid = entries[Math.floor(n / 2)];
    return {
      temp: avg(s => det(s).air_temperature),
      wind: avg(s => det(s).wind_speed),
      precip: avg(precip),
      cloud: avg(s => det(s).cloud_area_fraction != null ? det(s).cloud_area_fraction : 60),
      thunder: entries.some(s => sym(s).includes("thunder")),
      symbol: symbolInfo(sym(mid)),
    };
  }

  // "Niceness" score for kids playing outside: dry, calm, mild and sunny is best.
  function niceness(c) {
    return -Math.min(3, c.precip) * 2.5
      - Math.max(0, c.wind - 4) * 0.45
      + Math.max(-10, Math.min(15, c.temp)) * 0.12
      - (c.cloud / 100) * 1.2
      - (c.thunder ? 3 : 0);
  }

  function compareDays(nowEntries, tomorrowEntries) {
    const a = conditions(nowEntries), b = conditions(tomorrowEntries);
    const delta = niceness(b) - niceness(a);
    // the biggest contributing reasons, in kid language
    const reasons = [
      [(a.precip - b.precip) * 2.5, "þurrara", "meiri úrkoma"],
      [(Math.max(0, a.wind - 4) - Math.max(0, b.wind - 4)) * 0.45, "minni vindur", "meiri vindur"],
      [(b.temp - a.temp) * 0.12, "hlýrra", "kaldara"],
      [(a.cloud - b.cloud) / 100 * 1.2, "meiri sól", "meira skýjað"],
    ].filter(([v]) => Math.abs(v) >= 0.3)
     .sort((x, y) => Math.abs(y[0]) - Math.abs(x[0]))
     .slice(0, 2)
     .map(([v, better, worse]) => v > 0 ? better : worse);
    return { delta, reasons, tomorrow: b };
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

    // pressure change over the next 24 hours (shown as a secondary hint)
    const p0 = d.air_pressure_at_sea_level;
    const p24 = in24[in24.length - 1].data.instant.details.air_pressure_at_sea_level;

    // compare the next few hours with tomorrow daytime (09–18 local time)
    const tomorrow = dayKey(new Date(now).getTime() + 24 * 3600e3);
    const hourOf = t => +new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: tz });
    const nowWindow = series.slice(idx, idx + 4);
    const tomorrowWindow = series.filter(s => dayKey(s.time) === tomorrow && hourOf(s.time) >= 9 && hourOf(s.time) <= 18);
    const outlook = compareDays(nowWindow, tomorrowWindow.length ? tomorrowWindow : in24.slice(-4));

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
      pressureDelta: p24 - p0,
      outlook,
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
    const d = w.outlook.delta, dp = w.pressureDelta;
    const reason = w.outlook.reasons.length ? w.outlook.reasons.join(" og ") : "";
    const baro = dp > 1.5 ? "loftvogin hækkar" : dp < -1.5 ? "loftvogin fellur" : "loftvogin stendur í stað";
    if (d > 1) return { title: "Betra veður á morgun ↗", reason, baro };
    if (d < -1) return { title: "Verra veður á morgun ↘", reason, baro };
    return { title: "Svipað veður á morgun →", reason: reason || "lítil breyting", baro };
  }

  window.Weather = { fetchForecast, cachedForecast, demoForecast, summarize, outfitFor, playLight, rainText, trend };
})();
