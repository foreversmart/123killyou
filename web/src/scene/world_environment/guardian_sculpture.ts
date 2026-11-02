import { Builder } from '@/scene/geometry/builder';
import { node, type V3 } from '@/scene/world/types';
import { guardianBody } from '@/scene/world_environment/guardian_body';
import { guardianFace } from '@/scene/world_environment/guardian_face';
import { guardianAttributes } from '@/scene/world_environment/guardian_attributes';
import { guardianPalette, type GuardianKind } from '@/scene/world_environment/guardian_materials';

/** Meter-scale, solid sculpture: every face, robe and attribute casts a shadow. */
export function heavenlyKing(position: V3, kind: GuardianKind, yaw = 0) {
  const root = node(`heavenly_king_${kind}`);
  root.position = position;
  root.rotation[1] = yaw;
  const palette = guardianPalette(kind);
  const body = new Builder();
  guardianBody(body, palette);
  root.children.push(body.mesh('guardian_lamellar_body'));
  const face = new Builder();
  guardianFace(face, palette);
  root.children.push(face.mesh('guardian_fierce_face_crown'));
  const attributes = new Builder();
  guardianAttributes(attributes, kind, palette);
  root.children.push(attributes.mesh(`guardian_${kind}_hands_attribute`));
  return root;
}
