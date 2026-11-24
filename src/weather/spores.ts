// @ts-check
import { WeatherType } from '../mineclaude-sdk.js';

const COUNT = 300, BOX = 14;

/** A green spore haze: the fog closes in, motes drift upward, and everyone in it gets a status effect (ctx.effects). */
export default class Spores extends WeatherType {
  name = 'Névoa de esporos';
  command = 'esporos';
  chance = 0.08;
  minMs = 90_000;
  maxMs = 4 * 60_000;
  cooldown = 1;
  order = 40;
  already = 'A névoa de esporos já está aí.';
  /** @type {any} */ points = null;
  #level = 0;
  #x = new Float32Array(COUNT); #y = new Float32Array(COUNT); #z = new Float32Array(COUNT); #seed = new Float32Array(COUNT);

  // ---- server: while it lasts, whoever is in the dimension breathes it (the effect is renewed every second) ----
  onStart(e) { e.server.broadcast('🍄 Uma névoa de esporos cobre o mundo.'); }
  onTick(e) { for (const player of e.server.players()) player.addEffect('clima_criativo:spore_lung', 6, 1); }
  onEnd(e) { e.server.broadcast('A névoa de esporos se dissipou.'); }
  status(e) { return `névoa de esporos (mais ${Math.ceil(e.left / 1000)} s)`; }

  // ---- browser ----
  build({ THREE, scene }) {
    const geometry = new THREE.BufferGeometry(), colors = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      this.#x[i] = (Math.random() * 2 - 1) * BOX; this.#z[i] = (Math.random() * 2 - 1) * BOX; this.#y[i] = (Math.random() * 2 - 1) * 8; this.#seed[i] = Math.random();
      const g = 0.6 + Math.random() * 0.4;
      colors.set([0.55 * g, 0.85 * g, 0.35 * g], i * 3);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false }));
    this.points.frustumCulled = false; this.points.visible = false;
    scene.add(this.points);
    this.tint = new THREE.Color('#7a9a52');
  }

  tick(f) {
    this.#level = Math.max(0, Math.min(1, this.#level + (f.active ? f.dt / 5 : -f.dt / 5)));
    f.noise(this.#level * 0.5, { highpass: 60, lowpass: 380, q: 0.5, gain: 0.07 }); // a low, soft hiss
    const p = this.points;
    p.visible = f.enabled && this.#level > 0.02;
    if (!p.visible) return this.#level;
    const pos = p.geometry.attributes.position.array, t = f.now / 1000;
    for (let i = 0; i < COUNT; i++) {
      const s = this.#seed[i];
      this.#y[i] += (0.25 + s * 0.35) * f.dt;
      this.#x[i] += Math.sin(t * 0.5 + s * 30) * 0.5 * f.dt;
      if (this.#y[i] > 8) this.#y[i] -= 16;
      pos[i * 3] = f.eye.x + ((((this.#x[i] + BOX) % (2 * BOX)) + 2 * BOX) % (2 * BOX)) - BOX;
      pos[i * 3 + 1] = f.eye.y + this.#y[i];
      pos[i * 3 + 2] = f.eye.z + ((((this.#z[i] + BOX) % (2 * BOX)) + 2 * BOX) % (2 * BOX)) - BOX;
    }
    p.geometry.attributes.position.needsUpdate = true;
    return this.#level;
  }

  modifySky(s, level) {
    s.color.lerp(this.tint, 0.55 * level);
    s.fog.mul *= 1 - 0.55 * level; // the haze closes the view in
    s.daylight *= 1 - 0.15 * level;
  }

  reset() { this.#level = 0; if (this.points) this.points.visible = false; }
}
