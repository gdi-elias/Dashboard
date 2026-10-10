// Renders the weather dashboard.
(function () {
  const cfg = window.DASHBOARD_CONFIG;
  const params = new URLSearchParams(location.search);
  const loc = {
    name: params.get("name") || cfg.location.name,
    lat: parseFloat(params.get("lat")) || cfg.location.lat,
    lon: parseFloat(params.get("lon")) || cfg.location.lon,
  };
  const demo = params.has("demo");
  const tz = cfg.timeZone;
  const $ = id => document.getElementById(id);
  // Icelandic formatting done by hand: not every browser ships the is-IS locale.
  const fmt = (n, d = 0) => n.toFixed(d).replace(".", ",").replace(/^-(0(,0+)?)$/, "$1");
  const round = n => Math.round(n) === 0 ? 0 : Math.round(n); // avoid "-0"
  const hhmm = t => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz });
  const DAYS = ["sunnudagur", "mánudagur", "þriðjudagur", "miðvikudagur", "fimmtudagur", "föstudagur", "laugardagur"];
  const MONTHS = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];

  $("place-name").textContent = loc.name;
  document.title = `Veðrið í ${loc.name}`;

  // ---------- clock ----------
  function tickClock() {
    const now = new Date();
    $("clock-time").textContent = hhmm(now);
    const [y, m, d] = now.toLocaleDateString("en-CA", { timeZone: tz }).split("-").map(Number);
    const date = `${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}. ${MONTHS[m - 1]}`;
    $("clock-date").textContent = date.charAt(0).toUpperCase() + date.slice(1);
  }
  tickClock();
  setInterval(tickClock, 10e3);

  // ---------- fun facts ----------
  const FACTS = [
    "Mesti hiti sem mælst hefur á Íslandi er 30,5°C, á Teigarhorni árið 1939.",
    "Vindur er mældur í metrum á sekúndu (m/s). 10 m/s eru 36 km á klukkustund!",
    "Snjókorn eru sexstrend – og nánast aldrei tvö eins.",
    "Loftvog mælir loftþrýsting. Þegar hann fellur kemur oft vont veður.",
    "Regnbogi sést þegar sólin er fyrir aftan þig og rigning fyrir framan þig.",
    "Norðurljósin verða til þegar agnir frá sólinni rekast á lofthjúp jarðar.",
    "Vindkæling þýðir að okkur finnst kaldara þegar vindurinn blæs.",
    "Ský eru úr örsmáum vatnsdropum eða ískristöllum sem svífa í loftinu.",
    "Elding er heitari en yfirborð sólarinnar!",
    "Þoka er í raun ský sem liggur alveg niðri við jörðina.",
  ];
  let factIdx = Math.floor(Math.random() * FACTS.length);
  function nextFact() {
    const el = $("fact");
    el.classList.remove("show");
    setTimeout(() => { el.textContent = FACTS[factIdx++ % FACTS.length]; el.classList.add("show"); }, 400);
  }
  nextFact();
  setInterval(nextFact, 20e3);

  // ---------- typewriter speech bubble ----------
  let typing;
  function say(text) {
    const el = $("bubble");
    if (el.dataset.text === text) return;
    el.dataset.text = text;
    clearInterval(typing);
    let i = 0;
    el.textContent = "";
    typing = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(typing);
    }, 35);
  }

  // ---------- panels ----------
  function renderThermo(w) {
    const lo = -15, hi = 20, top = 20, bottom = 200;
    const y = t => bottom - (Math.max(lo, Math.min(hi, t)) - lo) / (hi - lo) * (bottom - top);
    const color = w.temp <= 0 ? "#5bb8ff" : w.temp >= 15 ? "#ff8a3d" : "#ef6a3a";
    let ticks = "";
    for (let t = lo; t <= hi; t += 5) {
      ticks += `<line x1="52" x2="${t === 0 ? 62 : 58}" y1="${y(t)}" y2="${y(t)}" stroke="#8aa0b8" stroke-width="2"/>` +
               `<text x="66" y="${y(t) + 4}" font-size="11" fill="#b8c6d6">${t}</text>`;
    }
    $("thermo").innerHTML =
      `<rect x="22" y="10" width="26" height="205" rx="13" fill="#46576b" stroke="#e8eef5" stroke-width="3"/>` +
      `<rect class="mercury" x="29" y="${y(w.temp)}" width="12" height="${215 - y(w.temp)}" rx="6" fill="${color}"/>` +
      `<circle cx="35" cy="228" r="22" fill="${color}" stroke="#e8eef5" stroke-width="3"/>` +
      `<path d="M10 ${y(w.max)} l10 -6 v12z" fill="#ef6a3a"/>` +
      `<path d="M10 ${y(w.min)} l10 -6 v12z" fill="#5bb8ff"/>` + ticks;
  }

  function renderWind(w) {
    // windsock: hangs down in calm (angle 165° from straight out) and is straight at ~15 m/s
    const k = Math.min(1, w.wind / 15);
    const droop = 75 * (1 - k);                       // degrees below horizontal
    const flap = (2 + 6 * k).toFixed(1);
    const segs = [0, 1, 2, 3, 4].map(i =>
      `<rect x="${i * 28}" y="${-16 + i * 1.5}" width="28" height="${32 - i * 3}" fill="${i % 2 ? "#fff" : "#ef6a3a"}"/>`).join("");
    $("windsock").innerHTML =
      `<rect x="36" y="30" width="7" height="220" rx="3" fill="#cfd8e3"/>` +
      `<circle cx="39.5" cy="28" r="7" fill="#e8eef5"/>` +
      `<g transform="translate(43 44) rotate(${droop})"><g class="sock" style="--flap:${flap}deg;--dur:${(1.6 - k).toFixed(2)}s">${segs}</g></g>`;

    $("wind-speed").textContent = fmt(Math.round(w.wind));
    $("wind-fun").textContent = `${w.beaufort.name}, ${w.beaufort.fun.charAt(0).toLowerCase()}${w.beaufort.fun.slice(1)}`;
    const lit = Math.min(5, Math.ceil(w.wind / 4) || (w.wind > 0 ? 1 : 0));
    [...$("wind-bars").children].forEach((b, i) => {
      b.className = i < lit ? (lit >= 4 ? "on danger" : lit >= 3 ? "on warn" : "on") : "";
    });
    // arrow points where the wind is blowing to
    $("wind-compass").style.transform = `rotate(${(w.windDir + 90) % 360}deg)`;
    $("wind-desc").textContent = `${w.windDirName} ${w.beaufort.name.toLowerCase()}`;
    $("gust-max").textContent = fmt(Math.round(w.gustMax));
    $("gust-time").textContent = `kl. ${hhmm(w.gustTime)}`;
  }

  function renderLight(w) {
    const l = Weather.playLight(w);
    $("traffic").dataset.on = l.color;
    $("light-title").textContent = l.title;
    $("light-text").textContent = l.text;
  }

  function renderRain(w) {
    const mm = w.rainToday;
    const max = 20, top = 22, bottom = 178;
    const level = bottom - Math.min(1, mm / max) * (bottom - top);
    const snow = w.precipKind === "snow" || w.laterKind === "snow";
    let ticks = "";
    for (let t = 5; t <= 20; t += 5) {
      const y = bottom - (t / max) * (bottom - top);
      ticks += `<line x1="112" x2="122" y1="${y}" y2="${y}" stroke="#e8eef5" stroke-width="2"/><text x="128" y="${y + 4}" font-size="11" fill="#b8c6d6">${t}</text>`;
    }
    $("rainglass").innerHTML =
      `<defs><clipPath id="glass"><path d="M30 18 L122 18 L114 180 L38 180 Z"/></clipPath></defs>` +
      `<g clip-path="url(#glass)"><rect x="0" y="0" width="160" height="200" fill="#46576b"/>` +
      `<rect class="water" x="0" y="${mm > 0 ? Math.min(level, bottom - 4) : bottom}" width="160" height="200" fill="${snow ? "#e8f4ff" : "#4aa3ff"}"/>` +
      `<path class="wave" d="M0 ${level} q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 v8 h-160z" fill="${snow ? "#ffffff" : "#7cc0ff"}" opacity="${mm > 0 ? 1 : 0}"/></g>` +
      `<path d="M30 18 L122 18 L114 180 L38 180 Z" fill="none" stroke="#e8eef5" stroke-width="4" stroke-linejoin="round"/>` + ticks;
    $("rain-mm").textContent = fmt(mm, 1);
    $("rain-text").textContent = Weather.rainText(w);
  }

  function renderTrend(w) {
    const t = Weather.trend(w);
    const d = Math.max(-4, Math.min(4, w.outlook.delta));
    const angle = d / 4 * 80; // -80..80 degrees
    const arc = (a0, a1, color) => {
      const r = 72, cx = 100, cy = 100, rad = a => (a - 90) * Math.PI / 180;
      const p = a => `${cx + r * Math.cos(rad(a))} ${cy + r * Math.sin(rad(a))}`;
      return `<path d="M${p(a0)} A${r} ${r} 0 0 1 ${p(a1)}" stroke="${color}" stroke-width="16" fill="none"/>`;
    };
    $("gauge").innerHTML =
      arc(-90, -30, "#ef6a3a") + arc(-30, 30, "#8a96a8") + arc(30, 90, "#6fdc8c") +
      `<g class="needle" style="transform: rotate(${angle}deg)"><path d="M97 100 L100 34 L103 100 Z" fill="#f1f5f9"/></g>` +
      `<circle cx="100" cy="100" r="9" fill="#f1f5f9"/>`;
    $("trend-title").textContent = t.title;
    const tm = w.outlook.tomorrow;
    $("trend-reason").textContent = t.reason;
    $("trend-reason").style.color = w.outlook.delta > 1 ? "var(--green)" : w.outlook.delta < -1 ? "var(--orange)" : "var(--muted)";
    $("trend-text").textContent =
      `Á morgun: ${tm.symbol.emoji} ${round(tm.temp)}° · ${fmt(Math.round(tm.wind))} m/s · ${tm.precip > 0.05 ? "úrkoma" : "þurrt"}` +
      ` · ${fmt(Math.round(w.pressure))} hPa, ${t.baro}`;
  }

  function renderHourly(w) {
    $("hourly").innerHTML = w.hourly.map((h, i) => `
      <div class="hour${i === 0 ? " now" : ""}">
        <div class="h-time">${i === 0 ? "Núna" : hhmm(h.time).slice(0, 2)}</div>
        <div class="h-icon" title="${h.symbol.text}">${h.symbol.emoji}</div>
        <div class="h-temp ${h.temp <= 0 ? "cold" : ""}">${round(h.temp)}°</div>
        <div class="h-rain">${h.precip > 0 ? fmt(h.precip, 1) + " mm" : "&nbsp;"}</div>
      </div>`).join("");
  }

  function renderSteve(w) {
    const o = Weather.outfitFor(w);
    $("steve").innerHTML = Steve.build(o);
    $("steve").style.setProperty("--sway", `${Math.min(6, w.wind / 2)}deg`);
    $("advice").textContent = o.text;
    const fx = $("weather-fx");
    fx.className = "weather-fx " + (w.precipKind !== "none" ? w.precipKind : w.symbol.kind === "clearsky" || w.symbol.kind === "fair" ? "sun" : "");
    if (!fx.dataset.built) {
      fx.innerHTML = Array.from({ length: 28 }, () =>
        `<i style="left:${Math.random() * 100}%;animation-delay:-${(Math.random() * 3).toFixed(2)}s;animation-duration:${(0.8 + Math.random() * 1.5).toFixed(2)}s"></i>`).join("");
      fx.dataset.built = "1";
    }
    say(`Hæ! Ég er ${cfg.characterName}. Úti er ${w.symbol.text.toLowerCase()} og ${round(w.temp)} stiga hiti. Svona eigið þið að klæða ykkur í dag:`);
  }

  function render(w) {
    $("temp-now").textContent = `${round(w.temp)}°`;
    $("temp-feels").textContent = `(${round(w.feels)}°C)`;
    $("temp-max").textContent = round(w.max);
    $("temp-min").textContent = round(w.min);
    renderThermo(w);
    renderWind(w);
    renderLight(w);
    renderRain(w);
    renderTrend(w);
    renderHourly(w);
    renderSteve(w);
  }

  function setStatus(ok, text) {
    $("status-dot").className = "dot " + (ok ? "ok" : "bad");
    $("status-text").textContent = text;
  }

  async function load() {
    try {
      const data = demo ? Weather.demoForecast() : await Weather.fetchForecast(loc.lat, loc.lon);
      render(Weather.summarize(data, tz));
      setStatus(true, demo ? "Prufugögn" : `Spá uppfærð kl. ${hhmm(data.properties.meta.updated_at)}`);
    } catch (err) {
      console.error(err);
      const cached = Weather.cachedForecast();
      if (cached) {
        render(Weather.summarize(cached.json, tz));
        setStatus(false, `Ekki náðist samband – gögn frá kl. ${hhmm(cached.at)}`);
      } else {
        setStatus(false, "Ekki náðist í veðurspá");
      }
    }
  }

  load();
  setInterval(load, cfg.refreshMinutes * 60e3);
})();
