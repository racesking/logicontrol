import { AIR } from './plant.js';

// Trend history is invented and deterministic. Temperatures and airflow use different
// units, so they get separate charts rather than a second axis.
// Palette validated for colour-blind separation on the panel's white surface.
const SERIES = [
  { id: 'supply', name: 'Aer introdus', color: '#0A7BB0' },
  { id: 'rooms', name: 'Medie camere', color: '#C8600B' },
  { id: 'outdoor', name: 'Exterior', color: '#7A55C7' },
];
const FLOW = { id: 'flow', name: 'Debit CTA 1', color: '#0A7BB0' };

const RANGES = {
  '6h': { label: '6 ore', hours: 6, step: 1 / 12 },
  '24h': { label: '24 ore', hours: 24, step: 0.25 },
  '7z': { label: '7 zile', hours: 168, step: 1 },
};

const NOW_HOUR = 15 + 2 / 60;

function sample(hoursAgo, live) {
  const h = NOW_HOUR - hoursAgo;
  const day = ((h % 24) + 24) % 24;
  const occupied = day >= 6 && day < 20;
  const swing = Math.sin(((day - 9) / 24) * Math.PI * 2);
  const blend = Math.max(0, 1 - hoursAgo / 1.5); // the newest samples meet the live values
  const mix = (a, b) => a + (b - a) * blend;
  return {
    outdoor: mix(AIR.outdoor - 3.1 + swing * 3.4 + Math.sin((hoursAgo / 24) * 1.7) * 1.6, live.outdoor),
    rooms: mix((occupied ? 21.4 : 20.2) + swing * 0.3, live.rooms),
    supply: mix(occupied ? 21 : 18.5, live.supply),
    flow: mix(occupied ? 3200 : 1400, live.flow),
  };
}

function history(range, live) {
  const { hours, step } = RANGES[range];
  const rows = [];
  for (let a = hours; a >= -0.0001; a -= step) rows.push({ ago: Math.max(0, a), ...sample(Math.max(0, a), live) });
  return rows;
}

const clock = (ago) => {
  const minutes = (Math.round((NOW_HOUR - ago) * 60) + 1440 * 8) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};
const when = (ago, range) => (range === '7z' ? `acum ${Math.round(ago / 24)} z, ${clock(ago)}` : clock(ago));

/** Round axis stops: 1, 2 or 5 times a power of ten. */
function niceTicks(values, pad, count = 4) {
  const lo = Math.min(...values) - pad;
  const hi = Math.max(...values) + pad;
  const raw = (hi - lo) / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((v) => v >= raw);
  const start = Math.floor(lo / step) * step;
  const ticks = [];
  for (let v = start; v < hi + step * 0.999; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

export class TrendsView {
  constructor(root, getLive) {
    this.root = root;
    this.getLive = getLive;
    this.range = '24h';
    this.hidden = new Set();
    root.innerHTML = `
      <div class="tr-filters">
        <div class="tr-seg" role="group" aria-label="Interval">
          ${Object.entries(RANGES).map(([k, r]) => `<button type="button" data-range="${k}" aria-pressed="${k === this.range}">${r.label}</button>`).join('')}
        </div>
        <div class="tr-legend" role="group" aria-label="Serii">
          ${SERIES.map((s) => `<button type="button" data-series="${s.id}" aria-pressed="true"><i style="background:${s.color}"></i>${s.name}</button>`).join('')}
        </div>
      </div>
      <figure class="tr-chart"><figcaption>Temperaturi, °C</figcaption><div class="tr-plot" data-plot="temp"></div></figure>
      <figure class="tr-chart tr-chart--small"><figcaption>Debit CTA 1, m³/h</figcaption><div class="tr-plot" data-plot="flow"></div></figure>
      <div class="tr-tip" hidden></div>
      <details class="tr-table"><summary>Vezi valorile în tabel</summary><div></div></details>`;
    root.addEventListener('click', (e) => {
      const r = e.target.closest('[data-range]');
      if (r) { this.range = r.dataset.range; this.draw(); }
      const s = e.target.closest('[data-series]');
      if (s) {
        const id = s.dataset.series;
        if (this.hidden.has(id)) this.hidden.delete(id);
        else if (this.hidden.size < SERIES.length - 1) this.hidden.add(id);
        this.draw();
      }
    });
    this.tip = root.querySelector('.tr-tip');
    root.addEventListener('pointermove', (e) => this.hover(e));
    root.addEventListener('pointerleave', () => this.hover(null));
    new ResizeObserver(() => this.draw()).observe(root);
  }

  plot(el, series, unitDigits, pad) {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return null;
    const m = { l: 40, r: 104, t: 8, b: 22 };
    const iw = w - m.l - m.r;
    const ih = h - m.t - m.b;
    const rows = this.rows;
    const shown = series.filter((s) => !this.hidden.has(s.id));
    const stops = niceTicks(shown.flatMap((s) => rows.map((r) => r[s.id])), pad);
    const lo = stops[0];
    const hi = stops[stops.length - 1];
    const hours = RANGES[this.range].hours;
    const x = (ago) => m.l + iw * (1 - ago / hours);
    const y = (v) => m.t + ih * (1 - (v - lo) / (hi - lo));

    let grid = '';
    for (const v of stops) {
      grid += `<line x1="${m.l}" x2="${m.l + iw}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text x="${m.l - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`;
    }
    const ticks = this.range === '7z' ? [168, 120, 72, 24, 0] : this.range === '24h' ? [24, 18, 12, 6, 0] : [6, 4, 2, 0];
    ticks.forEach((a) => {
      const label = this.range === '7z' ? (a ? `-${a / 24} z` : 'azi') : clock(a);
      grid += `<text x="${x(a).toFixed(1)}" y="${h - 6}" text-anchor="middle">${label}</text>`;
    });

    // End labels stack in value order, so two close lines keep their labels side by side.
    const last = rows[rows.length - 1];
    const labelY = new Map();
    let previous = -99;
    [...shown].sort((a, b) => last[b.id] - last[a.id]).forEach((s) => {
      previous = Math.max(y(last[s.id]), previous + 14);
      labelY.set(s.id, previous);
    });
    const paths = shown.map((s) => {
      const d = rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.ago).toFixed(1)} ${y(r[s.id]).toFixed(1)}`).join('');
      const ly = labelY.get(s.id);
      return `<path d="${d}" stroke="${s.color}" class="tr-line"/>
        <circle cx="${x(0).toFixed(1)}" cy="${y(last[s.id]).toFixed(1)}" r="4" fill="${s.color}" class="tr-end"/>
        <text x="${(x(0) + 9).toFixed(1)}" y="${(ly + 4).toFixed(1)}" class="tr-label">${s.name.split(' ')[0]} ${last[s.id].toFixed(unitDigits)}</text>`;
    }).join('');

    el.innerHTML = `<svg width="${w}" height="${h}" role="img" aria-label="${series.map((s) => s.name).join(', ')}"><g class="tr-grid">${grid}</g>${paths}<line class="tr-cross" y1="${m.t}" y2="${m.t + ih}" hidden/></svg>`;
    return { x, m, iw, hours };
  }

  draw() {
    if (!this.root.clientWidth) return;
    const live = this.getLive();
    this.rows = history(this.range, live);
    this.root.querySelectorAll('[data-range]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.range === this.range)));
    this.root.querySelectorAll('[data-series]').forEach((b) => b.setAttribute('aria-pressed', String(!this.hidden.has(b.dataset.series))));
    this.geo = this.plot(this.root.querySelector('[data-plot="temp"]'), SERIES, 1, 0.6);
    this.plot(this.root.querySelector('[data-plot="flow"]'), [FLOW], 0, 200);

    // Table view: the same numbers, about a dozen rows.
    const every = Math.max(1, Math.floor(this.rows.length / 12));
    const list = this.rows.filter((_, i) => i % every === 0).reverse();
    this.root.querySelector('.tr-table div').innerHTML = `<table><thead><tr><th scope="col">Moment</th>${SERIES.map((s) => `<th scope="col">${s.name}</th>`).join('')}<th scope="col">Debit</th></tr></thead><tbody>${list.map((r) => `<tr><th scope="row">${when(r.ago, this.range)}</th>${SERIES.map((s) => `<td>${r[s.id].toFixed(1)}°</td>`).join('')}<td>${Math.round(r.flow)}</td></tr>`).join('')}</tbody></table>`;
  }

  hover(e) {
    const crosses = this.root.querySelectorAll('.tr-cross');
    const plot = e && e.target.closest?.('.tr-plot');
    if (!plot || !this.geo) {
      this.tip.hidden = true;
      crosses.forEach((c) => c.setAttribute('hidden', ''));
      return;
    }
    const box = plot.getBoundingClientRect();
    const px = e.clientX - box.left;
    const { m, iw, hours } = this.geo;
    const ago = Math.max(0, Math.min(hours, (1 - (px - m.l) / iw) * hours));
    const row = this.rows.reduce((b, r) => (Math.abs(r.ago - ago) < Math.abs(b.ago - ago) ? r : b));
    const x = m.l + iw * (1 - row.ago / hours);
    crosses.forEach((c) => {
      c.removeAttribute('hidden');
      c.setAttribute('x1', x);
      c.setAttribute('x2', x);
    });
    this.tip.hidden = false;
    this.tip.innerHTML = `<b>${when(row.ago, this.range)}</b>${SERIES.filter((s) => !this.hidden.has(s.id)).map((s) => `<span><i style="background:${s.color}"></i>${s.name}<em>${row[s.id].toFixed(1)}°</em></span>`).join('')}<span><i style="background:${FLOW.color}"></i>Debit<em>${Math.round(row.flow)} m³/h</em></span>`;
    const host = this.root.getBoundingClientRect();
    const left = box.left - host.left + x;
    this.tip.style.left = `${left > host.width * 0.6 ? left - 190 : left + 14}px`;
    this.tip.style.top = `${box.top - host.top + 6}px`;
  }
}
