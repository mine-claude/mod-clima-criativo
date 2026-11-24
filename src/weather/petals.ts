// @ts-check
import { WeatherType } from '../mineclaude-sdk.js';

const COUNT = 500, BOX = 22, TOP = 16, BOTTOM = -6;
const PINKS = [[1, 0.72, 0.82], [0.98, 0.55, 0.72], [1, 0.86, 0.9], [0.93, 0.45, 0.62]];

/** Petals fall slowly and sway; the sky turns a soft pink. By day only, rare. */
export default class Petals extends WeatherType {
  name = 'Chuva de pétalas';
  command = 'petalas';
  chance = 0.1;
  minMs = 2 * 60_000;
  maxMs = 5 * 60_000;
  cooldown = 1;
  order = 30;
  refusal = 'As pétalas só caem de dia.';
  already = 'Já estão caindo pétalas.';
  /** @type {any} */ points = null;
  #level = 0;
  #x = new Float32Array(COUNT); #y = new Float32Array(COUNT); #z = new Float32Array(COUNT); #seed = new Float32Array(COUNT);

  // ---- server ----
  canStart(e) { return e.frac >= 0.02 && e.frac < 0.45; }
  duration(e) { return Math.round(this.minMs + (this.maxMs - this.minMs) * e.rng()); }
  shouldEnd(e) { return e.frac >= 0.47; }
  onStart(e) { e.server.broadcast('🌸 Começou uma chuva de pétalas.'); }
  status(e) { return `chuva de pétalas (mais ${Math.ceil(e.left / 60_000)} min)`; }

  // ---- browser: points with a colour each, drawn by code ----
  build({ THREE, scene }) {
    const geometry = new THREE.BufferGeometry(), colors = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      this.#x[i] = (Math.random() * 2 - 1) * BOX; this.#z[i] = (Math.random() * 2 - 1) * BOX;
      this.#y[i] = BOTTOM + Math.random() * (TOP - BOTTOM); this.#seed[i] = Math.random();
      colors.set(PINKS[i % PINKS.length], i * 3);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
    this.points.frustumCulled = false; this.points.visible = false;
    scene.add(this.points);
    this.tint = new THREE.Color('#f4b8d2');
  }

  tick(f) {
    this.#level = Math.max(0, Math.min(1, this.#level + (f.active ? f.dt / 3 : -f.dt / 3))); // 3 s in, 3 s out
    const p = this.points;
    p.visible = f.enabled && this.#level > 0.02;
    if (!p.visible) return this.#level;
    const pos = p.geometry.attributes.position.array, t = f.now / 1000, ex = f.eye.x, ey = f.eye.y, ez = f.eye.z, span = TOP - BOTTOM;
    const n = Math.round(COUNT * this.#level);
    for (let i = 0; i < n; i++) {
      const s = this.#seed[i];
      this.#y[i] -= (1.1 + s * 0.8) * f.dt;
      this.#x[i] += Math.sin(t * 0.8 + s * 40) * 1.2 * f.dt;
      this.#z[i] += Math.cos(t * 0.6 + s * 30) * 0.9 * f.dt;
      if (this.#y[i] < BOTTOM) this.#y[i] += span;
      pos[i * 3] = ex + ((((this.#x[i] + BOX) % (2 * BOX)) + 2 * BOX) % (2 * BOX)) - BOX;
      pos[i * 3 + 1] = ey + this.#y[i];
      pos[i * 3 + 2] = ez + ((((this.#z[i] + BOX) % (2 * BOX)) + 2 * BOX) % (2 * BOX)) - BOX;
    }
    p.geometry.setDrawRange(0, n);
    p.geometry.attributes.position.needsUpdate = true;
    return this.#level;
  }

  modifySky(s, level) {
    s.color.lerp(this.tint, 0.3 * level);
    s.daylight *= 1 - 0.05 * level;
  }

  reset() { this.#level = 0; if (this.points) this.points.visible = false; }
}
