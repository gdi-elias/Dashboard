# Fjölskyldumælaborð – Family Dashboard

## The original prompt

> This project is to create a dashboard for my family: weather for my kids, and also
> a calendar for my kids' school, sports and other things.
>
> Let's start with the weather app of the dashboard. It should look a little bit like
> the screenshot (the "Veðrið í Nesskóla" weather board), but might look a little bit
> cooler, and maybe use for the image a Minecraft Steve or similar.
>
> Get the weather information from one of these API sites – choose what is best:
> - https://api.vedur.is/
> - https://www.vegagerdin.is/vegagerdin/gagnasafn/vefthjonustur
> - https://api.met.no/

## Vision

A wall/tablet dashboard for the family, written in Icelandic, readable from across
the room and fun for kids. It is built from independent "apps" (panels) that can be
combined on one screen.

| Module | Status | Description |
|---|---|---|
| Weather (Veðrið) | ✅ v1 | Kid-friendly weather board: what to wear, temperature, wind, rain, "can we play outside?" light, better/worse weather trend, hourly forecast. |
| Calendar (Dagatal) | 🔜 next | School timetable, sports practices, birthdays and other family events per child (e.g. from Google/Outlook/iCal feeds). |
| Other ideas | 💡 | Lunch menu at school, bus times, chore list, countdown to holidays. |

## Weather module – design reference

Inspired by the "Veðrið í Nesskóla" screen, with a Minecraft-style twist:

- **Character panel** – a blocky, Minecraft-Steve-style character (drawn in SVG, no
  copyrighted images) that changes clothes with the weather (t-shirt and sunglasses,
  jacket, beanie and mittens, rain gear and boots, umbrella…), with a speech bubble
  and a big "what to wear today" sentence.
- **Hiti núna** – thermometer, current temperature, wind chill ("með vindkælingu"),
  max/min for the next 24 h.
- **Vindurinn** – animated windsock, speed in m/s, Icelandic Beaufort name
  (logn, gola, kaldi, stormur…), direction, strength bar and strongest gust ahead.
- **Veðurljósið** – traffic light: green = everyone out to play, yellow = dress well,
  red = better to stay inside.
- **Regnglasið** – rain glass with precipitation for the rest of today.
- **Betra eða verra veður?** – gauge based on the pressure trend for the next 12 h.
- **Næstu klukkutímar** – hourly forecast strip.
- **Vissir þú?** – rotating weather fun facts.

## Data source decision

**Chosen: [api.met.no](https://api.met.no/) – Locationforecast 2.0 (`/complete`).**

- Free, no API key, JSON, works directly from the browser (CORS enabled), so the
  dashboard can be a static page with no backend.
- Covers any coordinate in Iceland with hourly temperature, wind, gusts, direction,
  pressure, humidity, precipitation and weather symbols.
- api.vedur.is has great *observations* from Icelandic stations and could be added
  later for "measured right now" values, but needs a station mapping and a proxy if
  CORS is not allowed. Vegagerðin's services are focused on roads.

Terms of use for met.no: keep request rates low (we refresh every 15 minutes) and
credit "MET Norway" (shown in the footer).
