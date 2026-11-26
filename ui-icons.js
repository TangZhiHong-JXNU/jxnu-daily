/*
 * 图标素材：Tabler Icons outlines，https://github.com/tabler/tabler-icons
 * Copyright (c) 2020-2026 Paweł Kuna；MIT，完整许可证见 tabler-icons-LICENSE.txt。
 * 2026-11-22 通过已连接 GitHub 工具读取官方 SVG；保留原始路径几何。
 * 来源：icons/outline/<name>.svg；以下为各源文件 Git blob SHA：
 * clock       9c31e876efddef0342f81a8799075b50d19c1d52
 * home        185788d9ea4bedc5f604eff05ed64441ffb70074
 * calendar    d9e9fe94888f1f60f8caf55ce6fdd38a5bc8858d
 * building    9f653a194e628f14c7e46bd6a13a5f3b5136cc86
 * bell        5d899224237cd3cdc252d9264639e98e6f96a3de
 * circle      e3f3c7c6da4f7045cb5bea897ca7453fb5c03790
 * user        6cdc9ac644e810aeed1b2d15df46aa6e0a0332fd
 * layout-grid c087748bd4840d9262db8a3e8d96f43b478c3687
 * school      5aef27951c16c31c869a7e8ea7ad484aa54d88bd
 * LICENSE     3e82379dab3fe93d9ee22251949604ed63ddea39
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.CampusIcons = factory();
  }
}(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var paths = {
    clock: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 7v5l3 3" />',
    home: '<path d="M5 12l-2 0l9 -9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />',
    calendar: '<path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" />',
    building: '<path d="M3 21l18 0" /><path d="M9 8l1 0" /><path d="M9 12l1 0" /><path d="M9 16l1 0" /><path d="M14 8l1 0" /><path d="M14 12l1 0" /><path d="M14 16l1 0" /><path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16" />',
    bell: '<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" />',
    circle: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />',
    user: '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />',
    'layout-grid': '<path d="M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" />',
    school: '<path d="M22 9l-10 -4l-10 4l10 4l10 -4v6" /><path d="M6 10.6v5.4a6 3 0 0 0 12 0v-5.4" />'
  };
  var names = {
    clock: 'clock',
    home: 'home',
    calendar: 'calendar',
    building: 'building',
    bell: 'bell',
    circle: 'circle',
    person: 'user',
    grid: 'layout-grid',
    user: 'user',
    school: 'school'
  };

  function icon(name) {
    var key = typeof name === 'string' && Object.prototype.hasOwnProperty.call(names, name) ? names[name] : 'circle';
    return '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[key] + '</svg>';
  }

  return { icon: icon };
}));
