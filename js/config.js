// Dashboard settings. Any value can also be overridden in the URL, e.g.
//   index.html?lat=64.1355&lon=-21.8954&name=Reykjavík
//   index.html?demo=1   (fake data, useful for testing the layout)
window.DASHBOARD_CONFIG = {
  location: {
    name: "Reykjavík",     // shown as "Veðrið í <name>" (dative form)
    lat: 64.1466,
    lon: -21.9426,
  },
  characterName: "Veður-Steve",
  refreshMinutes: 15,       // met.no asks clients not to poll too often
  timeZone: "Atlantic/Reykjavik",
};
