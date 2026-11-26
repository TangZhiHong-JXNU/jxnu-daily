'use strict';
// SPDX-License-Identifier: AGPL-3.0-or-later
// 默认仅监听本机；不读取.env文件或原工作区数据。
const { createSiteServer } = require('./campus-map/site-server.cjs');
const port = Number(process.env.PORT || 8094);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const host = process.env.HOST || '127.0.0.1';
const server = createSiteServer({ root: __dirname });
server.on('error', () => { console.error('Campus site server failed to start.'); process.exitCode = 1; });
server.listen(port, host, () => console.log('JXNU Daily source server ready.'));
