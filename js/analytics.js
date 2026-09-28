(() => {
  "use strict";

  const Api = window.TasreehApi;
  const Charts = window.Charts;
  const { esc } = Charts;
  const lookups = Api.lookups;

  const DAY = 86400000;
  const DEFAULT_RANGE = "30";
  const DEFAULT_TYPE = "transport";
  const ALL_PERIOD = 3650;
  const EMPTY_TEXT = "لا توجد بيانات ضمن الفلاتر الحالية";

  const ACCENT = "#00806a";
  const STATUSES = ["done", "progress", "rejected"];
  const STATUS_COLOR = { done: "#0ca30c", progress: "#fab219", rejected: "#d03b3b" };
  const CATEGORY_COLORS = ["#00806a", "#d08a1c", "#5a4fb0", "#c2185b", "#2f7fc1"];

  const MONTHS = [
    "كانون الثاني",
    "شباط",
    "آذار",
    "نيسان",
    "أيار",
    "حزيران",
    "تموز",
    "آب",
    "أيلول",
    "تشرين الأول",
    "تشرين الثاني",
    "كانون الأول"
  ];
  const WEEK = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const WEEK_JS = [6, 0, 1, 2, 3, 4, 5];
  const HOURS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

  const KPI_LABELS = ["إجمالي الطلبات", "متوسط الطلبات باليوم"];

  const CARD = {
    trend: { id: "trend", span: 8, title: "حركة الطلبات عبر الزمن", legend: true },
    status: { id: "status", span: 4, title: "توزيع حالات التصريح" },
    landfills: { id: "landfills", span: 5, title: "أكثر المكبات استخداماً" },
    entities: { id: "entities", span: 5, title: "أكثر الجهات طلباً" },
    heatmap: { id: "heatmap", span: 7, title: "أوقات الذروة" }
  };

  const CARDS_WITHOUT_RANKING = [CARD.trend, CARD.status, { ...CARD.heatmap, span: 12 }];

  const TYPES = {
    transport: {
      filters: ["status", "licenseType"],
      splits: [
        ["status", "حسب الحالة"],
        ["licenseType", "حسب نوع الرخصة"],
        ["total", "الإجمالي"]
      ],
      cards: CARDS_WITHOUT_RANKING
    },
    rubble: {
      filters: ["status", "landfill"],
      splits: [
        ["status", "حسب الحالة"],
        ["landfill", "حسب المكب"],
        ["total", "الإجمالي"]
      ],
      cards: [CARD.trend, CARD.status, CARD.landfills, CARD.heatmap]
    },
    excavation: {
      filters: ["status", "entity"],
      splits: [
        ["status", "حسب الحالة"],
        ["entity", "حسب الجهة"],
        ["total", "الإجمالي"]
      ],
      cards: [CARD.trend, CARD.status, CARD.entities, CARD.heatmap]
    },
    distributor: {
      filters: ["status", "material"],
      splits: [
        ["status", "حسب الحالة"],
        ["total", "الإجمالي"]
      ],
      cards: CARDS_WITHOUT_RANKING
    },
    vehicle_enter: {
      filters: ["status", "entryType"],
      splits: [
        ["status", "حسب الحالة"],
        ["entryType", "حسب نوع الترخيص"],
        ["total", "الإجمالي"]
      ],
      cards: CARDS_WITHOUT_RANKING
    }
  };

  const SPLIT_NAMES = {
    licenseType: "licenseTypes",
    entryType: "entryTypes",
    landfill: "landfills",
    entity: "entities"
  };

  const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const pad = (n) => String(n).padStart(2, "0");
  const hour12 = (h, space = " ") => `${h % 12 || 12}${space}${h < 12 ? "ص" : "م"}`;
  const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtDate = (d) => `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  const sum = (values) => values.reduce((acc, v) => acc + (v || 0), 0);
  const lookupName = (dictionary, key) => lookups[dictionary][key] || key || "—";

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function daysAgo(days) {
    return startOfDay(new Date(Date.now() - days * DAY));
  }

  function groupBy(list, keyFn) {
    const groups = new Map();
    list.forEach((item) => {
      const key = keyFn(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return groups;
  }

  const FILTERS = {
    status: {
      label: "الحالة",
      all: "كل الحالات",
      values: (p) => [p.status],
      options: () => STATUSES.map((k) => ({ value: k, label: lookups.statuses[k], color: STATUS_COLOR[k] }))
    },
    licenseType: {
      label: "نوع الرخصة",
      all: "كل الرخص",
      values: (p) => [p.licenseType],
      options: () => Object.entries(lookups.licenseTypes).map(([value, label]) => ({ value, label }))
    },
    entryType: {
      label: "نوع الترخيص",
      all: "كل التراخيص",
      values: (p) => [p.entryType],
      options: () => Object.entries(lookups.entryTypes).map(([value, label]) => ({ value, label }))
    },
    landfill: {
      label: "المكب",
      all: "كل المكبات",
      values: (p) => [p.landfill],
      options: () => Object.keys(lookups.landfills).map((k) => ({ value: k, label: lookupName("landfills", k) }))
    },
    material: {
      label: "المادة",
      all: "كل المواد",
      values: (p) => p.materials,
      options: () => Object.keys(lookups.materials).map((k) => ({ value: k, label: lookupName("materials", k) }))
    },
    entity: {
      label: "الجهة",
      all: "كل الجهات",
      values: (p) => [p.entity],
      options: () => Object.keys(lookups.entities).map((k) => ({ value: k, label: lookupName("entities", k) }))
    }
  };

  let type = DEFAULT_TYPE;
  const config = () => TYPES[type];
  const filterKeys = () => config().filters;

  function defaultState() {
    return {
      range: DEFAULT_RANGE,
      from: null,
      to: null,
      filters: Object.fromEntries(filterKeys().map((key) => [key, []])),
      trendSplit: "status"
    };
  }

  let state = defaultState();
  let permits = [];
  const view = { range: null, inRange: [], current: [] };

  function writeHash() {
    const params = new URLSearchParams();
    if (type !== DEFAULT_TYPE) params.set("type", type);
    if (state.range !== DEFAULT_RANGE) params.set("range", state.range);
    if (state.range === "custom") {
      if (state.from) params.set("from", state.from);
      if (state.to) params.set("to", state.to);
    }
    filterKeys().forEach((key) => {
      if (state.filters[key].length) params.set(key, state.filters[key].join(","));
    });
    const query = params.toString();
    history.replaceState(null, "", query ? `#${query}` : location.pathname + location.search);
  }

  function readHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    type = TYPES[params.get("type")] ? params.get("type") : DEFAULT_TYPE;
    state = defaultState();
    state.range = params.get("range") || DEFAULT_RANGE;
    state.from = params.get("from");
    state.to = params.get("to");
    filterKeys().forEach((key) => {
      if (params.get(key)) state.filters[key] = params.get(key).split(",");
    });
  }

  function currentRange() {
    const now = new Date();
    switch (state.range) {
      case "7":
        return { from: daysAgo(6), to: now };
      case "30":
        return { from: daysAgo(29), to: now };
      case "90":
        return { from: daysAgo(89), to: now };
      case "ytd":
        return { from: new Date(now.getFullYear(), 0, 1), to: now };
      case "custom":
        return {
          from: state.from ? new Date(`${state.from}T00:00:00`) : daysAgo(29),
          to: state.to ? new Date(`${state.to}T23:59:59`) : now
        };
      default: {
        const first = permits.reduce((min, p) => (p.submittedAt < min ? p.submittedAt : min), now);
        return { from: startOfDay(first), to: now };
      }
    }
  }

  function matches(permit, exceptKey) {
    return filterKeys().every((key) => {
      const selected = state.filters[key];
      if (key === exceptKey || !selected.length) return true;
      return FILTERS[key].values(permit).some((v) => selected.includes(v));
    });
  }

  function compute() {
    const range = currentRange();
    view.range = range;
    view.inRange = permits.filter((p) => p.submittedAt >= range.from && p.submittedAt <= range.to);
    view.current = view.inRange.filter((p) => matches(p));
  }

  function optionLabel(key, value) {
    const option = FILTERS[key].options().find((o) => o.value === value);
    return option ? option.label : value;
  }

  function facetCounts(key) {
    const counts = {};
    view.inRange.forEach((p) => {
      if (!matches(p, key)) return;
      FILTERS[key].values(p).forEach((v) => {
        if (v != null) counts[v] = (counts[v] || 0) + 1;
      });
    });
    return counts;
  }

  let openFilter = null;

  function filterButtonText(key) {
    const def = FILTERS[key];
    const selected = state.filters[key];
    if (!selected.length) return esc(def.all);
    if (selected.length === 1) return `<b>${esc(optionLabel(key, selected[0]))}</b>`;
    return `${esc(def.label)}: <b>${selected.length}</b>`;
  }

  function refreshFilterButton(host) {
    const key = host.dataset.ms;
    const button = host.firstElementChild;
    host.classList.toggle("is-set", state.filters[key].length > 0);
    button.firstElementChild.innerHTML = filterButtonText(key);
    button.setAttribute("aria-label", FILTERS[key].label);
  }

  function buildFilter(host) {
    host.classList.add("ms");
    host.innerHTML =
      '<button type="button" class="ms-btn" aria-haspopup="listbox" aria-expanded="false"><span></span></button>';
    host.firstElementChild.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasOpen = openFilter === host;
      closeFilter();
      if (!wasOpen) openFilterPopup(host);
    });
    refreshFilterButton(host);
  }

  function filterOption(option, checked, count) {
    const swatch = option.color ? `<i style="background:${option.color}"></i>` : "";
    return (
      `<label class="ms-opt">` +
      `<input type="checkbox" value="${esc(option.value)}"${checked ? " checked" : ""} />` +
      `${swatch}<span>${esc(option.label)}</span><small>${nf.format(count || 0)}</small></label>`
    );
  }

  function keepInViewport(el, margin = 8) {
    const { left, right } = el.getBoundingClientRect();
    const shift =
      left < margin ? margin - left : right > window.innerWidth - margin ? window.innerWidth - margin - right : 0;
    if (shift) el.style.transform = `translateX(${Math.round(shift)}px)`;
  }

  function openFilterPopup(host) {
    const key = host.dataset.ms;
    const def = FILTERS[key];
    const counts = facetCounts(key);
    const selected = state.filters[key];

    const pop = document.createElement("div");
    pop.className = "ms-pop";
    pop.setAttribute("role", "listbox");
    pop.setAttribute("aria-multiselectable", "true");
    pop.innerHTML =
      `<div class="ms-list">${def
        .options()
        .map((o) => filterOption(o, selected.includes(o.value), counts[o.value]))
        .join("")}</div>` +
      '<div class="ms-foot"><button type="button" data-ms-all>تحديد الكل</button><button type="button" data-ms-clear>مسح</button></div>';

    host.appendChild(pop);
    keepInViewport(pop);
    host.firstElementChild.setAttribute("aria-expanded", "true");
    openFilter = host;

    const setSelection = (values) => {
      state.filters[key] = values;
      update();
    };

    pop.addEventListener("click", (e) => e.stopPropagation());
    pop.addEventListener("change", () => setSelection($$("input[type=checkbox]:checked", pop).map((i) => i.value)));

    $("[data-ms-all]", pop).addEventListener("click", () => {
      const inputs = $$("input[type=checkbox]", pop);
      inputs.forEach((i) => (i.checked = true));
      setSelection(inputs.map((i) => i.value));
    });
    $("[data-ms-clear]", pop).addEventListener("click", () => {
      $$("input[type=checkbox]", pop).forEach((i) => (i.checked = false));
      setSelection([]);
    });
  }

  function closeFilter() {
    if (!openFilter) return;
    const pop = $(".ms-pop", openFilter);
    if (pop) pop.remove();
    openFilter.firstElementChild.setAttribute("aria-expanded", "false");
    openFilter = null;
  }

  function buildFilters() {
    $("[data-filters-main]").innerHTML = filterKeys()
      .map((key) => `<div data-ms="${key}"></div>`)
      .join("");
    $$("[data-ms]").forEach(buildFilter);
  }

  function setPressed(group, value) {
    $$("button", group).forEach((button) => {
      const buttonValue = button.dataset.val || button.dataset.rangeVal;
      button.setAttribute("aria-pressed", String(buttonValue === value));
    });
  }

  function limitDates(fromInput, toInput) {
    const today = isoDay(new Date());
    fromInput.max = toInput.value && toInput.value < today ? toInput.value : today;
    toInput.min = fromInput.value || "";
    toInput.max = today;
  }

  function syncRange() {
    setPressed($("[data-range]"), state.range);
    $("[data-custom-range]").hidden = state.range !== "custom";
  }

  function syncControls() {
    const fromInput = $("[data-date-from]");
    const toInput = $("[data-date-to]");
    syncRange();
    fromInput.value = state.from || isoDay(view.range.from);
    toInput.value = state.to || isoDay(view.range.to);
    limitDates(fromInput, toInput);
    $$("[data-ms]").forEach(refreshFilterButton);
  }

  function segmented(control, options, value) {
    const buttons = options
      .map(
        ([key, label]) => `<button type="button" data-val="${key}" aria-pressed="${key === value}">${label}</button>`
      )
      .join("");
    return `<div class="seg seg-sm" role="group" data-ctl="${control}">${buttons}</div>`;
  }

  function cardTemplate(card) {
    const tools =
      card.id === "trend"
        ? `<div class="card-tools">${segmented("trendSplit", config().splits, state.trendSplit)}</div>`
        : "";
    const legend = card.legend ? `<div class="card-legend" data-legend="${card.id}"></div>` : "";
    return (
      `<article class="card span-${card.span}" data-card="${card.id}">` +
      `<header class="card-head"><div><h2>${card.title}</h2></div>${tools}</header>` +
      legend +
      `<div class="card-body" data-chart="${card.id}"><div class="skeleton"></div></div>` +
      `</article>`
    );
  }

  function buildGrid() {
    $("[data-grid]").innerHTML = config().cards.map(cardTemplate).join("");
  }

  function kpiTile(label, value, loading = false) {
    return (
      `<div class="kpi${loading ? " is-loading" : ""}">` +
      `<span class="kpi-label">${label}</span><span class="kpi-value">${value}</span></div>`
    );
  }

  function renderKpiSkeleton() {
    $("[data-kpis]").innerHTML = KPI_LABELS.map((label) => kpiTile(label, '<span class="kpi-ph"></span>', true)).join(
      ""
    );
  }

  function renderKPIs() {
    const list = view.current;
    const days = Math.max(1, Math.ceil((view.range.to - view.range.from) / DAY));
    const values = [nf.format(list.length), nf.format(list.length / days)];
    $("[data-kpis]").innerHTML = KPI_LABELS.map((label, i) => kpiTile(label, values[i])).join("");
  }

  function buckets() {
    const { from, to } = view.range;
    const span = (to - from) / DAY;
    const unit = span <= 45 ? "day" : span <= 220 ? "week" : "month";
    const list = [];
    let d = startOfDay(from);
    if (unit === "week") d = new Date(d - ((d.getDay() + 1) % 7) * DAY);
    if (unit === "month") d = new Date(d.getFullYear(), d.getMonth(), 1);

    while (d <= to) {
      list.push(d);
      if (unit === "day") d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      else if (unit === "week") d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
      else d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }

    const indexOf = (date) => {
      let lo = 0;
      let hi = list.length - 1;
      let found = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (list[mid] <= date) {
          found = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return found;
    };

    return { unit, list, indexOf };
  }

  function bucketLabel(d, unit) {
    if (unit === "month") return MONTHS[d.getMonth()] + (d.getMonth() === 0 ? ` ${d.getFullYear()}` : "");
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  function bucketTitle(d, unit) {
    if (unit === "month") return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (unit === "week") {
      const end = new Date(d.getTime() + 6 * DAY);
      return `أسبوع ${fmtDate(d)} – ${end.getDate()}/${end.getMonth() + 1}`;
    }
    return `${WEEK[WEEK_JS.indexOf(d.getDay())]} ${fmtDate(d)}`;
  }

  function countSeries(list, b, keyFn, keys) {
    const out = Object.fromEntries(keys.map((k) => [k, b.list.map(() => 0)]));
    list.forEach((p) => {
      const i = b.indexOf(p.submittedAt);
      const key = keyFn(p);
      if (i >= 0 && out[key]) out[key][i]++;
    });
    return out;
  }

  function splitSeries(b, field, keys, names, colors) {
    const counts = countSeries(view.current, b, (p) => p[field], keys);
    const selected = state.filters[field];
    return keys
      .filter((k) => !selected.length || selected.includes(k))
      .map((k) => ({ name: names[k], color: colors(k), values: counts[k] }));
  }

  function trendSeries(b) {
    if (state.trendSplit === "status") {
      return splitSeries(b, "status", STATUSES, lookups.statuses, (k) => STATUS_COLOR[k]);
    }
    const names = lookups[SPLIT_NAMES[state.trendSplit]];
    if (names) {
      const keys = Object.keys(names);
      return splitSeries(
        b,
        state.trendSplit,
        keys,
        names,
        (k) => CATEGORY_COLORS[keys.indexOf(k) % CATEGORY_COLORS.length]
      );
    }
    const total = countSeries(view.current, b, () => "all", ["all"]).all;
    return [{ name: "إجمالي الطلبات", color: ACCENT, values: total }];
  }

  function donut(items, total) {
    const radius = 70;
    const stroke = 18;
    const circumference = 2 * Math.PI * radius;
    const visible = items.filter((i) => i.value);
    const gap = visible.length > 1 ? 3 : 0;
    const ring = (attrs) => `<circle r="${radius}" cx="90" cy="90" fill="none" stroke-width="${stroke}" ${attrs}`;

    let offset = 0;
    const arcs = visible
      .map((i) => {
        const length = (i.value / total) * circumference;
        const segment = Math.max(0, length - gap);
        const arc = ring(
          `style="stroke:${i.color}" stroke-dasharray="${segment.toFixed(2)} ${(circumference - segment).toFixed(2)}" ` +
            `stroke-dashoffset="${(-offset).toFixed(2)}"><title>${esc(i.name)}: ${nf.format(i.value)}</title></circle>`
        );
        offset += length;
        return arc;
      })
      .join("");

    return (
      `<div class="st-donut"><svg viewBox="0 0 180 180" role="img" aria-label="توزيع حالات التصريح">` +
      `<g transform="rotate(-90 90 90)">${ring('style="stroke:#f2eee4"/>')}${arcs}</g></svg>` +
      `<div class="st-total"><strong>${nf.format(total)}</strong><span>طلب</span></div></div>`
    );
  }

  const chartEl = (id) => $(`[data-chart="${id}"]`);

  function renderRanking(cardId, field, dictionary) {
    const items = [...groupBy(view.current, (p) => p[field])]
      .map(([key, list]) => ({ label: lookupName(dictionary, key), value: list.length }))
      .sort((a, b) => b.value - a.value);
    const host = chartEl(cardId);
    host.innerHTML = "<div data-list></div>";
    Charts.hbar($("[data-list]", host), { items, color: ACCENT, valueLabel: "طلبات" });
  }

  const RENDER = {
    trend() {
      const b = buckets();
      const series = trendSeries(b);
      const legendEl = $('[data-legend="trend"]');

      if (series.length > 1) {
        Charts.legend(
          legendEl,
          series.map((s) => ({ name: s.name, color: s.color, value: nf.format(sum(s.values)) }))
        );
      } else {
        legendEl.innerHTML = "";
      }

      Charts.line(chartEl("trend"), {
        labels: b.list,
        series,
        area: series.length === 1,
        height: 290,
        ariaLabel: "حركة الطلبات عبر الزمن",
        xFormat: (d) => bucketLabel(d, b.unit),
        tipTitle: (d) => bucketTitle(d, b.unit)
      });
    },

    status() {
      const list = view.current;
      const host = chartEl("status");
      if (!list.length) {
        host.innerHTML = `<div class="viz-empty">${EMPTY_TEXT}</div>`;
        return;
      }
      const items = STATUSES.map((k) => ({
        name: lookups.statuses[k],
        color: STATUS_COLOR[k],
        value: list.filter((p) => p.status === k).length
      }));
      const legend = items
        .map(
          (i) =>
            `<div class="st-item"><span class="st-name"><i style="background:${i.color}"></i>${esc(i.name)}</span>` +
            `<b>${nf.format(i.value)}</b><em>${nf1.format((i.value / list.length) * 100)}%</em></div>`
        )
        .join("");
      host.innerHTML = `<div class="st">${donut(items, list.length)}<div class="st-items">${legend}</div></div>`;
    },

    landfills() {
      renderRanking("landfills", "landfill", "landfills");
    },

    entities() {
      renderRanking("entities", "entity", "entities");
    },

    heatmap() {
      const host = chartEl("heatmap");
      const list = view.current;
      if (!list.length) return Charts.heatmap(host, { rows: [], cols: [], values: [] });

      const values = WEEK.map(() => HOURS.map(() => 0));
      list.forEach((p) => {
        values[WEEK_JS.indexOf(p.submittedAt.getDay())][p.submittedAt.getHours()]++;
      });

      const columnWidth = (host.clientWidth - 60) / HOURS.length;
      const colEvery = [1, 2, 3, 4, 6].find((step) => columnWidth * step >= 30) || 6;

      Charts.heatmap(host, {
        rows: WEEK,
        cols: HOURS.map((h) => hour12(h, "")),
        values,
        colEvery,
        colTip: (j) => `الساعة ${hour12(HOURS[j])}`
      });
    }
  };

  function renderCharts() {
    config().cards.forEach((card) => RENDER[card.id]());
  }

  function renderAll() {
    renderKPIs();
    renderCharts();
  }

  function update() {
    compute();
    syncControls();
    writeHash();
    renderAll();
    if (openFilter) {
      const host = openFilter;
      closeFilter();
      openFilterPopup(host);
    }
  }

  function isValidDate(value, from, to) {
    if (!value) return true;
    return value <= isoDay(new Date()) && !(from && to && from > to);
  }

  function bindDateInput(edge) {
    const input = $(`[data-date-${edge}]`);
    input.addEventListener("change", () => {
      const from = edge === "from" ? input.value : $("[data-date-from]").value;
      const to = edge === "to" ? input.value : $("[data-date-to]").value;
      if (!isValidDate(input.value, from, to)) {
        input.value = state[edge] || isoDay(view.range[edge]);
        return;
      }
      state[edge] = input.value || null;
      refresh();
    });
  }

  function watchGridWidth() {
    let lastWidth = 0;
    let timer;
    new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (Math.abs(width - lastWidth) < 8) return;
      lastWidth = width;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (permits.length) renderCharts();
      }, 120);
    }).observe($("[data-grid]"));
  }

  function bindControls() {
    $("[data-range]").addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (!button) return;
      state.range = button.dataset.rangeVal;
      if (state.range !== "custom") state.from = state.to = null;
      refresh();
    });

    bindDateInput("from");
    bindDateInput("to");

    $("[data-reset]").addEventListener("click", () => {
      const { trendSplit } = state;
      state = { ...defaultState(), trendSplit };
      refresh();
    });

    $("[data-grid]").addEventListener("click", (e) => {
      const button = e.target.closest('[data-ctl="trendSplit"] button');
      if (!button) return;
      state.trendSplit = button.dataset.val;
      setPressed(button.parentNode, state.trendSplit);
      RENDER.trend();
    });

    document.addEventListener("click", closeFilter);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeFilter();
    });

    $("[data-tabs]").addEventListener("click", (e) => {
      const tab = e.target.closest("[data-type]");
      if (tab) switchType(tab.dataset.type);
    });

    $("[data-retry]").addEventListener("click", load);
    watchGridWidth();
  }

  function syncTabs() {
    $$("[data-type]").forEach((tab) => {
      const selected = tab.dataset.type === type;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) {
        const bar = tab.parentElement;
        bar.scrollLeft += tab.getBoundingClientRect().left - bar.getBoundingClientRect().left - 14;
      }
    });
    $("#main").setAttribute("aria-labelledby", `tab-${type}`);
  }

  function renderSkeleton() {
    buildFilters();
    buildGrid();
    syncRange();
    syncTabs();
    renderKpiSkeleton();
  }

  function switchType(next) {
    if (next === type || !TYPES[next]) return;
    closeFilter();
    const { range, from, to } = state;
    type = next;
    state = { ...defaultState(), range, from, to };
    permits = [];
    renderSkeleton();
    writeHash();
    load();
  }

  function setPermits(list) {
    permits = list.filter((p) => p.submittedAt && p.type === type);
  }

  function periodDays() {
    const now = new Date();
    if (state.range === "7" || state.range === "30" || state.range === "90") return Number(state.range);
    if (state.range === "ytd") return Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / DAY);
    if (state.range === "custom" && state.from) return Math.ceil((now - new Date(`${state.from}T00:00:00`)) / DAY);
    if (state.range === "custom") return Number(DEFAULT_RANGE);
    return ALL_PERIOD;
  }

  let loadedPeriod = null;
  let loadId = 0;

  function load() {
    const id = ++loadId;
    const period = periodDays();
    const loading = $("[data-loading]");
    loading.classList.remove("is-done");

    return Api.getPermits(type, period)
      .then((list) => {
        if (id !== loadId) return;
        loadedPeriod = period;
        setPermits(list);
        $("[data-error]").hidden = true;
        update();
      })
      .catch((err) => {
        if (id !== loadId) return;
        console.error(err);
        $("[data-error-text]").textContent = err?.message || "";
        $("[data-error]").hidden = false;
      })
      .finally(() => {
        if (id === loadId) loading.classList.add("is-done");
      });
  }

  function refresh() {
    if (periodDays() === loadedPeriod) {
      update();
      return;
    }
    syncRange();
    writeHash();
    load();
  }

  function init() {
    readHash();
    renderSkeleton();
    bindControls();
    load();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
