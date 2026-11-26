'use strict';

const { createHash } = require('node:crypto');

const PREFIX = '/_TMapService';
const MAX_URL = 8192;
const MAX_BODY = 2 * 1024 * 1024;
const INTERNAL_CALLBACK = '_mapProxyResponse';
const PRIVATE_FIELD = /^(?:key\d*|apikey|sig|signature|token|access_token|secret|sk|servicesk|subkey|authorization)$/i;
const CALLBACK = /^(?:[A-Za-z_$][\w$]*)(?:\.[A-Za-z_$][\w$]*)*$/;
const META = ['output', 'callback', 'cb', 'pf', 'ref', 'version', 'v', 'mode', '_'];
const WALK_PARAMS = new Set(['from', 'to', ...META]);
const CHECK_PARAMS = new Set(['pid', 'channel', ...META]);
// 统计只保留 SDK 的基础计数，不转发设备标识、UA、错误正文或任意 URL。
const TELEMETRY_FORWARD = new Set(['logid', 'v', 'version', 'lt', 'dpr', 'lss', 'gls', 't', 'e', 'num', 'frt', 'pf', 'ref', '_']);
const TELEMETRY_PARAMS = new Set(['appid', ...TELEMETRY_FORWARD, 'd', 'ua', 'dt', 'dvn', 'hc', 'cd', 'msg', 'type', 'code', 'device', 'lowdevice', 'systemid', 'id', 'info', 'cn']);

function fail(status, code, diagnostic = {}) {
  return Object.assign(new Error(code), { status, code }, diagnostic);
}

// 诊断只保留固定阶段与数字状态；SDK可能只保留message，因此另给严格机器标记。
const DIAGNOSTIC_STAGES = new Set(['upstream-http', 'upstream-business', 'upstream-network', 'upstream-timeout', 'upstream-format']);
function safeDiagnostic(error) {
  const stage = DIAGNOSTIC_STAGES.has(error?.stage) ? error.stage :
    error?.code === 'MAP_UPSTREAM_TIMEOUT' ? 'upstream-timeout' :
    ['MAP_INVALID_UPSTREAM', 'MAP_UPSTREAM_TOO_LARGE'].includes(error?.code) ? 'upstream-format' : 'upstream-network';
  const upstreamStatus = Number.isInteger(error?.upstreamStatus) && error.upstreamStatus > 0 && error.upstreamStatus <= 9999 ? error.upstreamStatus : 0;
  const upstreamHttpStatus = Number.isInteger(error?.upstreamHttpStatus) && error.upstreamHttpStatus >= 100 && error.upstreamHttpStatus <= 599 ? error.upstreamHttpStatus : 0;
  return { stage, upstreamStatus, upstreamHttpStatus, message: `CMAP/${stage}/${upstreamStatus}/${upstreamHttpStatus}` };
}

function validCallback(value) {
  return value.length <= 200 && CALLBACK.test(value) &&
    !value.split('.').some(part => ['__proto__', 'prototype', 'constructor'].includes(part));
}

function originFromHost(req) {
  const host = req.headers.host;
  if (typeof host !== 'string' || host.length > 253 ||
      !/^(?:\[[0-9a-fA-F:]+\]|[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?)(?::\d{1,5})?$/.test(host)) {
    throw fail(403, 'MAP_ORIGIN_REJECTED');
  }
  try {
    return new URL(`${req.socket?.encrypted ? 'https' : 'http'}://${host}`).origin;
  } catch {
    throw fail(403, 'MAP_ORIGIN_REJECTED');
  }
}

function checkOrigin(req, publicOrigin) {
  const expected = publicOrigin || originFromHost(req);
  // 即使配置 publicOrigin，也不接受含用户信息、非法端口等畸形 Host。
  originFromHost(req);
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') throw fail(403, 'MAP_ORIGIN_REJECTED');
  for (const name of ['origin', 'referer']) {
    const value = req.headers[name];
    if (value === undefined) continue;
    try {
      const parsed = new URL(value);
      if (parsed.origin !== expected || parsed.username || parsed.password) throw new Error();
    } catch {
      throw fail(403, 'MAP_ORIGIN_REJECTED');
    }
  }
  // 来源头只能降低浏览器跨站滥用，不能作为身份认证或防脚本盗刷保证。
  return expected;
}

function parseParams(query, route) {
  if (/%(?![0-9a-fA-F]{2})/.test(query)) throw fail(400, 'MAP_INVALID_QUERY');
  try { decodeURIComponent(query.replace(/\+/g, ' ')); } catch { throw fail(400, 'MAP_INVALID_QUERY'); }
  const params = new URLSearchParams(query);
  const seen = new Set();
  const allowed = route === 'walking' ? WALK_PARAMS : route === 'check' ? CHECK_PARAMS : TELEMETRY_PARAMS;
  for (const [name, value] of params) {
    const lower = name.toLowerCase();
    if (seen.has(lower) || PRIVATE_FIELD.test(name)) throw fail(400, 'MAP_FORBIDDEN_PARAMETER');
    seen.add(lower);
    if (!allowed.has(name)) {
      // POI 会覆盖坐标，无法仅靠起终点范围确保仍在校园区域，因此不开放。
      throw fail(400, name === 'from_poi' || name === 'to_poi' ? 'MAP_REGION_RESTRICTED' : 'MAP_UNKNOWN_PARAMETER');
    }
    if (value.length > 512 || /[\x00-\x1f\x7f]/.test(value)) throw fail(400, 'MAP_INVALID_QUERY');
    if (['pf', 'ref', 'version', 'v', 'mode', '_', 'channel', 'logid', 't'].includes(name) && !/^[\w.-]{0,80}$/.test(value)) {
      throw fail(400, 'MAP_INVALID_QUERY');
    }
  }
  if (params.has('callback') && params.has('cb')) throw fail(400, 'MAP_INVALID_CALLBACK');
  const callback = params.get('callback') ?? params.get('cb');
  if (callback !== null && !validCallback(callback)) throw fail(400, 'MAP_INVALID_CALLBACK');
  const output = params.get('output');
  if (output !== null && !['json', 'jsonp'].includes(output)) throw fail(400, 'MAP_INVALID_OUTPUT');
  if (output === 'jsonp' && callback === null) throw fail(400, 'MAP_INVALID_CALLBACK');
  if (route === 'walking') {
    for (const name of ['from', 'to']) {
      const value = params.get(name) || '';
      if (!/^\d{1,2}(?:\.\d+)?,\d{1,3}(?:\.\d+)?$/.test(value)) throw fail(400, 'MAP_INVALID_COORDINATE');
      const [lat, lng] = value.split(',').map(Number);
      if (lat < 28.60 || lat > 28.76 || lng < 115.96 || lng > 116.10) throw fail(400, 'MAP_REGION_RESTRICTED');
    }
  }
  return { params, callback };
}

function redact(value, secrets, depth = 0) {
  if (depth > 80) throw fail(502, 'MAP_INVALID_UPSTREAM');
  if (typeof value === 'string') {
    for (const secret of secrets) {
      if (secret) {
        value = value.split(secret).join('[已隐藏]');
        value = value.split(encodeURIComponent(secret)).join('[已隐藏]');
      }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(item => redact(item, secrets, depth + 1));
  if (value && typeof value === 'object') {
    const clean = Object.create(null);
    for (const [name, child] of Object.entries(value)) {
      if (PRIVATE_FIELD.test(name) || ['__proto__', 'prototype', 'constructor'].includes(name)) continue;
      clean[redact(name, secrets, depth + 1)] = redact(child, secrets, depth + 1);
    }
    return clean;
  }
  return value;
}

async function readLimited(response, signal) {
  const length = response.headers?.get('content-length');
  if (length && Number(length) > MAX_BODY) throw fail(502, 'MAP_UPSTREAM_TOO_LARGE');
  if (!response.body) return '';
  const chunks = [];
  let size = 0;
  // 使用流读取，不能先 text() 再判断，以免上游超大内容撑爆内存。
  for await (const chunk of response.body) {
    if (signal.aborted) throw fail(504, 'MAP_UPSTREAM_TIMEOUT');
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_BODY) throw fail(502, 'MAP_UPSTREAM_TOO_LARGE');
    chunks.push(bytes);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function decodeResponse(text) {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch { /* 鉴权服务的 cb 协议保留为严格 JSONP。 */ }
  // 腾讯鉴权可返回 cb&&cb(JSON)；只接受固定内部回调，绝不执行上游脚本。
  const match = trimmed.match(/^(?:_mapProxyResponse\s*&&\s*)?_mapProxyResponse\s*\(([\s\S]*)\)\s*;?$/);
  if (!match) throw fail(502, 'MAP_INVALID_UPSTREAM');
  try { return JSON.parse(match[1]); } catch { throw fail(502, 'MAP_INVALID_UPSTREAM'); }
}

/** 创建同源代理；额度仅为本 handler 内存状态，不是跨进程、跨实例或持久化配额。 */
function createMapProxy(options = {}) {
  const keyInput = options.key ?? process.env.TENCENT_MAP_KEY ?? '';
  const skInput = options.sk ?? process.env.TENCENT_MAP_SK ?? '';
  // 控制台复制可能带首尾空白；仅运行时规范化，不改配置、不删除内部字符或猜测密钥。
  const key = typeof keyInput === 'string' ? keyInput.trim() : '';
  const sk = typeof skInput === 'string' ? skInput.trim() : '';
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const timeoutMs = Math.max(1, Math.min(8000, options.timeoutMs ?? 8000));
  let publicOrigin;
  if (options.publicOrigin) {
    const parsed = new URL(options.publicOrigin);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password ||
        parsed.pathname !== '/' || parsed.search || parsed.hash) throw new TypeError('publicOrigin 必须为 HTTP(S) 源');
    publicOrigin = parsed.origin;
  }
  const configured = typeof key === 'string' && key.trim().length > 0;
  const walking = configured && typeof sk === 'string' && sk.trim().length > 0;
  const clients = new Map();
  let lastWalking = -Infinity;
  let day = '';
  let dayCount = 0;
  let otherRequests = [];

  function reserve(req, route) {
    const time = now();
    const today = new Date(time + 8 * 3600000).toISOString().slice(0, 10);
    if (today !== day) { day = today; dayCount = 0; }
    for (const [id, state] of clients) {
      if (time - state.start >= 60000) clients.delete(id);
    }
    const id = req.socket?.remoteAddress || 'unknown';
    let client = clients.get(id);
    if (!client) {
      if (clients.size >= 4096) throw fail(429, 'MAP_RATE_LIMITED');
      client = { start: time, walking: 0, other: 0 };
      clients.set(id, client);
    }
    if (route === 'walking') {
      if (time - lastWalking < 1000 || client.walking >= 10 || dayCount >= 1000) throw fail(429, 'MAP_RATE_LIMITED');
      lastWalking = time;
      dayCount++;
      client.walking++;
    } else {
      otherRequests = otherRequests.filter(stamp => time - stamp < 1000);
      if (client.other >= 60 || otherRequests.length >= 20) throw fail(429, 'MAP_RATE_LIMITED');
      client.other++;
      otherRequests.push(time);
    }
    // 远程失败也计额度，避免超时、异常重试绕过限流。
  }

  return async function mapProxy(req, res) {
    const raw = typeof req.url === 'string' ? req.url : '';
    let decodedPath;
    try { decodedPath = decodeURIComponent(raw.split('?')[0]); } catch { decodedPath = raw.split('?')[0]; }
    const path = raw.split('?')[0];
    const belongs = value => value === PREFIX || value.startsWith(`${PREFIX}/`);
    if (!belongs(path) && !belongs(decodedPath)) return false;
    const send = (status, data, callback = null) => {
      const json = JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
      const payload = callback ? `${callback}(${json});` : json;
      if (status === 200 && Buffer.byteLength(payload) > MAX_BODY) throw fail(502, 'MAP_UPSTREAM_TOO_LARGE');
      res.statusCode = status;
      res.setHeader('Content-Type', callback ? 'application/javascript; charset=utf-8' : 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      if (status === 429) res.setHeader('Retry-After', '1');
      res.end(payload);
    };
    let callback = null, walkingUpstream = false;
    try {
      if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); throw fail(405, 'MAP_METHOD_NOT_ALLOWED'); }
      if (Buffer.byteLength(raw) > MAX_URL) throw fail(414, 'MAP_URL_TOO_LONG');
      if (path.includes('%') || path !== decodedPath || /[\\#\x00-\x20\x7f]/.test(raw) || path.includes('//') || path.split('/').some(part => part === '.' || part === '..')) {
        throw fail(400, 'MAP_INVALID_PATH');
      }
      const expectedOrigin = checkOrigin(req, publicOrigin);
      if (path === `${PREFIX}/health`) {
        if (raw.includes('?')) throw fail(400, 'MAP_INVALID_QUERY');
        send(200, { configured, mode: 'project-proxy', walking });
        return true;
      }
      const route = /^\/_TMapService\/service\/direction\/v1\/walking\/?$/.test(path) ? 'walking' :
        path === `${PREFIX}/checkKey` ? 'check' : (path === PREFIX || path === `${PREFIX}/`) ? 'telemetry' : null;
      if (!route) throw fail(404, 'MAP_PATH_NOT_ALLOWED');
      if (!configured || (route === 'walking' && !walking)) throw fail(503, 'MAP_NOT_CONFIGURED');
      const parsed = parseParams(raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '', route);
      const params = parsed.params;
      callback = parsed.callback;
      if (route === 'check' && params.has('pid') && params.get('pid') !== new URL(expectedOrigin).host) throw fail(400, 'MAP_INVALID_PID');
      reserve(req, route);
      const upstreamPath = `/ws/direction/v1/walking${path.endsWith('/') ? '/' : ''}`;
      const upstream = new URL(route === 'walking' ? `https://apis.map.qq.com${upstreamPath}` :
        route === 'check' ? 'https://apikey.map.qq.com/mkey/index.php/mkey/check' : 'https://pr.map.qq.com/pingd');
      for (const [name, value] of params) {
        if (!['callback', 'cb', 'output', 'appid'].includes(name) && (route !== 'telemetry' || TELEMETRY_FORWARD.has(name))) upstream.searchParams.set(name, value);
      }
      if (route === 'telemetry') upstream.searchParams.set('appid', 'jsapi_v3');
      if (route !== 'telemetry') upstream.searchParams.set('output', route === 'check' && callback ? 'jsonp' : 'json');
      // checkKey 使用 SDK 的 cb 字段；不擅自套用 WebService sig。
      if (route === 'check' && callback) upstream.searchParams.set(params.has('cb') ? 'cb' : 'callback', INTERNAL_CALLBACK);
      upstream.searchParams.set('key', key);
      let signature = '';
      if (route === 'walking') {
        const sorted = [...upstream.searchParams].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
        const plain = sorted.map(([name, value]) => `${name}=${value}`).join('&');
        signature = createHash('md5').update(`${upstreamPath}?${plain}${sk}`).digest('hex');
        // 签名针对真实 /ws 路径及未编码参数；发送时才交由 URLSearchParams 编码。
        upstream.search = new URLSearchParams(sorted).toString();
        upstream.searchParams.set('sig', signature);
      }
      walkingUpstream = route === 'walking';
      const controller = new AbortController();
      let timer;
      try {
        const deadline = new Promise((resolve, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(fail(504, 'MAP_UPSTREAM_TIMEOUT')); }, timeoutMs);
        });
        const operation = (async () => {
          const response = await fetchImpl(upstream.href, {
            method: 'GET', redirect: 'error', signal: controller.signal,
            headers: { Accept: 'application/json, application/javascript', Referer: `${expectedOrigin}/` },
          });
          if (!response.ok || response.redirected || (response.status >= 300 && response.status < 400)) {
            throw fail(502, 'MAP_UPSTREAM_FAILED', { stage: 'upstream-http', upstreamHttpStatus: response.status });
          }
          const text = await readLimited(response, controller.signal);
          if (route === 'telemetry') return { status: 0 };
          const data = decodeResponse(text);
          if (!data || typeof data !== 'object' || Array.isArray(data)) throw fail(502, 'MAP_INVALID_UPSTREAM');
          if (route === 'walking' && data.status !== 0) {
            if (!Number.isInteger(data.status) || data.status < 1 || data.status > 9999) throw fail(502, 'MAP_INVALID_UPSTREAM');
            throw fail(502, 'MAP_UPSTREAM_FAILED', { stage: 'upstream-business', upstreamStatus: data.status });
          }
          if (route === 'check') {
            if (!Number.isInteger(data.info?.error)) throw fail(502, 'MAP_INVALID_UPSTREAM');
            if (data.info.error !== 0) return { info: { error: data.info.error, msg: '地图鉴权失败' } };
          }
          return redact(data, [key, sk, signature]);
        })();
        const result = await Promise.race([operation, deadline]);
        send(200, result, callback);
      } finally {
        clearTimeout(timer);
        controller.abort();
      }
    } catch (error) {
      // 不记录请求、上游 URL、异常消息或响应正文，以免泄露凭证及用户坐标。
      const known = /^MAP_[A-Z_]+$/.test(error?.code || '') && Number.isInteger(error.status);
      const status = known ? error.status : 502;
      const body = { status, code: known ? error.code : 'MAP_UPSTREAM_FAILED' };
      if (walkingUpstream) {
        const diagnostic = safeDiagnostic(error);
        Object.assign(body, diagnostic);
        if (diagnostic.upstreamStatus) body.status = diagnostic.upstreamStatus;
        // 仅已经通过来源、参数、范围和限流校验的SDK JSONP请求可执行错误回调。
        // HTTP 200只表示脚本已送达；非零业务status仍令官方SDK拒绝，不伪装成功。
        send(callback ? 200 : status, body, callback);
      } else send(status, body, callback);
    }
    return true;
  };
}

module.exports = { createMapProxy };
