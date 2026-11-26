(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof define === 'function' && define.amd) define([], function () { return api; });
  if (root) root.CampusBrand = api;
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // 翻页款沿用已选原型：展开书页、中央书脊、JX / NU；右上折角为同源细化。
  // 小号仅删减内部字母，不缩细书页轮廓；不得将微型版当作完整英文缩写。
  var leftPage = '<path d="M3 5h17l4 3v37l-5-5H3V5zm3 3v29h14l2 2V10l-3-2H6z" fill-rule="evenodd"/>';
  var rightPage = '<path d="M24 8l4-3h12l5 5v30H29l-5 5V8zm2 2v29l2-2h14V11l-3-3H29z" fill-rule="evenodd"/>';
  var fold = '<path class="folio-fold" d="M38 6h2v4h4v2h-6z"/>';
  var fullLeft = '<path d="M8 12h12v7c0 4-2 6-6 6H8v-4h6c2 0 2-1 2-2v-3H8zM8 27h4l4 5v-5h4v9h-4l-4-5v5H8z"/>';
  var fullRight = '<path d="M28 13h4l2 4 2-4h4l-4 6 4 6h-4l-2-4-2 4h-4l4-6zM28 27h4v4c0 1 0 2 2 2s2-1 2-2v-4h4v4c0 4-2 5-6 5s-6-1-6-5z"/>';
  var compactLeft = '<path d="M9 16h10v9c0 5-3 7-8 7H8v-4h3c3 0 4-1 4-3v-5H9z"/>';
  var compactRight = '<path d="M28 16h4l2 5 2-5h4l-4 8 4 8h-4l-2-5-2 5h-4l4-8z"/>';
  function folio(compact) {
    return '<path class="folio-underleaf" opacity="0" d="M26 10l3-2h13v29H29l-3 3z"/>' +
      '<g class="folio-left">' + leftPage + (compact ? compactLeft : fullLeft) + '</g>' +
      '<g class="folio-page">' + rightPage + fold + (compact ? compactRight : fullRight) + '</g>';
  }
  var geometry = {
    jx: '<path d="M5 7h21v22c0 8-5 13-13 13H5v-8h8c3 0 5-2 5-5V15H5z"/><path d="M23 7h8l3.5 9 3.5-9h8l-7 17.5L46 42h-8l-3.5-9-3.5 9h-8l7-17.5z"/>',
    folio: folio(false),
    tile: '<path d="M5 5h15v10c0 5-3 8-8 8H5v-5h7c2 0 3-1 3-3v-5H5zM27 5h6l3 5 3-5h6l-6 9 6 9h-6l-3-5-3 5h-6l6-9zM5 27h5l8 10V27h5v18h-5l-8-10v10H5zM27 27h5v10c0 2 1 3 4 3s4-1 4-3V27h5v10c0 6-3 9-9 9s-9-3-9-9z"/>'
  };

  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function mark(kind, label, variant) {
    if (kind === undefined) kind = 'folio';
    if (label === undefined) label = '师大日常翻页字标';
    var resolved = typeof kind === 'string' && Object.prototype.hasOwnProperty.call(geometry, kind) ? kind : 'folio';
    var compact = resolved === 'folio' && variant === 'compact';
    var paths = compact ? folio(true) : geometry[resolved];
    var accessible = label === false || label === null || label === ''
      ? ' aria-hidden="true"'
      : ' role="img" aria-label="' + escapeText(label) + '"';
    var title = label === false || label === null || label === '' ? '' : '<title>' + escapeText(label) + '</title>';
    return '<svg xmlns="http://www.w3.org/2000/svg" class="campus-brand-svg" data-brand-kind="' + resolved + '" data-brand-variant="' + (compact ? 'compact' : 'full') + '" viewBox="0 0 48 48" fill="currentColor" focusable="false"' + accessible + '>' + title + paths + '</svg>';
  }

  // 固定绘制的两道纸上笔迹；只借鉴 SVG 描边和标注分层的方法，不复制第三方路径或实现。
  function signature() {
    return '<svg class="brand-pen-line" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 12" fill="none" aria-hidden="true" focusable="false"><path class="brand-pen-primary" d="M3 7C38 3 91 3 176 5" pathLength="100" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="brand-pen-secondary" d="M28 10C75 7 128 7 160 8" pathLength="100" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity=".35"/></svg>';
  }

  return { mark: mark, signature: signature };
}));
