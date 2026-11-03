import { MeshoptSimplifier } from 'meshoptimizer';

export async function simplifyCharacterMesh(mesh, targetTriangles = 40000) {
  if (mesh.indices.length <= targetTriangles * 3) return [mesh.indices, 0];
  await MeshoptSimplifier.ready;
  const attributes = new Float32Array((mesh.positions.length / 3) * 5);
  for (let vertex = 0; vertex < mesh.positions.length / 3; vertex++) {
    attributes.set(mesh.normals.subarray(vertex * 3, vertex * 3 + 3), vertex * 5);
    attributes.set(mesh.uv.subarray(vertex * 2, vertex * 2 + 2), vertex * 5 + 3);
  }
  // Preserve UV seams. Permissive collapses can connect unrelated atlas islands,
  // stretching distant texels across faces and clothing as dark jagged patches.
  // The target is a budget goal; reaching it must not override seam preservation.
  return MeshoptSimplifier.simplifyWithAttributes(
    mesh.indices,
    mesh.positions,
    3,
    attributes,
    5,
    [0.01, 0.01, 0.01, 0.025, 0.025],
    null,
    targetTriangles * 3,
    0.005,
  );
}
