(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CampusLearningInfo = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const categories = Object.freeze(['关于推免', '转专业', '关于比赛', '考试与荣誉', '学习支持']);
  const text = value => value == null ? '' : String(value);
  function escapeText(value) {
    return text(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function safeUrl(value) {
    if (typeof value !== 'string') return '';
    const url = value.trim();
    if (!/^https?:\/\//i.test(url) || /[\u0000-\u0020\u007f\\]/.test(url)) return '';
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname && !parsed.username && !parsed.password ? parsed.href : '';
    } catch { return ''; }
  }
  function filterItems(items, category = '全部', query = '') {
    const words = text(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return (Array.isArray(items) ? items : []).filter(item => {
      if (!item || !categories.includes(item.category) || (category !== '全部' && item.category !== category)) return false;
      const haystack = [item.category, item.title, item.summary, item.cycle, item.status, item.sourceDate,
        ...(Array.isArray(item.tags) ? item.tags : []),
        ...(Array.isArray(item.sources) ? item.sources.map(source => source && source.label) : [])].map(text).join(' ').toLocaleLowerCase();
      return words.every(word => haystack.includes(word));
    });
  }
  function renderCard(item) {
    const sources = (Array.isArray(item.sources) ? item.sources : []).map(source => {
      const url = safeUrl(source && source.url);
      return url ? `<li><a href="${escapeText(url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${escapeText(source.label || '来源网页')} ↗</a></li>` : '';
    }).join('');
    const tags = (Array.isArray(item.tags) ? item.tags : []).map(tag => `<span>${escapeText(tag)}</span>`).join('');
    const isRegistration = ['关于比赛', '考试与荣誉'].includes(item.category);
    const cycleTitle = isRegistration ? '往年周期参考' : '时间与适用范围';
    const cycleNote = isRegistration ? '非当届报名通知；具体安排以当届通知为准。' : '请核对来源的适用学年、对象与有效范围，以当届适用细则为准。';
    return `<details class="learning-info-card"><summary><span class="learning-info-meta">${escapeText(item.category)} · ${escapeText(item.status || '请核对来源')}</span><h3>${escapeText(item.title)}</h3><span class="learning-info-open">展开周期、摘要与来源</span></summary><div class="learning-info-detail"><p class="learning-info-cycle"><strong>${cycleTitle}：</strong>${escapeText(item.cycle || '尚无可核对的时间与适用信息')}<br><small>${cycleNote}</small></p><p>${escapeText(item.summary || '请打开来源核对具体要求。')}</p>${tags ? `<div class="learning-info-tags" aria-label="信息标签">${tags}</div>` : ''}<p class="learning-info-meta">来源日期：${escapeText(item.sourceDate || '未标注')}</p>${sources ? `<ul class="learning-info-sources" aria-label="公开来源">${sources}</ul>` : '<p class="learning-info-meta">暂无可用的公开来源链接。</p>'}</div></details>`;
  }
  function renderResults(items, category = '全部', query = '') {
    const list = filterItems(items, category, query);
    return list.length ? list.map(renderCard).join('') : '<div class="learning-info-empty"><p>没有找到匹配的学习信息。</p><button type="button" data-learning-clear>清除搜索与分类</button></div>';
  }
  function renderCategories(items, category, query) {
    return ['全部', ...categories].map(name => `<button type="button" data-learning-category="${escapeText(name)}" aria-pressed="${name === category}">${escapeText(name)} <span>${filterItems(items, name, query).length}</span></button>`).join('');
  }
  function mount(host) {
    if (!host) return;
    // 仅使用公开只读信息；筛选状态随弹窗关闭丢弃，不接触个人资源。
    const items = filterItems(typeof window === 'object' ? window.CAMPUS_LEARNING_ITEMS : []);
    let category = '全部', query = '';
    host.classList.add('learning-info');
    host.innerHTML = '<header class="learning-info-heading"><div><p class="learning-info-kicker">校园学习手册 · 只读信息</p><h3>先看方向，再核对当届通知</h3></div><details class="learning-info-rules"><summary>阅读规则</summary><p>周期仅是往年参考，不表示当届正在报名；比赛等级不等于推免加分。资格、认定与材料要求请逐项核对当届通知和适用细则。本区仅提供公开来源，不办理报名。</p></details></header><nav class="learning-info-categories" aria-label="学习信息分类"></nav><div class="learning-info-tools"><label>搜索学习信息<input type="search" maxlength="100" placeholder="标题、关键词或标签" data-learning-search></label><button type="button" data-learning-clear>清除筛选</button></div><p class="learning-info-count" role="status" aria-live="polite"></p><div class="learning-info-results"></div>';
    const input = host.querySelector('[data-learning-search]');
    function update() {
      host.querySelector('.learning-info-categories').innerHTML = renderCategories(items, category, query);
      host.querySelector('.learning-info-count').textContent = `匹配 ${filterItems(items, category, query).length} / 共 ${items.length} 条 · 周期为往年参考，等级不等于推免加分`;
      host.querySelector('.learning-info-results').innerHTML = renderResults(items, category, query);
    }
    host.oninput = event => {
      if (event.target === input) { query = input.value.slice(0, 100); update(); }
    };
    host.onclick = event => {
      const button = event.target.closest('button');
      if (!button || !host.contains(button)) return;
      if (button.hasAttribute('data-learning-clear')) {
        category = '全部'; query = ''; input.value = ''; update(); input.focus();
      } else if (button.hasAttribute('data-learning-category')) {
        const next = button.getAttribute('data-learning-category');
        if (!['全部', ...categories].includes(next)) return;
        category = next; update();
        // 重绘后恢复当前分类的键盘焦点。
        Array.from(host.querySelectorAll('[data-learning-category]')).find(node => node.getAttribute('data-learning-category') === category)?.focus();
      }
    };
    update();
  }
  return Object.freeze({ categories, escapeText, safeUrl, filterItems, renderCard, renderResults, mount });
});
