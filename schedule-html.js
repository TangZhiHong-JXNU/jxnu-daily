/* 教务 HTML 只在惰性 template 中解析；原文不进入存档，不挂接输入文档节点。 */
(() => {
  'use strict';
  const limit = 2 * 1024 * 1024;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function lines(node) {
    if (node.nodeType === 3) return node.nodeValue;
    if (node.nodeType !== 1 || /^(SCRIPT|STYLE|INPUT|SELECT|TEXTAREA|IFRAME|OBJECT|TEMPLATE|SVG|IMG)$/.test(node.tagName)) return '';
    if (node.tagName === 'BR') return '\n';
    return Array.from(node.childNodes, lines).join('') + (/^(DIV|P|LI)$/.test(node.tagName) ? '\n' : '');
  }
  const text = node => lines(node).replace(/\u00a0/g, ' ').split('\n').map(x => x.trim()).filter(Boolean).join('\n');
  function parse(html, doc = document) {
    if (typeof html !== 'string' || !html.trim()) throw Error('请先选择 HTML 文件或粘贴网页源代码。');
    if (html.length > limit) throw Error('HTML 超过 2 MiB 字符限制，请仅保留课表表格。');
    const template = doc.createElement('template');
    template.innerHTML = html;
    const tables = template.content.querySelectorAll('table');
    const direct = Array.from(tables).find(t => /(?:^|_)NewKcb$/i.test(t.id));
    // ASP.NET 页面可能将 NewKcb 标在 div 容器上，而非内部 table。
    const container = direct ? null : Array.from(template.content.querySelectorAll('[id]')).find(node => /(?:^|_)NewKcb$/i.test(node.id));
    const nested = container ? Array.from(container.querySelectorAll('table')).filter(t => !t.parentElement?.closest('table') || !container.contains(t.parentElement.closest('table'))) : [];
    if (!direct && nested.length > 1) throw Error('NewKcb 容器内有多个独立表格，暂不猜测，请仅复制课表表格后重试。');
    const table = direct || nested[0];
    if (!table) throw Error('未找到 NewKcb 容器内的课表表格。请复制完整响应 HTML，只有 div 开头一行还不能导入。');
    const rows = Array.from(table.rows);
    if (rows.length > 100 || table.querySelectorAll('td,th').length > 2000) throw Error('表格过大，停止解析。');
    const grid = [], origins = [];
    rows.forEach((row, ri) => {
      grid[ri] ||= [];
      let col = 0;
      Array.from(row.cells).forEach(cell => {
        while (grid[ri][col]) col++;
        const rs = Number(cell.getAttribute('rowspan') || 1), cs = Number(cell.getAttribute('colspan') || 1);
        if (!Number.isInteger(rs) || !Number.isInteger(cs) || rs < 1 || cs < 1 || rs > 50 || cs > 20 || col + cs > 30) throw Error('存在不支持的合并单元格。');
        const origin = {ri, col, rs, cs, value:text(cell)}; origins.push(origin);
        for (let r = ri; r < ri + rs; r++) {
          grid[r] ||= [];
          for (let c = col; c < col + cs; c++) {
            if (grid[r][c]) throw Error('表格合并结构重叠，需手动整理。');
            grid[r][c] = origin;
          }
        }
        col += cs;
      });
    });
    const dayMap = new Map(), dayIndex = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'日':7,'天':7};
    let headerRow = -1;
    for (let r = 0; r < grid.length; r++) {
      const found = new Map();
      (grid[r] || []).forEach((o, c) => {const m = o.value.replace(/\s/g,'').match(/^(?:星期|周|礼拜)([一二三四五六日天])$/); if (m && o.cs === 1) found.set(c,dayIndex[m[1]]);});
      if (found.size === 7 && new Set(found.values()).size === 7) {found.forEach((d,c)=>dayMap.set(c,d));headerRow=r;break;}
    }
    if (headerRow < 0) throw Error('无法确认完整星期一至星期日表头；不猜测列顺序。');
    const firstDayCol = Math.min(...dayMap.keys()), result = [], warnings = [];
    const periodAt = r => {
      const labels = [...new Set((grid[r] || []).slice(0,firstDayCol).map(o=>o?.value || '').filter(Boolean))];
      return labels.join(' · ') || `表格第 ${r+1} 行`;
    };
    const periodsAt = r => {
      const label=grid[r]?.[firstDayCol-1]?.value || '';
      const pieces=label.split(/\s+/).filter(Boolean);
      return pieces.length && pieces.every(p=>/^\d{1,2}$/.test(p)) ? pieces.map(Number) : [];
    };
    origins.filter(o=>o.ri>headerRow && o.col>=firstDayCol && o.value).forEach(o=>{
      if (!dayMap.has(o.col) || o.cs!==1) {warnings.push('有跨星期或未知列的非空格未导入，请对照原课表补录。');return;}
      const parts=o.value.split('\n');
      // 已确认页面格式：首行为课程，第二行独立括号是地点；后续班级教师行不返回。
      const title=parts[0].length<=120 ? parts[0] : '';
      const roomMatch=parts[1]?.match(/^[（(]\s*([^()（）\n]{1,100}?)\s*[）)]$/);
      const location=roomMatch ? roomMatch[1].trim() : '';
      const labels=Array.from({length:o.rs},(_,i)=>periodAt(o.ri+i));
      const periods=Array.from({length:o.rs},(_,i)=>periodsAt(o.ri+i)).flat();
      const period=labels.join(' / ');
      const previous=result.findLast ? result.findLast(x=>x.day===dayMap.get(o.col)) : [...result].reverse().find(x=>x.day===dayMap.get(o.col));
      // 只合并原文完全相同、表格行相邻且节次连续的课程，不跨午休或未知晚间。
      if (previous && previous.raw===o.value && previous.endRow===o.ri && periods.length && previous.periods.length && periods[0]===previous.periods.at(-1)+1) {
        previous.period+=' / '+period;previous.periods.push(...periods);previous.endRow=o.ri+o.rs;return;
      }
      result.push({title,location,day:dayMap.get(o.col),period,periods,endRow:o.ri+o.rs,raw:o.value});
    });
    if (!result.length) throw Error('课表没有可识别的非空课程格。');
    if (result.length>200) throw Error('候选超过 200 条，请拆分课表。');
    // 原文、教师等仅用于当前解析的重复比较，返回前即丢弃。
    return {candidates:result.map(({title,location,day,period,periods})=>({title,location,day,period,periods})),warnings:[...new Set(warnings)]};
  }
  function shell() {
    return `<p>仅在本机读取教务课表 HTML，不登录、不上传原文件，原网页及隐藏状态不入档。只保存你核对确认的课程字段，请勿把师生姓名或学号填入这些字段。识别不是教务接口接入。</p><p>支持含 NewKcb 表格的网页。识别课程名、星期、节次及第二行括号内教室；识别结果须核对。每格可能包含多门课，必须对照原表，必要时分开手动添加。</p><label class="field">保存的网页（HTML / HTM，最多 2 MiB；UTF-8 或 GB18030）<input id="html-course-file" type="file" accept=".html,.htm,text/html"></label><label class="field">或粘贴网页源代码<textarea id="html-course-source" rows="6" maxlength="2097152" placeholder="粘贴含 NewKcb 表格的 HTML"></textarea></label><button type="button" id="html-course-parse">识别候选课程</button><div id="html-course-error" class="error" role="alert"></div><div id="html-course-preview" aria-live="polite"></div>`;
  }
  function courseClock(course, slots=[]) {
    const map=new Map(slots.map(s=>{const n=/^第(\d+)节$/.exec(s.label);return [n?Number(n[1]):null,s];}).filter(([n])=>n!==null));
    if(!course.periods.length||!course.periods.every(n=>map.has(n)))return {start:'',end:''};
    return {start:map.get(course.periods[0]).start,end:map.get(course.periods.at(-1)).end};
  }
  function mount(root, onCommit, {slots=[],initialCandidates=null}={}) {
    let revision=0, pending=false;
    const source=root.querySelector('#html-course-source'), output=root.querySelector('#html-course-preview'), error=root.querySelector('#html-course-error');
    const invalidate=()=>{revision++;output.replaceChildren();error.textContent='';};
    source.addEventListener('input',invalidate);
    root.querySelector('#html-course-file').addEventListener('change',async event=>{
      invalidate();const file=event.target.files[0];event.target.value='';if(!file)return;
      const token=revision;
      try {
        if(!/\.html?$/i.test(file.name)||file.size>limit)throw Error('请选择不超过 2 MiB 的 HTML / HTM 文件。');
        const bytes=await file.arrayBuffer();
        if(token!==revision||!source.isConnected)return;
        let html;try{html=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{html=new TextDecoder('gb18030',{fatal:true}).decode(bytes);}
        source.value=html;
      } catch(e) {if(token===revision&&source.isConnected)error.textContent=e.message;}
    });
    let supplied=initialCandidates;
    root.querySelector('#html-course-parse').addEventListener('click',()=>{
      invalidate();
      try {
        const {candidates,warnings}=supplied ? {candidates:supplied,warnings:[]} : parse(source.value);
        supplied=null;
        candidates.forEach(c=>Object.assign(c,courseClock(c,slots)));
        // 识别完即清空原文，后续只保留可编辑候选；不把隐藏字段传给主应用。
        source.value='';
        output.innerHTML=`<p>识别并合并为 ${candidates.length} 条课程。已自动填入能识别的教室；只有匹配本地节次配置的钟点才自动填入；本源码版不预设官方节次，空白时间请按实际作息填写。原文没有周次及单双周，请用批量工具填写并核对。晚间只标“晚上”，请在对应课程选择长短时段。未选中的条目不会导入。</p>${warnings.map(w=>`<p class="warning">${esc(w)}</p>`).join('')}<form id="html-course-form"><details open><summary>统一填写节次钟点（一次应用到全部课程）</summary><p>本源码版没有预设官方节次钟点。请按实际作息填写并应用到空白课程；不覆盖已填时间，已填时间请在课程卡片直接修改。</p>${[...new Set(candidates.flatMap(c=>c.periods))].sort((a,b)=>a-b).map(n=>`<div class="two-col" data-period-clock="${n}"><label class="field">第 ${n} 节开始<input type="time" data-clock="start"></label><label class="field">第 ${n} 节结束<input type="time" data-clock="end"></label></div>`).join('')}<button type="button" id="html-clock-apply">应用节次钟点到空白课程</button><p id="html-clock-status" role="status"></p></details><details><summary>为全部候选填写相同周次（仅当你确认全部相同时使用）</summary><div class="two-col"><label class="field">起始周<input id="html-bulk-first" type="number" min="1" max="60"></label><label class="field">结束周<input id="html-bulk-last" type="number" min="1" max="60"></label></div><label class="field">单双周<select id="html-bulk-parity"><option value="">请选择</option><option value="all">每周</option><option value="odd">单周</option><option value="even">双周</option></select></label><button id="html-bulk-apply" type="button">填入全部候选</button></details>${candidates.map((c,i)=>`<fieldset data-html-course="${i}" style="margin-block:16px;min-width:0"><legend><label><input type="checkbox" name="selected" checked>候选 ${i+1} · 周${'一二三四五六日'[c.day-1]} · ${esc(c.period)}</label></legend><label class="field">课程名称（请核对，勿填师生姓名）<input name="title" value="${esc(c.title)}" maxlength="120" required></label><label class="field">星期<select name="day">${Array.from({length:7},(_,d)=>`<option value="${d+1}" ${d+1===c.day?'selected':''}>周${'一二三四五六日'[d]}</option>`).join('')}</select></label><label class="field">教室<input name="location" value="${esc(c.location)}" maxlength="100" required></label>${!c.periods.length?`<label class="field">晚课时段（已有作息，请按课程选择）<select data-evening-clock><option value="">请选择，或在下方自填</option>${slots.filter(s=>/^第10/.test(s.label)).map(s=>`<option value="${esc(s.start+'|'+s.end)}">${esc(s.label)} ${esc(s.start)}–${esc(s.end)}</option>`).join('')}</select></label>`:''}<div class="two-col"><label class="field">开始钟点<input name="start" type="time" value="${esc(c.start)}" required></label><label class="field">结束钟点<input name="end" type="time" value="${esc(c.end)}" required></label></div><div class="two-col"><label class="field">起始周<input name="startWeek" type="number" min="1" max="60" required></label><label class="field">结束周<input name="endWeek" type="number" min="1" max="60" required></label></div><label class="field">单双周<select name="parity" required><option value="">请选择，不默认每周</option><option value="all">每周</option><option value="odd">单周</option><option value="even">双周</option></select></label></fieldset>`).join('')}<label><input name="reviewed" type="checkbox" required>我已对照原课表核对课程、地点、钟点及周次；多课程格已拆分处理</label><p class="subtle">只追加，不覆盖原课表。学期第一教学周日期请在课表设置中核对，本页不会根据学期选项推定。</p><button class="primary" type="submit">确认追加已选课程</button></form>`;
        const form=output.querySelector('form');
        form.querySelector('#html-clock-apply').addEventListener('click',()=>{
          const clocks=new Map();let applied=0;
          try {
            form.querySelectorAll('[data-period-clock]').forEach(row=>{
              const start=row.querySelector('[data-clock="start"]').value,end=row.querySelector('[data-clock="end"]').value;
              if(!start&&!end)return;
              if(!start||!end||start>=end)throw Error(`第 ${row.dataset.periodClock} 节钟点不完整或结束不晚于开始。`);
              clocks.set(Number(row.dataset.periodClock),{start,end});
            });
            const ordered=[...clocks].sort((a,b)=>a[0]-b[0]);
            for(let i=1;i<ordered.length;i++)if(ordered[i][1].start<ordered[i-1][1].end)throw Error('节次钟点顺序重叠，请核对后再应用。');
            form.querySelectorAll('fieldset').forEach(fs=>{
              const c=candidates[Number(fs.dataset.htmlCourse)],start=fs.querySelector('[name="start"]'),end=fs.querySelector('[name="end"]');
              if(!fs.querySelector('[name="selected"]').checked||start.value||end.value||!c.periods.length||!c.periods.every(n=>clocks.has(n)))return;
              start.value=clocks.get(c.periods[0]).start;end.value=clocks.get(c.periods.at(-1)).end;applied++;
            });
            error.textContent='';form.querySelector('#html-clock-status').textContent=`已填入 ${applied} 条课程钟点；已有时间不覆盖，缺节次或晚间请单独填写。`;
          }catch(e){error.textContent=e.message;}
        });
        form.addEventListener('change',event=>{if(event.target.matches('[data-evening-clock]')&&event.target.value){const fs=event.target.closest('fieldset'),[start,end]=event.target.value.split('|');fs.querySelector('[name="start"]').value=start;fs.querySelector('[name="end"]').value=end;}if(event.target.name==='selected')event.target.closest('fieldset').querySelectorAll('input:not([name="selected"]),select').forEach(el=>el.disabled=!event.target.checked);});
        form.querySelector('#html-bulk-apply').addEventListener('click',()=>{
          const first=Number(form.querySelector('#html-bulk-first').value),last=Number(form.querySelector('#html-bulk-last').value),parity=form.querySelector('#html-bulk-parity').value;
          if(!Number.isInteger(first)||!Number.isInteger(last)||first<1||last>60||first>last||!parity){error.textContent='批量周次须为 1–60 的整数且起始周不晚于结束周，并选择单双周。';return;}
          form.querySelectorAll('fieldset').forEach(fs=>{fs.querySelector('[name="startWeek"]').value=first;fs.querySelector('[name="endWeek"]').value=last;fs.querySelector('[name="parity"]').value=parity;});error.textContent='';
        });
        form.addEventListener('submit',event=>{
          event.preventDefault();if(pending)return;error.textContent='';
          try {
            const courses=Array.from(form.querySelectorAll('fieldset')).filter(fs=>fs.querySelector('[name="selected"]').checked).map(fs=>{
              const get=n=>fs.querySelector(`[name="${n}"]`).value;
              const c={title:get('title').trim(),day:Number(get('day')),location:get('location').trim(),start:get('start'),end:get('end'),startWeek:Number(get('startWeek')),endWeek:Number(get('endWeek')),parity:get('parity'),roomId:'',color:'purple'};
              if(!c.title||!c.location||c.start>=c.end||c.startWeek>c.endWeek)throw Error('请检查课程名、教室、起止钟点和周次，结束必须晚于开始。');
              return c;
            });
            if(!courses.length)throw Error('请至少选择一门课程。');
            pending=true;try{onCommit(courses);}finally{pending=false;}
          }catch(e){error.textContent=e.message;}
        });
      }catch(e){error.textContent=e.message;}
    });
    if(supplied)root.querySelector('#html-course-parse').click();
    return ()=>{revision++;source.value='';output.replaceChildren();};
  }
  window.CampusScheduleHTML=Object.freeze({parse,shell,mount,courseClock});
})();
