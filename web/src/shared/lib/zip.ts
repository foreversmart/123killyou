const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;

type ZipEntry = {
  name: string;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

function findEndOfCentralDirectory(view: DataView) {
  // The EOCD record is followed by at most a 64 KiB comment. Search backwards
  // so archives produced by normal zip tools (and archives with comments) work.
  const start = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let offset = view.byteLength - 22; offset >= start; offset--)
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) return offset;
  throw new Error('角色模型压缩包缺少 ZIP 目录。');
}

function entriesFor(data: ArrayBufferLike) {
  const view = new DataView(data);
  const end = findEndOfCentralDirectory(view);
  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  const directoryOffset = view.getUint32(end + 16, true);
  if (directoryOffset + directorySize > view.byteLength)
    throw new Error('角色模型压缩包目录越界。');
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let offset = directoryOffset;
  for (let index = 0; index < count; index++) {
    if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== CENTRAL_FILE_HEADER)
      throw new Error('角色模型压缩包目录损坏。');
    const compression = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd + extraLength + commentLength > view.byteLength)
      throw new Error('角色模型压缩包条目越界。');
    entries.push({
      name: decoder.decode(new Uint8Array(data, nameStart, nameLength)),
      compression,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });
    offset = nameEnd + extraLength + commentLength;
  }
  return { view, entries };
}

async function inflateRaw(bytes: Uint8Array) {
  if (typeof DecompressionStream === 'undefined')
    throw new Error('当前浏览器不支持 ZIP 解压缩。请更新浏览器后重试。');
  const compressed = Uint8Array.from(bytes).buffer as ArrayBuffer;
  const stream = new Blob([compressed])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Extract one file from a ZIP archive. If omitted, the first GLB is used. */
export async function extractZipEntry(data: ArrayBufferLike, requestedName?: string) {
  const { view, entries } = entriesFor(data);
  const entry = requestedName
    ? entries.find((candidate) => candidate.name === requestedName)
    : entries.find((candidate) => candidate.name.toLowerCase().endsWith('.glb'));
  if (!entry)
    throw new Error(
      requestedName ? `角色模型压缩包中缺少 ${requestedName}。` : '角色模型压缩包中缺少 GLB 文件。',
    );
  if (entry.localHeaderOffset + 30 > view.byteLength) throw new Error('角色模型压缩包条目头越界。');
  if (view.getUint32(entry.localHeaderOffset, true) !== LOCAL_FILE_HEADER)
    throw new Error('角色模型压缩包条目头损坏。');
  const nameLength = view.getUint16(entry.localHeaderOffset + 26, true);
  const extraLength = view.getUint16(entry.localHeaderOffset + 28, true);
  const dataStart = entry.localHeaderOffset + 30 + nameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > view.byteLength) throw new Error('角色模型压缩包数据越界。');
  const compressed = new Uint8Array(data, dataStart, entry.compressedSize);
  let result: Uint8Array;
  if (entry.compression === 0) result = new Uint8Array(compressed);
  else if (entry.compression === 8) result = await inflateRaw(compressed);
  else throw new Error(`角色模型压缩包使用不支持的压缩方式：${entry.compression}。`);
  if (result.byteLength !== entry.uncompressedSize)
    throw new Error('角色模型压缩包解压后的长度不匹配。');
  return Uint8Array.from(result).buffer as ArrayBuffer;
}
