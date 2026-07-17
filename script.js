// Set this to your published Google Sheet CSV URL once the form is set up.
// e.g. "https://docs.google.com/spreadsheets/d/e/XXXX/pub?output=csv"
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkqZm_kptp-zzWYN8NdvjY4npbvXT_50ORdfzV7rCDLRR6XT1uXvBqfFvfDxS21PPkhqf-dkDOertM/pub?gid=563356068&single=true&output=csv";

// Everyone planted on the same day this year.
const PLANTING_DATE = "2026-05-12";

// Mock data used until CSV_URL is set. Multiple rows per person = multiple
// measurements over the season (what the real sheet will look like).
const MOCK_ROWS = [
  { name: "Priya",  measurementDate: "2026-06-01", height: 16, bloomDiameter: null },
  { name: "Priya",  measurementDate: "2026-06-15", height: 37, bloomDiameter: null },
  { name: "Priya",  measurementDate: "2026-07-01", height: 63, bloomDiameter: 5.5 },
  { name: "Marcus", measurementDate: "2026-06-01", height: 22, bloomDiameter: null },
  { name: "Marcus", measurementDate: "2026-06-15", height: 47, bloomDiameter: null },
  { name: "Marcus", measurementDate: "2026-07-01", height: 83, bloomDiameter: 8.7 },
  { name: "Sasha",  measurementDate: "2026-06-01", height: 12, bloomDiameter: null },
  { name: "Sasha",  measurementDate: "2026-06-15", height: 28, bloomDiameter: null },
  { name: "Sasha",  measurementDate: "2026-07-01", height: 51, bloomDiameter: 3.9 },
];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const keyMap = {
    "name": "name",
    "measurement date": "measurementDate",
    "height (in)": "height",
    "bloom diameter (in)": "bloomDiameter",
  };

  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      const key = keyMap[h] || h;
      let value = cells[i];
      if (key === "name") {
        value = value.trim();
      }
      if (key === "height" || key === "bloomDiameter") {
        value = value === "" || value === undefined ? null : parseFloat(value);
      }
      row[key] = value;
    });
    return row;
  });
}

async function loadData() {
  if (!CSV_URL) return MOCK_ROWS;
  const res = await fetch(CSV_URL);
  const text = await res.text();
  return parseCSV(text);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function nameKey(name) {
  return name.trim().toLowerCase();
}

function latestByPerson(rows) {
  const byName = new Map();
  for (const row of rows) {
    const key = nameKey(row.name);
    const existing = byName.get(key);
    if (!existing || new Date(row.measurementDate) > new Date(existing.measurementDate)) {
      byName.set(key, row);
    }
  }
  return Array.from(byName.values());
}

function groupByPerson(rows) {
  const byName = new Map();
  for (const row of rows) {
    const key = nameKey(row.name);
    if (!byName.has(key)) byName.set(key, { name: row.name, entries: [] });
    byName.get(key).entries.push(row);
  }
  for (const group of byName.values()) {
    group.entries.sort((a, b) => new Date(a.measurementDate) - new Date(b.measurementDate));
  }
  return Array.from(byName.values());
}

// --- SVG sunflower ---

const PX_PER_IN = 5;
const MAX_STEM_PX = 300;
const PETAL_COLOR = "#f4c430";
const PETAL_COLOR_DARK = "#e0a800";
const CENTER_COLOR = "#5c3d1e";
const STEM_COLOR = "#4a7c2f";
const LEAF_COLOR = "#5c9c3a";

const STEM_WIDTH = 8;

function flowerSVG(row) {
  const hasBloom = row.bloomDiameter && row.bloomDiameter > 0;

  const stemHeight = Math.min(row.height * PX_PER_IN, MAX_STEM_PX);
  const stemWidth = STEM_WIDTH;
  const bloomDiameter = hasBloom ? row.bloomDiameter * PX_PER_IN : 20;
  const bloomRadius = Math.max(bloomDiameter / 2, 10);

  const width = 140;
  const height = MAX_STEM_PX + bloomRadius * 2 + 20;
  const stemX = width / 2;
  const stemBottomY = height - 10;
  const stemTopY = stemBottomY - stemHeight;
  const centerY = Math.max(stemTopY, bloomRadius + 10);

  let bloomMarkup;
  if (hasBloom) {
    const petalCount = 16;
    let petals = "";
    for (let i = 0; i < petalCount; i++) {
      const angle = (360 / petalCount) * i;
      const petalLength = bloomRadius * 0.9;
      const petalWidth = bloomRadius * 0.4;
      const color = i % 2 === 0 ? PETAL_COLOR : PETAL_COLOR_DARK;
      petals += `<ellipse cx="${stemX}" cy="${centerY - bloomRadius - petalLength / 2 + 4}" rx="${petalWidth / 2}" ry="${petalLength / 2}" fill="${color}" transform="rotate(${angle} ${stemX} ${centerY})"/>`;
    }
    bloomMarkup = `${petals}<circle cx="${stemX}" cy="${centerY}" r="${bloomRadius * 0.55}" fill="${CENTER_COLOR}"/>`;
  } else {
    // Not bloomed yet — draw a small closed bud instead of petals.
    bloomMarkup = `<ellipse cx="${stemX}" cy="${centerY}" rx="6" ry="9" fill="${LEAF_COLOR}"/>`;
  }

  const leafY1 = stemTopY + stemHeight * 0.5;
  const leafY2 = stemTopY + stemHeight * 0.75;

  return `
<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <line x1="${stemX}" y1="${stemBottomY}" x2="${stemX}" y2="${stemTopY}" stroke="${STEM_COLOR}" stroke-width="${stemWidth}" stroke-linecap="round"/>
  <path d="M ${stemX} ${leafY1} Q ${stemX - 35} ${leafY1 - 10} ${stemX - 5} ${leafY1 - 25}" fill="${LEAF_COLOR}"/>
  <path d="M ${stemX} ${leafY2} Q ${stemX + 35} ${leafY2 - 10} ${stemX + 5} ${leafY2 - 25}" fill="${LEAF_COLOR}"/>
  ${bloomMarkup}
</svg>`;
}

function renderGarden(rows) {
  const garden = document.getElementById("garden");

  if (rows.length === 0) {
    garden.innerHTML = `<p class="empty-state">No measurements yet — submit the form to get your sunflower growing here!</p>`;
    return;
  }

  const latest = latestByPerson(rows).sort((a, b) => b.height - a.height);

  garden.innerHTML = latest.map((row) => `
    <div class="flower-card">
      ${flowerSVG(row)}
      <div class="name">${row.name}</div>
      <div class="stats">
        ${row.height} in tall
        ${row.bloomDiameter ? `&middot; ${row.bloomDiameter} in bloom` : ""}
      </div>
      <div class="last-updated">Last measured ${formatDate(row.measurementDate)}</div>
    </div>
  `).join("");
}

// --- Growth chart ---

function renderChart(rows) {
  const chartEl = document.getElementById("chart");

  if (rows.length === 0) {
    chartEl.innerHTML = `<p class="empty-state">No measurements yet — check back once the season gets going!</p>`;
    return;
  }

  const byPerson = groupByPerson(rows);

  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const dateNums = rows.map((r) => new Date(r.measurementDate).getTime());
  const minDate = Math.min(...dateNums);
  const maxDate = Math.max(...dateNums);
  const maxHeight = Math.max(...rows.map((r) => r.height)) * 1.1;

  const x = (dateStr) => {
    const t = new Date(dateStr).getTime();
    if (maxDate === minDate) return margin.left;
    return margin.left + ((t - minDate) / (maxDate - minDate)) * plotWidth;
  };
  const y = (val) => margin.top + plotHeight - (val / maxHeight) * plotHeight;

  const colors = ["#d9932f", "#5c9c3a", "#8a4fbf", "#c94f4f", "#2f8fd9"];
  let colorIndex = 0;
  let lines = "";
  let legend = "";
  let points = "";

  for (const { name, entries } of byPerson) {
    const color = colors[colorIndex % colors.length];
    colorIndex++;

    const pathData = entries.map((e, i) =>
      `${i === 0 ? "M" : "L"} ${x(e.measurementDate)} ${y(e.height)}`
    ).join(" ");
    lines += `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="2.5"/>`;

    points += entries.map((e) =>
      `<circle cx="${x(e.measurementDate)}" cy="${y(e.height)}" r="4" fill="${color}"/>`
    ).join("");

    legend += `<span style="display:inline-flex;align-items:center;gap:0.4rem;margin-right:1rem;">
      <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;"></span>${name}
    </span>`;
  }

  const yTicks = 5;
  let yAxis = "";
  for (let i = 0; i <= yTicks; i++) {
    const val = (maxHeight / yTicks) * i;
    const yPos = y(val);
    yAxis += `<line x1="${margin.left}" y1="${yPos}" x2="${width - margin.right}" y2="${yPos}" stroke="#eee"/>`;
    yAxis += `<text x="${margin.left - 8}" y="${yPos + 4}" font-size="11" text-anchor="end" fill="#666">${Math.round(val)}</text>`;
  }

  chartEl.innerHTML = `
    <div style="margin-bottom:0.5rem;">${legend}</div>
    <div class="chart-scroll">
      <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
        ${yAxis}
        <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${width - margin.right}" y2="${margin.top + plotHeight}" stroke="#333"/>
        ${lines}
        ${points}
        <text x="${margin.left}" y="${height - 8}" font-size="11" fill="#666">Measurement date &rarr;</text>
        <text x="10" y="${margin.top}" font-size="11" fill="#666" transform="rotate(-90 10 ${margin.top})">Height (in)</text>
      </svg>
    </div>
  `;
}

// --- View toggle ---

function setupToggle() {
  const gardenBtn = document.getElementById("garden-btn");
  const chartBtn = document.getElementById("chart-btn");
  const gardenView = document.getElementById("garden-view");
  const chartView = document.getElementById("chart-view");

  gardenBtn.addEventListener("click", () => {
    gardenBtn.classList.add("active");
    chartBtn.classList.remove("active");
    gardenView.classList.remove("hidden");
    chartView.classList.add("hidden");
  });

  chartBtn.addEventListener("click", () => {
    chartBtn.classList.add("active");
    gardenBtn.classList.remove("active");
    chartView.classList.remove("hidden");
    gardenView.classList.add("hidden");
  });
}

async function init() {
  setupToggle();
  const rows = await loadData();
  renderGarden(rows);
  renderChart(rows);

  document.getElementById("last-updated").textContent =
    `Last updated: ${new Date().toLocaleString()}`;
}

init();
