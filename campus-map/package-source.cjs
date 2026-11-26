'use strict';
// SPDX-License-Identifier: AGPL-3.0-or-later
// 只读取当前独立副本的精确白名单；不遍历目录、不读取环境凭据或旧归档。
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const root = path.resolve(__dirname,'..');
const sourceFiles = Object.freeze([
  '.gitignore','.gitattributes','README.md','LICENSE.txt','THIRD-PARTY-NOTICES.txt',
  'package.json','server.cjs','check.cjs','source-smoke.test.cjs',
  'index.html','data.js','app.js','cloud-sync.js','styles.css','campus-ui.css',
  'freshman-guide.js','schedule-html.js','schedule-rules.js','ui-icons.js','tabler-icons-LICENSE.txt',
  'brand.js','brand-favicon.svg','learning-info-data.js','learning-info.js','learning-info.css',
  'campus-art/album.webp','campus-art/lake.webp','campus-art/sports.webp','campus-art/sources.json',
  'campus-map/index.html','campus-map/map.js','campus-map/map.css','campus-map/places.js','campus-map/source.html',
  'campus-map/proxy.cjs','campus-map/site-server.cjs','campus-map/package-source.cjs',
  'campus-map/vendor/studev/orientation-ball.js','campus-map/vendor/studev/ball.ts.source.txt',
  'campus-map/vendor/studev/LICENSE.txt','campus-map/vendor/studev/origin.json'
]);
const sha256 = body => crypto.createHash('sha256').update(body).digest('hex');
function readEntries() {
  const realRoot = fs.realpathSync(root);
  return sourceFiles.map(name => {
    const file = path.join(root,name),real = fs.realpathSync(file),relative = path.relative(realRoot,real);
    if (relative === '..' || relative.startsWith('..'+path.sep) || path.isAbsolute(relative) || !fs.statSync(real).isFile() || fs.lstatSync(file).isSymbolicLink()) throw new Error('Invalid source input: '+name);
    return [name,fs.readFileSync(real)];
  });
}
const table = Array.from({length:256},(_,value) => {
  let current = value;
  for (let i=0;i<8;i++) current = current&1 ? 0xedb88320^(current>>>1) : current>>>1;
  return current>>>0;
});
function crc32(body) {
  let crc = 0xffffffff;
  for (const byte of body) crc = table[(crc^byte)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function zip(entries) {
  let offset = 0;
  const local = [],central = [];
  for (const [filename,body] of entries) {
    const name = Buffer.from(filename),data = Buffer.isBuffer(body)?body:Buffer.from(body);
    const packed = zlib.deflateRawSync(data),crc = crc32(data),head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt16LE(0x800,6);head.writeUInt16LE(8,8);head.writeUInt16LE(0x21,12);
    head.writeUInt32LE(crc,14);head.writeUInt32LE(packed.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(name.length,26);
    local.push(head,name,packed);
    const item = Buffer.alloc(46);
    item.writeUInt32LE(0x02014b50);item.writeUInt16LE(0x0314,4);item.writeUInt16LE(20,6);item.writeUInt16LE(0x800,8);item.writeUInt16LE(8,10);item.writeUInt16LE(0x21,14);
    item.writeUInt32LE(crc,16);item.writeUInt32LE(packed.length,20);item.writeUInt32LE(data.length,24);item.writeUInt16LE(name.length,28);item.writeUInt32LE((0o100644<<16)>>>0,38);item.writeUInt32LE(offset,42);
    central.push(item,name);offset += head.length+name.length+packed.length;
  }
  const size = central.reduce((total,body)=>total+body.length,0),end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(size,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,...central,end]);
}
function buildArchive() {
  const entries = readEntries();
  // 若公开种子被改为个人数据或配置不再安全，先拒绝生成归档。
  require('../check.cjs').checkSource();
  const manifest = {version:require('../package.json').version,license:'AGPL-3.0-or-later',files:entries.map(([name,body])=>({name,sha256:sha256(body)}))};
  entries.push(['SOURCE-MANIFEST.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n')]);
  return zip(entries);
}
module.exports = {sourceFiles,readEntries,buildArchive};
if (require.main === module) {
  const output = path.join(__dirname,'campus-map-source.zip');
  const archive = buildArchive();
  fs.writeFileSync(output,archive,{flag:'wx'});
  console.log(JSON.stringify({output:path.relative(root,output),entries:sourceFiles.length+1,bytes:archive.length,sha256:sha256(archive)}));
}
