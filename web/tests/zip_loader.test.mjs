import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { test } from 'node:test';

const { extractZipEntry } = await import('../src/shared/lib/zip.ts');

function zipSingle(name, text, method = 8) {
  const nameBytes = Buffer.from(name);
  const source = Buffer.from(text);
  const body = method === 8 ? deflateRawSync(source) : source;
  const local = Buffer.alloc(30 + nameBytes.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(method, 8);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(source.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  nameBytes.copy(local, 30);
  const central = Buffer.alloc(46 + nameBytes.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(method, 10);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(source.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  nameBytes.copy(central, 46);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(local.length + body.length, 16);
  return Buffer.concat([local, body, central, end]);
}

function asArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

test('runtime ZIP loader extracts deflated and stored GLBs', async () => {
  for (const method of [0, 8]) {
    const archive = zipSingle('npc_rigged.glb', 'glTF model payload', method);
    const result = await extractZipEntry(asArrayBuffer(archive));
    assert.equal(new TextDecoder().decode(result), 'glTF model payload');
  }
});

test('runtime ZIP loader can select a named member', async () => {
  const archive = zipSingle('characters/linlan.glb', 'linlan payload');
  const result = await extractZipEntry(asArrayBuffer(archive), 'characters/linlan.glb');
  assert.equal(new TextDecoder().decode(result), 'linlan payload');
});
