import common from '@/scene/vegetation/foliage_common.wgsl?raw';
import bark from '@/scene/vegetation/palm_bark.wgsl?raw';
import broadleaf from '@/scene/vegetation/broadleaf_material.wgsl?raw';
import plant from '@/scene/vegetation/plant_material.wgsl?raw';
import palette from '@/scene/vegetation/canopy_palette.wgsl?raw';
import canopy from '@/scene/vegetation/canopy_material.wgsl?raw';
import grass from '@/scene/vegetation/grass_material.wgsl?raw';
import entry from '@/scene/vegetation/materials.wgsl?raw';

export const vegetationShader = [
  common,
  bark,
  broadleaf,
  plant,
  palette,
  canopy,
  grass,
  entry,
].join('\n');
