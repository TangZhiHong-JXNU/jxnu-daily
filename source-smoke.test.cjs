'use strict';
// SPDX-License-Identifier: AGPL-3.0-or-later
// 独立新写的公开副本定向测试，不读取原项目、真实浏览器档案或环境凭据。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const {createSiteServer,PUBLIC_FILES} = require('./campus-map/site-server.cjs');
const {sourceFiles,buildArchive} = require('./campus-map/package-source.cjs');
const {checkSource} = require('./check.cjs');
const sha256 = body => crypto.createHash('sha256').update(body).digest('hex');
async function withServer(run) {
  let upstreamCalls = 0;
  const server = createSiteServer({root:__dirname,key:'',sk:'',publicOrigin:undefined,fetchImpl:async()=>{upstreamCalls++;throw new Error('No external requests in source tests');}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base = 'http://127.0.0.1:'+server.address().port;
  try {await run(base);assert.equal(upstreamCalls,0,'空配置不得请求外部地图');}
  finally {server.closeIdleConnections();await new Promise(resolve=>server.close(resolve));}
}
test('公开白名单、语法、空白种子、云停用与来源文件通过静态检查',()=>{
  const result = checkSource();assert.equal(result.ok,true);assert.equal(result.blankSeed,true);assert.equal(result.cloudDisabled,true);
});
test('六时段与课程日期规则可在隔离内存加载',()=>{
  const context = {window:{}};
  for (const name of ['data.js','schedule-rules.js','campus-map/places.js','campus-map/vendor/studev/orientation-ball.js']) vm.runInNewContext(fs.readFileSync(path.join(__dirname,name),'utf8'),context,{timeout:1000});
  const config = context.window.CAMPUS_DATA.campus.config;
  assert.equal(config.periods.length,6);
  assert.equal(context.window.CampusPlaces.places.length,5);
  assert.equal(typeof context.window.CampusOrientationBall.orientationBall,'function');
  const rules = context.window.CampusScheduleRules;
  assert.equal(typeof rules.resolve,'function');
  assert.equal(rules.resolve({classes:[],termStart:config.schoolCalendar.termStart,rules:rules.empty()},'2026-11-26').length,0);
});
test('云停用不会读取 SDK、注册登录监听或读取桥接数据',async()=>{
  let listeners = 0,painted = '';
  const window = {};
  Object.defineProperty(window,'WorkBuddyCloud',{get(){throw new Error('Disabled cloud accessed SDK');}});
  const document = {addEventListener(){listeners++;},getElementById(){return {set innerHTML(value){painted=value;}};}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'cloud-sync.js'),'utf8'),{window,document},{timeout:1000});
  const cloud = window.CampusCloudSync.attach(new Proxy({},{get(){throw new Error('Disabled cloud read bridge');}}));
  await cloud.ready;cloud.paint();assert.equal(listeners,0);assert.match(painted,/未启用云同步/);assert.equal(cloud.enabled,false);
});
test('服务提供每个实际前端白名单资源与 HTML 运行时配置',async()=>{
  await withServer(async base=>{
    for (const name of PUBLIC_FILES) {
      const response = await fetch(base+'/'+name);assert.equal(response.status,200,name);
      const body = await response.arrayBuffer();assert.ok(body.byteLength>0,name);
    }
    const runtime = await (await fetch(base+'/_campus/map-config.js')).text();
    assert.match(runtime,/configured:false/);
    const html = await (await fetch(base+'/')).text();assert.match(html,/_campus\/map-config\.js/);
    const nested = await fetch(base+'/campus-map/');assert.equal(nested.status,200);
  });
});
test('私有路径、测试脚本与服务源码不作为静态文件开放',async()=>{
  await withServer(async base=>{
    for (const name of ['.env','data.json','server.cjs','check.cjs','source-smoke.test.cjs','package.json','.workbuddy/memory/secret.md','campus-map/proxy.cjs','campus-map/package-source.cjs','showcase/']) assert.equal((await fetch(base+'/'+name)).status,404,name);
    assert.equal((await fetch(base+'/%2e%2e%2fdata.js')).status,400);
    assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
    const head = await fetch(base+'/data.js',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  });
});
test('无地图配置只返回未配置状态，不连接任何上游',async()=>{
  await withServer(async base=>{
    const health = await (await fetch(base+'/_TMapService/health')).json();
    assert.deepEqual(health,{configured:false,mode:'project-proxy',walking:false});
    const route = await fetch(base+'/_TMapService/service/direction/v1/walking?from=28.679229,116.029736&to=28.676099,116.028059');
    assert.equal(route.status,503);assert.equal((await route.json()).code,'MAP_NOT_CONFIGURED');
    const cross = await fetch(base+'/_TMapService/health',{headers:{Origin:'https://example.invalid'}});assert.equal(cross.status,403);
  });
});
test('新生成的对应源码 ZIP 仅含白名单，内容与 SHA256 清单一致',()=>{
  const archive = buildArchive(),end = archive.length-22;
  assert.equal(archive.readUInt32LE(end),0x06054b50);
  let cursor = archive.readUInt32LE(end+16);
  const size = archive.readUInt16LE(end+10),files = new Map();
  for (let i=0;i<size;i++) {
    assert.equal(archive.readUInt32LE(cursor),0x02014b50);
    const nameLength = archive.readUInt16LE(cursor+28),name = archive.subarray(cursor+46,cursor+46+nameLength).toString('utf8');
    const offset = archive.readUInt32LE(cursor+42),start = offset+30+archive.readUInt16LE(offset+26)+archive.readUInt16LE(offset+28);
    const body = zlib.inflateRawSync(archive.subarray(start,start+archive.readUInt32LE(cursor+20)));
    assert.ok(!files.has(name));files.set(name,body);
    cursor += 46+nameLength+archive.readUInt16LE(cursor+30)+archive.readUInt16LE(cursor+32);
  }
  assert.equal(cursor,end);assert.equal(size,sourceFiles.length+1);
  assert.deepEqual([...files.keys()].sort(),[...sourceFiles,'SOURCE-MANIFEST.json'].sort());
  const manifest = JSON.parse(files.get('SOURCE-MANIFEST.json'));
  assert.equal(manifest.files.length,sourceFiles.length);
  for (const item of manifest.files) assert.equal(sha256(files.get(item.name)),item.sha256,item.name);
  assert.ok(![...files.keys()].some(name=>name.endsWith('.zip')||name==='data.json'||name.includes('showcase/')));
});
test('本地源码下载实际响应为当前白名单 ZIP',async()=>{
  await withServer(async base=>{
    const response = await fetch(base+'/campus-map/campus-map-source.zip');
    assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/zip');
    const archive = Buffer.from(await response.arrayBuffer());assert.equal(archive.readUInt32LE(0),0x04034b50);
    assert.equal(sha256(archive),sha256(buildArchive()));
  });
});
