import { Builder, materials as M } from '@/scene/geometry/builder';
import type { Material } from '@/scene/world/types';

type Point = readonly [number, number];
const wood: Material = { ...M.darkWood, color: 0x4b4239, rough: 0.86 };
const bevel: Material = { color: 0x817567, rough: 0.8 };

/** Fine square-section bars, with a rubbed crest to reveal their relief in shade. */
function bar(b: Builder, a: Point, c: Point, thickness: number, detailed: boolean) {
  const dx = c[0] - a[0],
    dy = c[1] - a[1];
  const length = Math.hypot(dx, dy);
  const rotation: [number, number, number] = [0, 0, Math.atan2(dy, dx)];
  const position: [number, number, number] = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 0];
  b.box([length + thickness * 0.4, thickness, 0.048], position, wood, rotation);
  if (detailed)
    b.box(
      [length, thickness * 0.27, 0.006],
      [position[0], position[1] + thickness * 0.2, 0.027],
      bevel,
      rotation,
    );
}

/** Linked stepped lozenges reproduce the reference's narrow, knotted window net. */
export function windowTracery(b: Builder, width: number, height: number, distant = false) {
  const border = Math.min(0.022, width * 0.035);
  const columns = Math.max(2, Math.round(width / (distant ? 0.55 : 0.25)));
  const rows = Math.max(2, Math.round(height / (distant ? 0.6 : 0.38)));
  const cellWidth = (width - border * 2) / columns;
  const cellHeight = (height - border * 2) / rows;
  const thickness = Math.min(0.016, cellWidth * 0.065);
  const points: Point[] = [
    [0.5, 0],
    [0.67, 0.16],
    [0.67, 0.27],
    [0.81, 0.27],
    [0.81, 0.37],
    [1, 0.5],
    [0.81, 0.63],
    [0.81, 0.73],
    [0.67, 0.73],
    [0.67, 0.84],
    [0.5, 1],
    [0.33, 0.84],
    [0.33, 0.73],
    [0.19, 0.73],
    [0.19, 0.63],
    [0, 0.5],
    [0.19, 0.37],
    [0.19, 0.27],
    [0.33, 0.27],
    [0.33, 0.16],
  ];
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const x = -width / 2 + border + column * cellWidth;
      const y = -height / 2 + border + row * cellHeight;
      // At the road/gate distance the tiny hooked returns are subpixel. Keep
      // the same linked lozenge silhouette using its four principal corners.
      const motif = distant ? points.filter((_, i) => i % 5 === 0) : points;
      const outline = motif.map(([u, v]): Point => [x + u * cellWidth, y + v * cellHeight]);
      for (let i = 0; i < outline.length; i++)
        bar(b, outline[i], outline[(i + 1) % outline.length], thickness, !distant);
      // Short straight teeth terminate the pattern cleanly in the surrounding frame.
      if (row === 0)
        bar(b, [x + cellWidth / 2, y], [x + cellWidth / 2, -height / 2], thickness, !distant);
      if (row === rows - 1)
        bar(
          b,
          [x + cellWidth / 2, y + cellHeight],
          [x + cellWidth / 2, height / 2],
          thickness,
          !distant,
        );
      if (column === 0)
        bar(b, [x, y + cellHeight / 2], [-width / 2, y + cellHeight / 2], thickness, !distant);
      if (column === columns - 1)
        bar(
          b,
          [x + cellWidth, y + cellHeight / 2],
          [width / 2, y + cellHeight / 2],
          thickness,
          !distant,
        );
    }
  for (const side of [-1, 1]) {
    b.box([border, height, 0.065], [(side * (width - border)) / 2, 0, 0], wood);
    b.box([width, border, 0.065], [0, (side * (height - border)) / 2, 0], wood);
  }
}
