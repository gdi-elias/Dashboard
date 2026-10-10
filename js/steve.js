// A blocky, Minecraft-style character drawn as pixel rects in SVG.
// Grid units: body is 16 wide x 32 tall (head 8x8, torso 8x12, legs 4x12).
// The outfit object comes from Weather.outfitFor().
(function () {
  const C = {
    skin: "#c8956b", skinDark: "#a8754f", hair: "#3b2716", eyeWhite: "#ffffff", eye: "#4b3c9e",
    mouth: "#6b3b25", shirt: "#00a8a8", shirtDark: "#008a8a", pants: "#3a3aa8", pantsDark: "#2e2e8a",
    shoes: "#5a5a5a", jacket: "#3f6fd8", jacketDark: "#2f56ad", rain: "#f6c629", rainDark: "#d9a90f",
    snow: "#e2483d", snowDark: "#b8352c", hat: "#e2483d", hatBand: "#ffffff", mitten: "#e2483d",
    scarf: "#f2f2f2", scarfStripe: "#e2483d", boots: "#3fa34d", bootsDark: "#2f7f3b", glasses: "#111",
  };

  function px(x, y, w, h, fill, extra) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra || ""}/>`;
  }

  function build(o) {
    o = o || {};
    const out = [];
    const coat = o.snowsuit ? [C.snow, C.snowDark] : o.raincoat ? [C.rain, C.rainDark] : o.jacket ? [C.jacket, C.jacketDark] : null;
    const longSleeves = !!coat;

    // ---- legs ----
    const legC = o.snowsuit ? [C.snow, C.snowDark] : o.raincoat ? [C.rain, C.rainDark] : [C.pants, C.pantsDark];
    out.push(px(4, 20, 4, 12, legC[0]), px(8, 20, 4, 12, legC[1]));
    if (o.boots) {
      out.push(px(4, 26, 4, 6, C.boots), px(8, 26, 4, 6, C.bootsDark), px(4, 26, 8, 0.6, "#ffffff33"));
    } else {
      out.push(px(4, 30, 4, 2, C.shoes), px(8, 30, 4, 2, "#4a4a4a"));
    }

    // ---- arms ----
    const armTop = coat ? coat : [C.shirt, C.shirtDark];
    const armL = `<g class="arm arm-l">` +
      px(0, 8, 4, 4, armTop[1]) + px(0, 12, 4, 6, longSleeves ? armTop[1] : C.skinDark) +
      px(0, 18, 4, 2, o.mittens ? C.mitten : C.skinDark) + `</g>`;
    const armR = `<g class="arm arm-r">` +
      px(12, 8, 4, 4, armTop[0]) + px(12, 12, 4, 6, longSleeves ? armTop[0] : C.skin) +
      px(12, 18, 4, 2, o.mittens ? C.mitten : C.skin) +
      (o.umbrella ? umbrella() : "") + `</g>`;
    out.push(armL, armR);

    // ---- torso ----
    if (coat) {
      out.push(px(4, 8, 8, 12, coat[0]), px(4, 18, 8, 2, coat[1]), px(7.8, 8, 0.4, 12, "#ffffffcc"));
      out.push(px(4, 12, 8, 0.35, coat[1]), px(4, 15.5, 8, 0.35, coat[1])); // puffer lines
    } else {
      out.push(px(4, 8, 8, 12, C.shirt), px(7, 8, 2, 1, C.skin), px(4, 18, 8, 2, C.pants));
    }
    if (o.scarf) {
      out.push(px(4, 8, 8, 1.5, C.scarf), px(5, 8, 1, 1.5, C.scarfStripe), px(8, 8, 1, 1.5, C.scarfStripe),
               px(9, 9.5, 2, 4, C.scarf), px(9, 11, 2, 0.8, C.scarfStripe));
    }

    // ---- head ----
    const head = [];
    head.push(px(4, 0, 8, 8, C.skin));
    head.push(px(4, 0, 8, 2, C.hair), px(4, 2, 1, 1, C.hair), px(11, 2, 1, 1, C.hair));
    head.push(px(5, 4, 1, 1, C.eyeWhite), px(6, 4, 1, 1, C.eye), px(9, 4, 1, 1, C.eye), px(10, 4, 1, 1, C.eyeWhite));
    head.push(px(7, 5, 2, 1, C.skinDark));
    head.push(px(6, 6, 4, 1, C.mouth), px(5, 7, 6, 1, C.hair));
    if (o.sunglasses) head.push(px(4.6, 3.6, 6.8, 1.6, C.glasses), px(5, 3.8, 1, 0.5, "#ffffff55"), px(9, 3.8, 1, 0.5, "#ffffff55"));
    if (o.raincoat && !o.hat) {
      // sou'wester rain hat
      head.push(px(4, -1.5, 8, 3, C.rain), px(2.5, 1.5, 11, 1, C.rainDark));
    } else if (o.hat) {
      head.push(px(4, -1.5, 8, 3, C.hat), px(4, 1.5, 8, 1, C.hatBand), px(7, -3, 2, 1.5, C.hatBand));
    }
    // blink
    head.push(`<g class="blink">${px(5, 4, 2, 1, C.skin)}${px(9, 4, 2, 1, C.skin)}</g>`);
    out.push(`<g class="head">${head.join("")}</g>`);

    return `<svg viewBox="-9 -6 34 39" preserveAspectRatio="xMidYMax meet" class="steve-svg" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">` +
      `<g class="steve-body">${out.join("")}</g></svg>`;
  }

  function umbrella() {
    // handle in the right hand, canopy above the head
    return px(13.6, 4, 0.8, 16, "#3b2716") +
      px(4, 1, 20, 2, "#7b3fd0") + px(6, -1, 16, 2, "#9a5cf0") + px(9, -3, 10, 2, "#b07df5") + px(13, -4, 2, 1, "#3b2716") +
      px(4, 3, 2, 0.8, "#5b2fa0") + px(10, 3, 2, 0.8, "#5b2fa0") + px(16, 3, 2, 0.8, "#5b2fa0") + px(22, 3, 2, 0.8, "#5b2fa0");
  }

  window.Steve = { build };
})();
