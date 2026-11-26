'use strict';
// SPDX-License-Identifier: AGPL-3.0-or-later
// 公开源码版：只开放实际随附的前端资源，测试、环境文件和服务源码不走静态路由。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createMapProxy } = require('./proxy.cjs');
const PUBLIC_FILES = Object.freeze([
  'index.html','data.js','app.js','cloud-sync.js','styles.css','campus-ui.css',
  'freshman-guide.js','schedule-html.js','schedule-rules.js','ui-icons.js',
  'brand.js','brand-favicon.svg','learning-info-data.js','learning-info.js','learning-info.css',
  'LICENSE.txt','tabler-icons-LICENSE.txt','THIRD-PARTY-NOTICES.txt','README.md',
  'campus-art/album.webp','campus-art/lake.webp','campus-art/sports.webp','campus-art/sources.json',
  'campus-map/index.html','campus-map/map.js','campus-map/map.css','campus-map/places.js','campus-map/source.html',
  'campus-map/vendor/studev/orientation-ball.js','campus-map/vendor/studev/ball.ts.source.txt',
  'campus-map/vendor/studev/LICENSE.txt','campus-map/vendor/studev/origin.json'
]);
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8'};
function runtimeScript(configured) {
  return "(function(){'use strict';var old=window._TMapSecurityConfig;var valid=old&&typeof old.serviceHost==='string'&&old.serviceHost.trim()&&!/__WB_[A-Z_]+__/.test(old.serviceHost);window.CampusMapRuntime=Object.freeze({mode:'project-proxy',configured:" + Boolean(configured) + "});if(!valid&&" + Boolean(configured) + "){window._TMapSecurityConfig={serviceHost:location.origin+'/_TMapService'};}})();";
}
function createSiteServer(options = {}) {
  const root = fs.realpathSync(options.root || path.resolve(__dirname,'..'));
  // 测试会显式传入空凭据；默认运行仅从服务端环境获取，不读取任何.env。
  const key = options.key === undefined ? process.env.TENCENT_MAP_KEY || '' : options.key;
  const sk = options.sk === undefined ? process.env.TENCENT_MAP_SK || '' : options.sk;
  const publicOrigin = options.publicOrigin === undefined ? process.env.CAMPUS_PUBLIC_ORIGIN : options.publicOrigin;
  const configured = Boolean(String(key).trim() && String(sk).trim());
  const mapProxy = createMapProxy({key,sk,publicOrigin,fetchImpl:options.fetchImpl});
  const allowed = new Set(PUBLIC_FILES);
  const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
  let cachedArchive = null;
  const server = http.createServer(async (req,res) => {
    const send = (status,body='',type='text/plain; charset=utf-8',extra={}) => {
      res.writeHead(status,{...headers,'Content-Type':type,...extra});
      res.end(req.method === 'HEAD' ? '' : body);
    };
    try {
      const target = req.url || '';
      if (target.length > 8192 || !target.startsWith('/') || target.startsWith('//') || /[\\\u0000-\u0020]/.test(target) || /%(?:2e|2f|5c|00|25)/i.test(target.split('?')[0]) || target.split('?')[0].split('/').some(part => part === '.' || part === '..')) {
        send(400,'Invalid request'); return;
      }
      if (await mapProxy(req,res)) return;
      if (!['GET','HEAD'].includes(req.method)) {send(405,'Method not allowed',undefined,{'Allow':'GET, HEAD'});return;}
      let name;
      try {name = decodeURIComponent(new URL(target,'http://localhost').pathname).slice(1);} catch {send(400,'Invalid path');return;}
      if (name.split('/').some(part => part === '.' || part === '..' || part.startsWith('.'))) {send(404,'Not found');return;}
      if (!name) name = 'index.html';
      if (name === 'campus-map/') name += 'index.html';
      if (name === 'favicon.ico') {send(204);return;}
      if (name === '_campus/map-config.js') {send(200,runtimeScript(configured),MIME['.js']);return;}
      if (name === 'campus-map/campus-map-source.zip') {
        // 同一进程内复用白名单归档，避免重复压缩；修改代码后应重启服务。
        if (!cachedArchive) cachedArchive = require('./package-source.cjs').buildArchive();
        send(200,cachedArchive,'application/zip',{'Content-Disposition':'attachment; filename="jxnu-daily-source.zip"','Content-Length':cachedArchive.length});return;
      }
      if (!allowed.has(name)) {send(404,'Not found');return;}
      const file = path.resolve(root,name);
      let real,stat;
      try {real = await fs.promises.realpath(file);stat = await fs.promises.stat(real);} catch {send(404,'Not found');return;}
      const relative = path.relative(root,real);
      if (relative === '..' || relative.startsWith('..'+path.sep) || path.isAbsolute(relative) || !stat.isFile()) {send(404,'Not found');return;}
      if (name.endsWith('.html')) {
        const html = (await fs.promises.readFile(real,'utf8')).replace(/<head\b[^>]*>/i,'$&\n  <script src="/_campus/map-config.js"></script>');
        send(200,html,MIME['.html']);return;
      }
      res.writeHead(200,{...headers,'Content-Type':MIME[path.extname(name)]||'application/octet-stream','Content-Length':stat.size});
      if (req.method === 'HEAD') res.end();
      else {const stream = fs.createReadStream(real);stream.on('error',()=>res.destroy());stream.pipe(res);}
    } catch {
      // 不回显请求串、凭据、磁盘路径或堆栈。
      if (!res.headersSent) send(500,'Request failed'); else res.destroy();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}
module.exports = {createSiteServer,runtimeScript,PUBLIC_FILES};
