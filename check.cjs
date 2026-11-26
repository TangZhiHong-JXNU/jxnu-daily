'use strict';
// SPDX-License-Identifier: AGPL-3.0-or-later
// 静态检查仅针对随附源码，不遍历父目录，不连接外网、不读取运行环境凭据。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = __dirname;
function checkSource() {
  const {sourceFiles,readEntries} = require('./campus-map/package-source.cjs');
  const entries = readEntries(),files = new Map(entries);
  assert.equal(files.size,sourceFiles.length,'白名单包含重复项');
  let scripts = 0,links = 0;
  const sensitive = [
    /(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}/,
    /AKID[A-Za-z0-9]{16,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /wb(?:pk|cs)_[A-Za-z0-9_]{16,}/,
    /https:\/\/wbapp-[a-z0-9-]+\.app\.workbuddy\.host/,
    /[A-Z]:[\\/]Users[\\/]/i
  ];
  const localLink = (from,value) => {
    if (!value || /^(?:https?:|data:|tel:|mailto:|#|\/\/)/i.test(value) || value.includes('${')) return;
    const target = value.split(/[?#]/)[0];
    if (!target) return;
    let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(from),decodeURIComponent(target)));
    if (resolved === '.' || resolved === './') resolved = 'index.html';
    else if (resolved.endsWith('/')) resolved += 'index.html';
    if (resolved === 'campus-map/campus-map-source.zip') {links++;return;}
    assert.ok(files.has(resolved),'缺少本地资源: '+from+' -> '+resolved);
    links++;
  };
  for (const [name,body] of entries) {
    if (!/\.(?:js|cjs|json|html|css|txt|md|svg)$/.test(name)) continue;
    const text = body.toString('utf8');
    for (const pattern of sensitive) assert.ok(!pattern.test(text),'需人工复核的敏感模式: '+name);
    if (/\.(?:js|cjs)$/.test(name)) {new vm.Script(text,{filename:name});scripts++;}
    if (name.endsWith('.json')) JSON.parse(text);
    if (name.endsWith('.html')) {
      for (const match of text.matchAll(/\b(?:src|href)="([^"]+)"/g)) localLink(name,match[1]);
      for (const match of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (!/\bsrc\s*=/.test(match[1]) && match[2].trim()) {new vm.Script(match[2],{filename:name+':inline'});scripts++;}
      }
    }
    if (name.endsWith('.css')) for (const match of text.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) localLink(name,match[1]);
  }
  const context = {window:{}};
  vm.runInNewContext(files.get('data.js').toString('utf8'),context,{timeout:1000});
  const seed = JSON.parse(JSON.stringify(context.window.CAMPUS_DATA));
  assert.deepEqual(Object.keys(seed).sort(),['campus','rooms','occupancy','classes','tasks','weather','lost_items','market_items','campus_jobs','electricitySnapshot'].sort());
  for (const key of ['rooms','occupancy','classes','tasks','lost_items','market_items','campus_jobs']) assert.deepEqual(seed[key],[],key+' 必须为空');
  assert.equal(seed.electricitySnapshot,null);
  assert.equal(seed.weather.mode,'demo');
  const config = seed.campus.config;
  for (const key of ['storageKey','periodKey','weatherKey']) assert.ok(config[key].startsWith('jxnu-daily.public-source.v1.'),'存储键须与原项目隔离');
  assert.equal(config.periods.length,6);
  assert.deepEqual(config.schoolCalendar.events,[]);
  const cloud = files.get('cloud-sync.js').toString('utf8');
  assert.ok(cloud.includes('const cloudEnabled = false;'),'默认云开关必须关闭');
  assert.ok(cloud.includes("endpoint:'https://example.invalid'"));
  assert.ok(cloud.includes("publishableKey:'YOUR_PUBLISHABLE_KEY'"));
  const html = files.get('index.html').toString('utf8');
  assert.ok(!/workbuddy-cloud-sdk|jsdelivr/.test(html),'默认入口不能加载实验云 SDK');
  const cloudWindow = {};
  Object.defineProperty(cloudWindow,'WorkBuddyCloud',{get(){throw new Error('不应读取云 SDK');}});
  const cloudContext = {window:cloudWindow,document:{getElementById(){return null;}}};
  vm.runInNewContext(cloud,cloudContext,{timeout:1000});
  const attachment = cloudWindow.CampusCloudSync.attach(new Proxy({},{get(){throw new Error('停用云不得读取本地桥');}}));
  assert.equal(attachment.enabled,false);attachment.paint();
  const app = files.get('app.js').toString('utf8');
  assert.ok(!app.includes('data-action="load-demo-schedule"'),'公开版不得用空种子重置为旧个人演示课表');
  assert.ok(!app.includes('brand-study.html'),'不能引用未附的研究页面');
  assert.ok(app.includes("const mode=electricityMode||'personal';"),'电费默认应为空白个人模式');
  for (const name of ['campus-map/source.html','README.md','THIRD-PARTY-NOTICES.txt']) assert.ok(files.get(name).toString('utf8').includes('AGPL'));
  assert.ok(files.get('LICENSE.txt').equals(files.get('campus-map/vendor/studev/LICENSE.txt')),'AGPL 全文须随附且一致');
  const result = {ok:true,files:files.size,syntaxScripts:scripts,localReferences:links,blankSeed:true,isolatedStorage:true,cloudDisabled:true,sensitivePatterns:'no matches in allowlist',licenseFiles:true};
  return result;
}
module.exports = {checkSource};
if (require.main === module) console.log(JSON.stringify(checkSource(),null,2));
