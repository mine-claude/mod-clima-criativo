// @ts-check
// Three weathers that the game does not have, made only with the public API (ctx.weather + ctx.effects): petals falling
// by day, a spore haze that thickens the fog and slows whoever breathes it, and a night aurora drawn as glowing curtains.
// Everything is drawn by code. Try: /clima petalas | esporos | aurora | limpo.
import { EffectType, ModInitializer } from './mineclaude-sdk.js';
import Petals from './weather/petals.ts';
import Spores from './weather/spores.ts';
import Aurora from './weather/aurora.ts';

// What the spore haze does to the players inside it: a little slower, and the status bar shows it.
class SporeLung extends EffectType {
  name = 'Esporos nos pulmões';
  color = '#9bd96b';
  beneficial = false;
  every = 2;
  attributes = { speed: 0.85 };
  onRemove(e) { e.player.message('Você volta a respirar normalmente.'); }
}

export default class ClimaCriativo extends ModInitializer {
  /** @param {import('../../packages/cli/types/mineclaude-mod').ModContext} ctx */
  onInitialize(ctx) {
    ctx.effects.register('spore_lung', new SporeLung());
    ctx.weather.register('petals', new Petals());
    ctx.weather.register('spores', new Spores());
    ctx.weather.register('aurora', new Aurora());
  }
}
