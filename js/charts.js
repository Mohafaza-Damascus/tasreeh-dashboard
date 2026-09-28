(() => {
  "use strict";

  const HEAT_COLORS = ["#f1ede3", "#d4ece5", "#a9d8ca", "#74bda9", "#3f9c85", "#1f7d68", "#0d5f4f", "#064239"];
  const HEAT_STEPS = HEAT_COLORS.length - 1;
  const EMPTY_TEXT = "لا توجد بيانات ضمن الفلاتر الحالية";
  const intFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
  const formatInt = (value) => intFormat.format(value);

  function compact(n) {
    const abs = Math.abs(n);
    if (abs >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
    if (abs >= 1e4) return `${(n / 1e3).toFixed(0)}K`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
    return formatInt(n);
  }

  function niceTicks(max, count) {
    if (!max || max <= 0) return [0, 1];
    const raw = max / count;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const normalized = raw / magnitude;
    let step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
    if (step < 1 && max >= 1) step = 1;
    const ticks = [];
    for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000);
    if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
  }

  function renderEmpty(el) {
    el.innerHTML = `<div class="viz-empty">${esc(EMPTY_TEXT)}</div>`;
  }

  let tipEl = null;

  function tooltip() {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "viz-tip";
      tipEl.setAttribute("role", "tooltip");
      tipEl.hidden = true;
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }

  function showTip(html, clientX, clientY) {
    const tip = tooltip();
    tip.innerHTML = html;
    tip.hidden = false;
    const gap = 14;
    const { offsetWidth: w, offsetHeight: h } = tip;
    let x = clientX - w - gap;
    if (x < 8) x = clientX + gap;
    if (x + w > window.innerWidth - 8) x = window.innerWidth - w - 8;
    let y = clientY - h - gap;
    if (y < 8) y = clientY + gap;
    tip.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
  }

  function hideTip() {
    if (tipEl) tipEl.hidden = true;
  }

  window.addEventListener("scroll", hideTip, { passive: true });

  const tipTitle = (text) => `<div class="viz-tip-title">${esc(text)}</div>`;

  function tipRow(color, name, value, strong = false) {
    const swatch = color ? `<i style="background:${color}"></i>` : '<i class="blank"></i>';
    return `<div class="viz-tip-row${strong ? " is-strong" : ""}">${swatch}<span>${esc(name)}</span><b>${value}</b></div>`;
  }

  function bindTip(node, render) {
    node.addEventListener("pointermove", (ev) => showTip(render(), ev.clientX, ev.clientY));
    node.addEventListener("pointerleave", hideTip);
  }

  function valueTip(item, opts) {
    return tipTitle(item.label) + tipRow(opts.color, opts.valueLabel, formatInt(item.value));
  }

  function line(el, opts) {
    const { series, labels } = opts;
    const n = labels.length;
    if (!n || !series.length) return renderEmpty(el);

    const W = Math.max(280, el.clientWidth);
    const H = opts.height || 280;
    const m = { t: 16, r: 14, b: 30, l: 46 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;
    const max = Math.max(0, ...series.flatMap((s) => s.values));
    const ticks = niceTicks(max, 4);
    const yMax = ticks[ticks.length - 1] || 1;
    const x = (i) => m.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (v) => m.t + ih - (v / yMax) * ih;

    let svg = `<svg class="viz-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(opts.ariaLabel)}">`;

    ticks.forEach((t) => {
      svg += `<line class="viz-grid${t === 0 ? " is-base" : ""}" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/>`;
      svg += `<text class="viz-axis" x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${compact(t)}</text>`;
    });

    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 78))));
    for (let i = 0; i < n; i += every) {
      svg += `<text class="viz-axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(opts.xFormat(labels[i]))}</text>`;
    }

    series.forEach((s) => {
      const points = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
      if (opts.area && series.length === 1) {
        svg += `<path class="viz-area" style="fill:${s.color}" d="M${x(0)},${y(0)} L${points.join(" L")} L${x(n - 1)},${y(0)} Z"/>`;
      }
      svg += `<polyline class="viz-line" style="stroke:${s.color}" points="${points.join(" ")}"/>`;
      svg += `<circle class="viz-dot" style="fill:${s.color}" cx="${x(n - 1)}" cy="${y(s.values[n - 1])}" r="4"/>`;
    });

    svg += `<g class="viz-hover" visibility="hidden"><line class="viz-cross" y1="${m.t}" y2="${m.t + ih}"/>`;
    series.forEach((s, k) => {
      svg += `<circle class="viz-dot" data-k="${k}" style="fill:${s.color}" r="5"/>`;
    });
    svg += `</g><rect class="viz-hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/></svg>`;
    el.innerHTML = svg;

    const root = el.querySelector("svg");
    const hover = root.querySelector(".viz-hover");
    const cross = hover.querySelector("line");
    const dots = hover.querySelectorAll("circle");

    function move(ev) {
      const box = root.getBoundingClientRect();
      const px = (ev.clientX - box.left) * (W / box.width);
      const i = Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / iw) * (n - 1))));
      hover.setAttribute("visibility", "visible");
      cross.setAttribute("x1", x(i));
      cross.setAttribute("x2", x(i));

      const rows = series
        .map((s, k) => {
          dots[k].setAttribute("cx", x(i));
          dots[k].setAttribute("cy", y(s.values[i]));
          return { color: s.color, name: s.name, value: s.values[i] };
        })
        .sort((a, b) => b.value - a.value);

      let html = tipTitle(opts.tipTitle(labels[i]));
      rows.forEach((row) => {
        html += tipRow(row.color, row.name, compact(row.value));
      });
      if (rows.length > 1) {
        const total = rows.reduce((acc, row) => acc + row.value, 0);
        html += tipRow(null, "المجموع", compact(total), true);
      }
      showTip(html, ev.clientX, ev.clientY);
    }

    root.addEventListener("pointermove", move);
    root.addEventListener("pointerdown", move);
    root.addEventListener("pointerleave", () => {
      hover.setAttribute("visibility", "hidden");
      hideTip();
    });
  }

  function legend(el, items) {
    el.innerHTML = items
      .map(
        (item) =>
          `<span class="viz-legend-item"><i style="background:${item.color}"></i>${esc(item.name)} <b>${item.value}</b></span>`
      )
      .join("");
  }

  function hbar(el, opts) {
    const { items } = opts;
    if (!items.length) return renderEmpty(el);

    const max = Math.max(...items.map((item) => item.value)) || 1;
    const rows = items.map((item, i) => {
      const width = item.value > 0 ? Math.max(0.8, (item.value / max) * 100) : 0;
      return (
        `<div class="viz-hbar-row" data-i="${i}">` +
        `<span class="viz-hbar-label" title="${esc(item.label)}">${esc(item.label)}</span>` +
        `<span class="viz-hbar-track"><span class="viz-hbar-fill" style="width:${width}%"><i style="flex:1;background:${opts.color}"></i></span></span>` +
        `<b class="viz-hbar-value">${formatInt(item.value)}</b>` +
        `</div>`
      );
    });
    el.innerHTML = `<div class="viz-hbar">${rows.join("")}</div>`;

    el.querySelectorAll(".viz-hbar-row").forEach((row) => {
      const item = items[Number(row.dataset.i)];
      bindTip(row, () => valueTip(item, opts));
    });
  }

  function heatmap(el, opts) {
    const { rows, cols, values, colTip } = opts;
    const max = Math.max(0, ...values.flat());
    if (!max) return renderEmpty(el);

    const step = (v) => Math.max(1, Math.ceil((v / max) * HEAT_STEPS));
    const every = opts.colEvery || 1;

    let html = `<div class="viz-heat" style="grid-template-columns:auto repeat(${cols.length},minmax(0,1fr))"><span></span>`;
    cols.forEach((col, j) => {
      html += `<span class="viz-heat-col">${j % every === 0 ? esc(col) : ""}</span>`;
    });
    rows.forEach((label, i) => {
      html += `<span class="viz-heat-row">${esc(label)}</span>`;
      values[i].forEach((v, j) => {
        html += `<span class="viz-heat-cell" data-r="${i}" data-c="${j}" style="background:${HEAT_COLORS[v === 0 ? 0 : step(v)]}"></span>`;
      });
    });
    el.innerHTML = `${html}</div>`;

    el.querySelectorAll(".viz-heat-cell").forEach((cell) => {
      const i = Number(cell.dataset.r);
      const j = Number(cell.dataset.c);
      const v = values[i][j];
      bindTip(
        cell,
        () => tipTitle(`${rows[i]} — ${colTip(j)}`) + tipRow(HEAT_COLORS[step(v)], "عدد الطلبات", formatInt(v))
      );
    });
  }

  window.Charts = { esc, line, legend, hbar, heatmap };
})();
