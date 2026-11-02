import fs from 'node:fs';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier,context,next) { if(specifier.startsWith('@/')) return next(new URL('../../web/src/'+specifier.slice(2)+'.ts',import.meta.url).href,context); return next(specifier,context); }});
const {heavenlyKing}=await import('../../web/src/scene/world_environment/guardian_sculpture.ts');
const results=[];
for(const kind of ['pipa','sword','dragon','umbrella']) {
 const root=heavenlyKing([0,0,0],kind); const exportMeshes=[];
 for(const child of root.children) {
  const {vertices:v,indices}=child.geometry; const positions=[],normals=[],uv=[],materials=[],materialIds=[],faces=[];
  const map=new Map(); let inverted=0,degenerate=0,total=0;
  for(let i=0;i<v.length;i+=16) {
   if(!v.slice(i,i+16).every(Number.isFinite))throw new Error(`nonfinite ${kind}:${i}`);
   positions.push([v[i],-v[i+2],v[i+1]]); normals.push([v[i+3],-v[i+5],v[i+4]]); uv.push([v[i+13],1-v[i+14]]);
   const m=Array.from(v.slice(i+6,i+13)); const key=m.join(','); if(!map.has(key)){map.set(key,materials.length);materials.push(m);}materialIds.push(map.get(key));
  }
  for(let i=0;i<indices.length;i+=3){
   const ids=Array.from(indices.slice(i,i+3));faces.push(ids);const [a,b,c]=ids.map(id=>positions[id]); const ab=b.map((v,k)=>v-a[k]),ac=c.map((v,k)=>v-a[k]);const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const len=Math.hypot(...n); if(len<1e-10)degenerate++;else {total++;const dot=n.reduce((sum,v,k)=>sum+v*(normals[ids[0]][k]+normals[ids[1]][k]+normals[ids[2]][k])/3,0)/len; if(dot<-.1)inverted++;}
  }
  console.log({kind,part:child.name,vertices:positions.length,triangles:faces.length,inverted,degenerate,total});
  exportMeshes.push({name:child.name,positions,normals,uv,materials,faceMaterials:faces.map(ids=>materialIds[ids[0]]),faces});
 }
 results.push({kind,meshes:exportMeshes});
}
fs.writeFileSync(new URL('./guardians.json',import.meta.url),JSON.stringify(results));
