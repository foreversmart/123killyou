const STRIDE = 16;

export function component(attribute, vertex, axis) {
  const array = attribute.data?.array || attribute.array;
  const stride = attribute.data?.stride || attribute.itemSize;
  return array[vertex * stride + (attribute.offset || 0) + axis];
}

/** Preserve source vertices and topology, changing only the attribute packing. */
export function packPlant(geometry, family, stemHeight) {
  const attributes = geometry.attributes;
  for (const name of ['position', 'normal', 'uv', 'aVeg', 'aMat']) {
    if (!attributes[name]) throw new Error(`Tidewater geometry is missing ${name}.`);
  }
  const count = attributes.position.count;
  const vertices = new Float32Array(count * STRIDE);
  const patternBase = family === 'canopy' ? 100 : 120;
  for (let vertex = 0; vertex < count; vertex++) {
    const read = (name, axis) => component(attributes[name], vertex, axis);
    // VegNodes.vegPlantDeform's static, upright pose: stem vertices use their
    // height fraction and all crown coordinates start at the stem tip. Wind
    // remains a runtime deformation; the root never moves during this bake.
    const isPlant = family === 'plant';
    const y = isPlant
      ? read('aMat', 0) < 0.5
        ? read('aVeg', 0) * stemHeight
        : read('position', 1) + stemHeight
      : read('position', 1);
    vertices.set(
      [
        read('position', 0),
        y,
        read('position', 2),
        read('normal', 0),
        read('normal', 1),
        read('normal', 2),
        read('aMat', 1),
        read('aMat', 2),
        read('aMat', 3),
        read('aVeg', 0),
        read('aVeg', 1),
        patternBase + read('aMat', 0),
        read('aVeg', 2),
        read('uv', 0),
        read('uv', 1),
        -2 - read('aVeg', 3),
      ],
      vertex * STRIDE,
    );
  }
  const indices = Uint32Array.from(geometry.index.array);
  if (vertices.some((value) => !Number.isFinite(value)))
    throw new Error('Tidewater geometry contains non-finite vertex attributes.');
  if (indices.length % 3 || indices.some((index) => index >= count))
    throw new Error('Tidewater geometry contains invalid triangle indices.');
  return { vertices, indices };
}

export function createPlantLibrary(records) {
  const manifest = {
    binary: 'vegetation.bin',
    encoding: {
      byteOrder: 'little_endian',
      vertexType: 'float32',
      vertexStride: STRIDE,
      indexType: 'uint32',
      offsetUnit: 'byte',
      vertexCountUnit: 'float32_element',
      indexCountUnit: 'uint32_element',
      attributes: {
        position: [0, 3],
        normal: [3, 3],
        sourceMatYzw: [6, 3],
        sourceVegX: [9, 1],
        sourceVegY: [10, 1],
        pattern: [11, 1],
        sourceVegZ: [12, 1],
        uv: [13, 2],
        encodedPhase: [15, 1],
      },
      pattern: 'canopy: 100 + aMat.x; other plants: 120 + aMat.x; grass: 140',
      encodedPhase: '-2 - aVeg.w',
      canopyVariants: 'Source lobe scales and tree forms have already been applied on the CPU.',
      plantPositions:
        'Source static upright pose baked on CPU: stem y=aVeg.x*nominalHeight; crown y+=nominalHeight.',
      grassAttributes:
        'metadata=[rootX,rootZ,aBlade.z]; material=[aBlade.x,aBlade.w,140,1]; uv=[aSide.w,aBlade.x]; phase=-2-aSlot.z',
      grassPositions:
        'aSlot.xy + position.xz*1.35 + aSide.xz*1.5; position.y unchanged; one 8m source cell, kind 0 only.',
    },
    meshes: {},
  };
  const chunks = [];
  let offset = 0;
  for (const { name, vertices, indices, metadata } of records) {
    if (manifest.meshes[name]) throw new Error(`Duplicate mesh: ${name}`);
    manifest.meshes[name] = {
      vertexOffset: offset,
      vertexCount: vertices.length,
      indexOffset: offset + vertices.byteLength,
      indexCount: indices.length,
      ...metadata,
    };
    chunks.push(Buffer.from(vertices.buffer), Buffer.from(indices.buffer));
    offset += vertices.byteLength + indices.byteLength;
  }
  return { manifest, binary: Buffer.concat(chunks) };
}
