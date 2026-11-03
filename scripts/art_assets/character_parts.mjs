export function partFor(sourceMesh, a, b, c) {
  const cx =
    (sourceMesh.positions[a * 3] + sourceMesh.positions[b * 3] + sourceMesh.positions[c * 3]) / 3;
  const cy =
    (sourceMesh.positions[a * 3 + 1] +
      sourceMesh.positions[b * 3 + 1] +
      sourceMesh.positions[c * 3 + 1]) /
    3;
  const bodyCenter = -0.005;
  const lateral = Math.abs(cx - bodyCenter);
  // The source is a watertight static scan rather than a rigged character.
  // These broad anatomical bands keep shoulders and hips on the same nodes as
  // the former authored rig while retaining the supplied silhouette.
  if (cy < -0.2) return cx < bodyCenter ? 'right_leg' : 'left_leg';
  if (lateral > 0.105 && cy < 0.42) return cx < bodyCenter ? 'right_arm' : 'left_arm';
  if (cy > 0.42) return 'head';
  return 'torso';
}

export function anchorsFor(part, monk) {
  if (part === 'head') return [0, monk ? 1.52 : 1.57, 0];
  if (part === 'left_arm') return [0.215, 1.32, 0];
  if (part === 'right_arm') return [-0.215, 1.32, 0];
  if (part === 'left_leg') return [0.095, 0.82, 0];
  if (part === 'right_leg') return [-0.095, 0.82, 0];
  return [0, 0, 0];
}

export function partCandidates(sourceMesh, a, b, c) {
  const primary = partFor(sourceMesh, a, b, c);
  const points = [a, b, c].map((index) => [
    sourceMesh.positions[index * 3],
    sourceMesh.positions[index * 3 + 1],
  ]);
  const cx = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const cy = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  const bodyCenter = -0.005;
  const candidates = [primary];
  const add = (part) => {
    if (!candidates.includes(part)) candidates.push(part);
  };

  // Copy a small band across the shoulder cut. The static source is watertight
  // but the runtime rotates each side as one rigid shell, so both neighbours
  // need a little surface around the pivot to hide the separation.
  const lateral = Math.abs(cx - bodyCenter);
  if (cy < 0.5 && cy > 0.34 && lateral > 0.025 && lateral < 0.19) {
    const side = cx < bodyCenter ? 'right' : 'left';
    if (Math.abs(lateral - 0.105) < 0.08) add(side + '_arm');
  }

  // The same overlap keeps the neck and upper-leg cuts closed when a torso
  // turns or a seated/kneeling pose changes the leg parent height.
  if (Math.abs(cy - 0.42) < 0.08 && (primary === 'head' || primary === 'torso'))
    add(primary === 'head' ? 'torso' : 'head');
  if (Math.abs(cy + 0.2) < 0.08 && (primary === 'torso' || primary.endsWith('_leg'))) {
    if (primary === 'torso') add(cx < bodyCenter ? 'right_leg' : 'left_leg');
    else add('torso');
  }
  return candidates;
}
