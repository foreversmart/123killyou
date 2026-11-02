import fs from 'node:fs';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const folder=path.dirname(fileURLToPath(import.meta.url));
const project=path.resolve(folder,'../..');
for(const id of ['gate','hall']) {
  const input=path.join(folder,id+'_raw.png');
  if(!fs.existsSync(input))throw new Error('Missing rendered preview: '+input);
  const metadata=await sharp(input).metadata();
  const width=metadata.width;
  const label=`OFFLINE GEOMETRY PREVIEW  /  ${id==='gate'?'TEMPLE GATE':'WORSHIP HALL'}  /  CURRENT RUNTIME MESH + LOCAL MATERIALS`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="62"><rect width="${width}" height="62" fill="#191d1c"/><text x="28" y="25" font-family="sans-serif" font-size="16" font-weight="600" fill="#dfcbaa">${label}</text><text x="28" y="48" font-family="sans-serif" font-size="13" fill="#abaea8">Blender inspection render. Architecture only; game UI, actors and runtime postprocessing are excluded. Not a game screenshot.</text></svg>`;
  const output=path.join(project,'docs/screenshots',`temple_${id}_architecture.png`);
  await sharp(input).extend({bottom:62,background:'#191d1c'}).composite([{input:Buffer.from(svg),left:0,top:metadata.height}]).png().toFile(output);
  console.log(output);
}
