import { node } from '@/scene/world/types';
import { CrownOccupancy, forestTrees } from '@/scene/world_environment/forest_scatter';

/** Distant slopes retain Tidewater's original crowns, sub-canopy and height variation. */
export function forestCanopy(occupancy = new CrownOccupancy()) {
  const root = node('distant_forest_canopy');
  root.children.push(...forestTrees(true, occupancy));
  return root;
}
