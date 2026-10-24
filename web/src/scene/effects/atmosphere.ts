import { Filter, GlProgram } from 'pixi.js';

import vertex from './atmosphere.vert.glsl?raw';

import fragment from './atmosphere.frag.glsl?raw';

export function atmosphereFilter() {
  return new Filter({
    glProgram: GlProgram.from({
      vertex,
      fragment,
      name: 'nightwatch-atmosphere',
    }),
    resources: {
      atmosphere: {
        uTime: { value: 0, type: 'f32' },
        uFear: { value: 0, type: 'f32' },
        uGlitch: { value: 0, type: 'f32' },
        uDizzy: { value: 0, type: 'f32' },
      },
    },
  });
}
