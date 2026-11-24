// @ts-check
import { WeatherType } from '../mineclaude-sdk.js';

const COLS = 48, CURTAINS = 3;
const isNight = (frac) => frac >= 0.53 && frac < 0.97;

/** An aurora: glowing curtains of green and violet that wave over the northern horizon, only at night. */
export default class Aurora extends WeatherType {
  name = 'Aurora';
  command = 'aurora';
  chance = 0.12;
  minMs = 3 * 60_000;
  maxMs = 7 * 60_000;
  cooldown = 1;
  order = 50;
  refusal = 'A aurora só aparece de noite.';
  already = 'A aurora já está no céu.';
  /** @type {any} */ group = null;
  /** @type {any[]} */ curtains = [];
  #level = 0;

  // ---- server ----
  canStart(e) { return isNight(e.frac); }
  duration(e) {
    if (!isNight(e.frac)) return 0;
    return Math.round(Math.min(this.minMs + (this.maxMs - this.minMs) * e.rng(), (0.97 - e.frac) * e.dayMs));
  }
  shouldEnd(e) { return !isNight(e.frac); }
  onStart(e) { if (!e.forced) e.server.broadcast('✨ Uma aurora apareceu no céu do norte.'); }
  status(e) { return `aurora (mais ${Math.ceil(e.left / 60_000)} min)`; }

  // ---- browser: three ribbons of vertex-coloured triangles, waved every frame, drawn additively ----
  build({ THREE, scene }) {
    this.group = new THREE.Group();
    for (let c = 0; c < CURTAINS; c++) {
      const geometry = new THREE.BufferGeometry(), pos = new Float32Array(COLS * 2 * 3), col = new Float32Array(COLS * 2 * 3), index = [];
      for (let i = 0; i < COLS - 1; i++) { const a = i * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geometry.setIndex(index);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
      mesh.frustumCulled = false;
      this.curtains.push(mesh); this.group.add(mesh);
    }
    this.group.visible = false;
    scene.add(this.group);
  }

  tick(f) {
    this.#level = Math.max(0, Math.min(1, this.#level + (f.active ? f.dt / 8 : -f.dt / 8))); // 8 s to appear
    this.group.visible = f.enabled && this.#level > 0.01;
    if (!this.group.visible) return this.#level;
    const t = f.now / 1000;
    this.group.position.set(f.eye.x, f.eye.y, f.eye.z);
    this.curtains.forEach((mesh, c) => {
      const pos = mesh.geometry.attributes.position.array, col = mesh.geometry.attributes.color.array;
      const depth = 150 + c * 25, height = 45 + c * 10, base = 55 + c * 8;
      for (let i = 0; i < COLS; i++) {
        const u = i / (COLS - 1), x = (u - 0.5) * 260;
        const sway = Math.sin(u * 6 + t * 0.35 + c * 2) * 14 + Math.sin(u * 13 - t * 0.6) * 5;
        const top = height * (0.55 + 0.45 * Math.sin(u * 9 + t * 0.5 + c)); // each column waves in height
        const fade = Math.sin(Math.PI * u); // the ends dissolve
        const k = i * 2;
        pos[k * 3] = x; pos[k * 3 + 1] = base; pos[k * 3 + 2] = -depth + sway;
        pos[(k + 1) * 3] = x; pos[(k + 1) * 3 + 1] = base + top; pos[(k + 1) * 3 + 2] = -depth + sway;
        const shift = 0.5 + 0.5 * Math.sin(u * 4 + t * 0.2 + c); // green -> violet along the curtain
        // bottom edge bright green, top edge fades to violet and out
        col[k * 3] = 0.15 * fade; col[k * 3 + 1] = 0.95 * fade * (1 - shift * 0.4); col[k * 3 + 2] = 0.45 * fade;
        col[(k + 1) * 3] = 0.55 * shift * fade * 0.5; col[(k + 1) * 3 + 1] = 0.1 * fade; col[(k + 1) * 3 + 2] = 0.7 * shift * fade * 0.5;
      }
      mesh.geometry.attributes.position.needsUpdate = true;
      mesh.geometry.attributes.color.needsUpdate = true;
      mesh.material.opacity = this.#level * (0.55 - c * 0.12);
    });
    return this.#level;
  }

  modifySky(s, level) { s.color.lerp(s.color.clone().setRGB(0.02, 0.08, 0.1), 0.25 * level * Math.max(0, 1 - s.daylight)); }

  reset() { this.#level = 0; if (this.group) this.group.visible = false; }
}
