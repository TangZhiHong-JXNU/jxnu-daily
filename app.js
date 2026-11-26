'use strict';
(() => {
  // 数据适配层：经典 data.js 支持 file://；公开副本仅附空白种子，个人 JSON 从界面导入。
  const seed = window.CAMPUS_DATA;
  const config = seed.campus.config;
  const $ = (s) => document.querySelector(s);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = x => JSON.parse(JSON.stringify(x));
  const pad = n => String(n).padStart(2, '0');
  const localDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dateAt = (offset = 0) => { const d = new Date(); d.setDate(d.getDate()+offset); return localDate(d); };
  const weekDay = d => d.getDay() || 7;
  const days = ['一','二','三','四','五','六','日'];
  const id = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const minutes = t => Number(t.slice(0,2))*60 + Number(t.slice(3));
  const timeValid = t => typeof t === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t);
  const dateValid = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && localDate(new Date(`${d}T12:00:00`)) === d;
  const rangeValid = (a,b) => timeValid(a) && timeValid(b) && minutes(a) < minutes(b);
  const textValid = (s,max=120) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
  let storageOK = true;
  function storageWarning() {
    storageOK = false;
    $('#storage-warning').hidden = false;
    $('#storage-warning').textContent = '浏览器本地存储不可用：本次修改仅留在当前页面，关闭后会丢失。请使用数据导出备份。';
  }
  function read(key) { try { return localStorage.getItem(key); } catch { storageWarning(); return null; } }
  function write(key,value) { try { localStorage.setItem(key,value); return true; } catch { storageWarning(); return false; } }
  try { localStorage.setItem(`${config.storageKey}.probe`,'1'); localStorage.removeItem(`${config.storageKey}.probe`); } catch { storageWarning(); }
  const freshTimer = (duration=25, mode='focus') => ({duration,mode,remaining:duration*60000,deadline:null,finished:false,round:1,phase:mode==='focus'?'focus':'short',sessionId:'',taskId:'',taskTitle:''});
  const scheduleRules = window.CampusScheduleRules;
  if(!scheduleRules)throw Error('课程日期规则未加载，请刷新页面。');
  function coursesOn(date,classes=state.classes,termStart=state.settings.termStart,rules=state.scheduleRules){return scheduleRules.resolve({classes,termStart,rules},date);}
  const freshPlan = () => ({focus:25,short:5,long:15,rounds:4,target:'',palette:'iris',autoNext:false,endNotice:true});
  function planValid(p) {return p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).length===8&&Object.keys(p).every(k=>['focus','short','long','rounds','target','palette','autoNext','endNotice'].includes(k))&&['focus','short','long'].every(k=>Number.isInteger(p[k])&&p[k]>=1&&p[k]<=180)&&Number.isInteger(p.rounds)&&p.rounds>=1&&p.rounds<=12&&typeof p.target==='string'&&p.target.length<=120&&['iris','lagoon','apricot','rose'].includes(p.palette)&&typeof p.autoNext==='boolean'&&typeof p.endNotice==='boolean';}
  const schoolCalendar = config.schoolCalendar;
  const defaultTerm = () => schoolCalendar.termStart;
  const weekFields = o => ({startWeek:o.startWeek??1,endWeek:o.endWeek??30,parity:o.parity??'all'});
  const weekValid = o => Number.isInteger(o.startWeek)&&Number.isInteger(o.endWeek)&&o.startWeek>=1&&o.endWeek<=60&&o.startWeek<=o.endWeek&&['all','odd','even'].includes(o.parity);
  function semesterWeek(date) { const d=new Date(`${date}T12:00:00`), start=new Date(`${state.settings.termStart}T12:00:00`);return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(start.getFullYear(),start.getMonth(),start.getDate()))/604800000)+1; }
  function occurs(o,date) {const w=semesterWeek(date);return w>=o.startWeek&&w<=o.endWeek&&(o.parity==='all'||w%2===(o.parity==='odd'?1:0));}
  const weekLabel = o => `${o.startWeek}–${o.endWeek}周 · ${{all:'每周',odd:'单周',even:'双周'}[o.parity]}`;
  const hydrationIntervals = [30,60,90,120];
  const hydrationVolumes = [100,200,250,300,500];
  const hydrationLimit = 10000;
  const freshHydration = () => ({enabled:false,interval:60,start:'09:00',end:'21:00',volume:250,notifications:false,records:[]});
  const dashboardCards = [['courses','今日课程'],['timeline','今日时间线'],['calendar','校历小窗口'],['focus','一小段专注'],['shortcuts','校园捷径'],['tip','今日小提醒']];
  const freshDashboard = () => ({order:dashboardCards.map(([key])=>key),hidden:[]});
  const navs = [ ['home','工作台','home'],['schedule','周课表','calendar'],['services','校园服务','grid'],['focus','专注','clock'],['notices','通知','bell'],['circle','生活圈','circle'],['profile','我的','person'] ];
  const serviceCatalog = [
    ['campus-code','校园码','grid','data-action="campus-code-guide"'],
    ['campus-map','校园地图','building','data-action="campus-map"'],
    ['schedule','周课表','calendar','data-nav="schedule"','schedule'],
    ['notices','考试作业','bell','data-nav="notices"','notices'],
    ['electricity','电费详情','grid','data-campus-electricity'],
    ['library','图书馆官网 ↗','building','href="https://tsg.jxnu.edu.cn/" target="_blank" rel="noopener noreferrer"'],
    ['focus','专注','clock','data-nav="focus"','focus'],
    ['calendar','校历','calendar','data-action="school-calendar"'],
    ['hydration','喝水提醒','person','data-action="hydration-settings"'],
    ['circle','生活圈','circle','data-nav="circle"','circle'],
    ['academic','教务在线 ↗','building','href="https://jwc.jxnu.edu.cn/" target="_blank" rel="noopener noreferrer"'],
    ['official-electricity','官方电费指引','grid','data-action="official-electricity-guide"'],
    ['resources','学习资料','building','data-action="resources"'],
    ['sports','闪动校园指引','person','data-action="sports-guide"'],
    ['hall','一站式服务大厅 ↗','grid','href="https://e.jxnu.edu.cn/main.html" target="_blank" rel="noopener noreferrer"'],
    ['student-affairs','智慧学工 ↗','person','href="https://zhxg.jxnu.edu.cn/" target="_blank" rel="noopener noreferrer"'],
    ['vpn','学校 VPN ↗','grid','href="https://vpn.jxnu.edu.cn/" target="_blank" rel="noopener noreferrer"'],
    ['university','学校官网 ↗','building','href="https://www.jxnu.edu.cn/" target="_blank" rel="noopener noreferrer"'],
    ['youth','校团委 ↗','person','href="https://tw.jxnu.edu.cn/" target="_blank" rel="noopener noreferrer"'],
    ['sources','服务来源','grid','data-action="service-status"'],
    ['profile','我的设置','person','data-nav="profile"','profile'],
    ['freshman-guide','新生入学指南','building','data-action="freshman-guide"']
  ];
  const freshServicePins = () => [];
  function validateServicePins(pins) {
    if(!Array.isArray(pins)||pins.length>6||new Set(pins).size!==pins.length||!pins.every(key=>typeof key==='string'&&serviceCatalog.some(s=>s[0]===key)))throw Error('常用服务无效：仅允许现有白名单 ID，不可重复，最多 6 个。');
    return [...pins];
  }
  function servicePinsModal() {
    openModal('设置常用服务',`<form id="service-pins-form"><p>最多置顶 6 个，按下列清单顺序显示；仅本机保存，纳入 JSON 备份，不登录或同步。取消不写入。隐藏的导航页不会因置顶恢复或出现在置顶区。</p><div class="page-editor">${serviceCatalog.map(([key,label])=>`<label><input type="checkbox" name="pin" value="${key}" ${state.servicePins.includes(key)?'checked':''}> ${label}</label>`).join('')}</div><p class="subtle">恢复默认会取消全部置顶，保留原服务清单；点击保存后生效。</p><p class="form-error" role="alert"></p><div class="toolbar"><button type="button" data-action="service-pins-default">恢复默认（待保存）</button><button type="button" data-action="close">取消</button><button class="primary" type="submit">保存到本机</button></div></form>`);
  }
  const fixedPages = ['home','profile'];
  const freshNavigation = () => ({hidden:[]});
  function navigationSettingsModal() {
    openModal('管理页面',`<p>勾选显示，取消勾选仅隐藏导航，不删除记录。工作台与我的始终保留；其他链接仍可临时查看隐藏页。</p><div class="page-editor">${navs.map(([key,label])=>`<label><input type="checkbox" data-page-visible="${key}" ${state.navigation.hidden.includes(key)?'':'checked'} ${fixedPages.includes(key)?'disabled':''}> ${label}${fixedPages.includes(key)?'（固定）':''}</label>`).join('')}</div><button data-action="navigation-reset">恢复全部页面（需确认）</button><p class="subtle">即时保存；可随时在“我的”恢复。首页卡片另用“整理工作台”。</p>`);
  }
  function saveNavigation() {
    const persisted=save();
    if(state.navigation.hidden.includes(view)){location.hash='home';navigate('home');}else render();
    savedFeedback(persisted,'页面导航已更新。');
  }
  function updateNavigation(key,visible) {
    if(typeof visible!=='boolean'||fixedPages.includes(key)||!navs.some(n=>n[0]===key))return;
    state.navigation.hidden=visible?state.navigation.hidden.filter(k=>k!==key):[...new Set([...state.navigation.hidden,key])];
    saveNavigation();
  }
  // JSON 交换文件统一按 UTF-8 字节计量；不等同于浏览器本地存储配额。
  const backupMaxBytes = 16 * 1024 * 1024;
  function checkBackupSize(value) {
    if(new Blob([value]).size>backupMaxBytes)throw Error('JSON 备份超过 16 MiB（UTF-8 字节）安全上限；导入和导出均受此限制，请先精简数据。');
  }
  function parseArchive(text) {
    const value=JSON.parse(text),stack=[];
    for(const match of text.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]]/g)){
      const token=match[0];
      if(token==='{')stack.push(new Set());
      else if(token==='[')stack.push(null);
      else if(token==='}'||token===']')stack.pop();
      else if(text.slice(match.index+token.length).trimStart().startsWith(':')){
        const key=JSON.parse(token),keys=stack[stack.length-1];
        if(keys.has(key))throw Error('JSON 包含重复字段。');
        keys.add(key);
      }
    }
    return value;
  }
  function dashboardSettingsModal() {
    const d=state.dashboard;
    openModal('整理工作台',`<p>勾选显示，按列表顺序排列；自动保存到本机，纳入 JSON 备份。天气与时段顶栏始终保留。喝水仍由独立开关控制，此处不会开启或展示喝水记录。</p><div class="dashboard-editor">${d.order.map((key,i)=>`<div class="dashboard-editor-row"><label><input type="checkbox" data-dashboard-visible="${key}" ${d.hidden.includes(key)?'':'checked'}> ${dashboardCards.find(c=>c[0]===key)[1]}</label><button data-dashboard-move="${key}" data-direction="-1" ${i===0?'disabled':''} aria-label="上移${dashboardCards.find(c=>c[0]===key)[1]}">上移</button><button data-dashboard-move="${key}" data-direction="1" ${i===d.order.length-1?'disabled':''} aria-label="下移${dashboardCards.find(c=>c[0]===key)[1]}">下移</button></div>`).join('')}</div><button data-action="dashboard-reset">恢复默认布局（需确认）</button><p class="subtle">只调整首页卡片，不删除课程或记录，不修改学期、通知、专注和喝水设置。</p>`);
  }
  function updateDashboard(key, value) {
    if(!dashboardCards.some(c=>c[0]===key))return;
    const d=state.dashboard;
    if(typeof value==='boolean')d.hidden=value?d.hidden.filter(k=>k!==key):[...new Set([...d.hidden,key])];
    else {const i=d.order.indexOf(key),j=i+value;if(![-1,1].includes(value)||j<0||j>=d.order.length)return;[d.order[i],d.order[j]]=[d.order[j],d.order[i]];}
    const persisted=save();render();dashboardSettingsModal();savedFeedback(persisted,'首页布局已更新。');
  }
  const scheduleBackgrounds = [['plain','跟随界面主题'],['mist','雾蓝渐变'],['forest','林间渐变'],['violet','紫雾渐变']];
  const campusScenes = [['landscape','校园画册','红砖建筑与湖面'],['lake','静湖日光','湖岸、桥与树影'],['sports','放学后的天空','足球场、篮球场与大天空']];
  const colorModes = [['campus','时段淡彩（默认）'],['light','固定浅色'],['dark','固定深色'],['system','跟随系统'],['midnight','午夜蓝'],['pine','墨绿'],['violet','紫夜']];
  const freshAppearance = () => ({period:'auto',background:'landscape',color:'campus',motion:'system',scheduleBackground:'plain',fontScale:'100',scheduleImage:'',scheduleMask:'70',themeVersion:1});
  function validScheduleImage(value) {
    if(value==='')return true;
    if(typeof value!=='string'||value.length>420000||!/^data:image\/jpeg;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))return false;
    try{const info=rasterInfo(Uint8Array.from(atob(value.split(',')[1]),c=>c.charCodeAt(0)));return info.type==='image/jpeg'&&info.width>0&&info.height>0&&info.width<=1440&&info.height<=1440;}catch{return false;}
  }
  function appearanceValid(a) {return a&&typeof a==='object'&&!Array.isArray(a)&&['period','background','color','motion'].every(k=>Object.hasOwn(a,k))&&Object.keys(a).every(k=>['period','background','color','motion','scheduleBackground','fontScale','scheduleImage','scheduleMask','themeVersion'].includes(k))&&['auto','0','1','2','3','4','5'].includes(a.period)&&['landscape','lake','sports','solid'].includes(a.background)&&colorModes.some(([key])=>key===a.color)&&['system','moderate','reduce'].includes(a.motion)&&(a.scheduleBackground===undefined||scheduleBackgrounds.some(([key])=>key===a.scheduleBackground))&&(a.fontScale===undefined||['90','100','110','120'].includes(a.fontScale))&&(a.scheduleMask===undefined||['45','60','70','85'].includes(a.scheduleMask))&&(a.scheduleImage===undefined||validScheduleImage(a.scheduleImage))&&(a.themeVersion===undefined||a.themeVersion===1);}
  const profilePresets = [['local','本','本机'],['leaf','芽','新芽'],['sky','晴','晴空'],['night','月','月色']];
  const profileImageLimit = 120000;
  const freshProfile = () => ({nickname:'本机访客',customId:'',avatar:{kind:'preset',value:'local'}});
  function rasterInfo(bytes) {
    const u32=i=>((bytes[i]*16777216)+(bytes[i+1]<<16)+(bytes[i+2]<<8)+bytes[i+3]);
    if(bytes.length>=24&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)&&u32(8)===13&&String.fromCharCode(...bytes.slice(12,16))==='IHDR')return {type:'image/png',width:u32(16),height:u32(20)};
    if(bytes[0]===255&&bytes[1]===216){
      let i=2;
      while(i+3<bytes.length){
        if(bytes[i++]!==255)break;
        while(bytes[i]===255)i++;
        const marker=bytes[i++];if(marker===217||marker===218)break;
        const size=(bytes[i]<<8)+bytes[i+1];if(size<2||i+size>bytes.length)break;
        if([192,193,194].includes(marker)&&size>=8)return {type:'image/jpeg',width:(bytes[i+5]<<8)+bytes[i+6],height:(bytes[i+3]<<8)+bytes[i+4]};
        i+=size;
      }
    }
    if(bytes.length>=30&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'){
      const tag=String.fromCharCode(...bytes.slice(12,16)),le24=i=>bytes[i]+bytes[i+1]*256+bytes[i+2]*65536;
      if(tag==='VP8X')return {type:'image/webp',width:le24(24)+1,height:le24(27)+1};
      if(tag==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42)return {type:'image/webp',width:((bytes[27]<<8)+bytes[26])&16383,height:((bytes[29]<<8)+bytes[28])&16383};
      if(tag==='VP8L'&&bytes[20]===47)return {type:'image/webp',width:1+(((bytes[22]&63)<<8)|bytes[21]),height:1+((bytes[24]&15)<<10|(bytes[23]<<2)|(bytes[22]>>6))};
    }
    throw Error('图片内容无效，仅支持 JPG、PNG、WebP，不接受 SVG 或远程 URL。');
  }
  function validateProfile(p) {
    const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(o,k));
    if(!exact(p,['nickname','customId','avatar'])||typeof p.nickname!=='string'||p.nickname!==p.nickname.trim()||![...p.nickname].length||[...p.nickname].length>20||/[\u0000-\u001f\u007f-\u009f]/.test(p.nickname)||typeof p.customId!=='string'||(p.customId!==''&&!/^[A-Za-z0-9_-]{3,24}$/.test(p.customId))||!exact(p.avatar,['kind','value']))throw Error('本机资料无效：昵称须为 1–20 字符，ID 可空或为 3–24 位英文、数字、下划线、短横线；不接受未知字段。');
    const a=p.avatar;
    if(a.kind==='preset'){
      if(!profilePresets.some(([key])=>key===a.value))throw Error('请选择有效的预设头像。');
    }else if(a.kind==='image'){
      if(typeof a.value!=='string'||a.value.length>profileImageLimit||!/^data:image\/(jpeg|png);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(a.value))throw Error('头像须为长度不超过 120000 的 JPEG/PNG data URL。');
      const info=rasterInfo(Uint8Array.from(atob(a.value.split(',')[1]),c=>c.charCodeAt(0)));
      if(!a.value.startsWith(`data:${info.type};base64,`)||!['image/jpeg','image/png'].includes(info.type)||info.width<1||info.height<1||info.width>256||info.height>256)throw Error('存档头像须为不超过 256×256 的 JPEG/PNG。');
    }else throw Error('头像类型无效。');
    return {nickname:p.nickname,customId:p.customId,avatar:{kind:a.kind,value:a.value}};
  }
  const marketCategories = ['教材书籍','数码电子','生活用品','服饰鞋包','运动户外','其他'];
  const marketConditions=['全新未用','近新','正常使用痕迹','明显使用痕迹','需维修'];
  const marketStatuses=['在架','已下架','已转出'];
  const exactKeys=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
  function safeLocalText(value,max,optional=false){return typeof value==='string'&&value===value.trim()&&value.length<=max&&(optional||value.length>0)&&!/[\u0000-\u001f\u007f-\u009f]|(?:\d[ -]?){7,}|https?:\/\/|微信|手机号|身份证|密码|QQ号|宿舍号/i.test(value);}
  function validateMarketItem(m){
    if(!exactKeys(m,['id','local','title','category','condition','price','description','status'])||!textValid(m.id,100)||m.local!==true||!safeLocalText(m.title,80)||!marketCategories.includes(m.category)||!marketConditions.includes(m.condition)||!Number.isSafeInteger(m.price)||m.price<0||m.price>10000000||!safeLocalText(m.description,500)||!marketStatuses.includes(m.status))throw Error('闲置记录无效：请检查分类、成色、人民币价格和状态；不填写联系方式、个人信息或链接。');
    return {...m};
  }
  const resourceKinds=['培养方案','真题','模拟','笔记'];
  const publicSubjects=['数学分析','高等数学','线性代数','大学英语','其他公共课','专业课'];
  function resourceURL(value){try{const u=new URL(value);return !value.includes('\\')&&/^https?:\/\//i.test(value)&&/^https?:$/.test(u.protocol)&&!u.username&&!u.password&&!!u.hostname&&!/^https?:\/\/[^/]*[\\\s]/i.test(value)&&!/[\u0000-\u0020\u007f]/.test(value);}catch{return false;}}
  function validateResource(r){
    if(!exactKeys(r,['id','title','kind','subject','college','year','major','source','url','license','shareable'])||!textValid(r.id,100)||!safeLocalText(r.title,100)||!resourceKinds.includes(r.kind)||!publicSubjects.includes(r.subject)||!safeLocalText(r.college,40,true)||!safeLocalText(r.year,30)||!safeLocalText(r.major,60,true)||!safeLocalText(r.source,100)||!safeLocalText(r.license,200)||typeof r.url!=='string'||r.url.length>1000||!resourceURL(r.url)||r.shareable!==true||(r.kind==='培养方案'&&!r.major)||/\.(?:pdf|zip|rar|7z)(?:$|[?#])/i.test(r.url))throw Error('资料索引无效：仅收录可合法分享的 HTTP/HTTPS 网页，填写来源、年份及授权说明；不要填写密码、联系方式或个人信息。');
    return {...r};
  }
  const lostCategories = ['证件卡片','数码设备','钥匙','书本文具','衣物随身物品','其他'];
  const lostStatuses = type => type==='lost'?['寻找中','已找回']:['待认领','待人工核验','已认领'];
  const lostStatusLabel = item => item.status==='已解决'?(item.type==='lost'?'已找回':'已认领'):item.type==='lost'&&['待认领','待人工核验'].includes(item.status)?'寻找中':item.type!=='lost'&&item.status==='寻找中'?'待认领':item.status;
  function circleItemCategory(item,kind=circleFilter) {
    const categories=kind==='market'?marketCategories:lostCategories;
    if(categories.includes(item.category))return item.category;
    if(kind==='market')return ({'书籍资料':'教材书籍','学习用品':/教材|书籍/.test(item.title)?'教材书籍':'生活用品','日用品':'生活用品'})[item.category]||'其他';
    if(kind!=='lost')return item.category;
    if(/钥匙/.test(item.title))return '钥匙';
    if(/耳机|手机|数码|充电/.test(item.title))return '数码设备';
    return ({'证件':'证件卡片','学习用品':'书本文具','日用品':'衣物随身物品'})[item.category]||'其他';
  }
  // 补充条目仅在内存展示，不写入、导出或注入旧个人存档。
  const circleDemo = {
    market:[['数码电子','闲置键盘'],['服饰鞋包','帆布鞋'],['运动户外','羽毛球拍'],['其他','手工装饰摆件']].map(([category,title],i)=>({id:`circle-demo-market-${i}`,category,title:`${title}（虚构演示）`,place:'示例公共区域',description:'仅用于分类浏览的虚构只读样例，不交易、不联系、不代表真实用户。'})),
    lost:[['数码设备','蓝色耳机盒','lost','寻找中'],['钥匙','圆环钥匙串','found','待认领'],['书本文具','空白笔记本','lost','已找回'],['其他','拼图配件盒','found','已认领']].map(([category,title,type,status],i)=>({id:`circle-demo-lost-${i}`,category,title:`${title}（虚构演示）`,type,status,local:false,place:'示例公共区域',description:'仅供分类与状态展示，无真实失主、联系方式或认领业务。'}))
  };
  function initialState() {
    const state = clone(seed);
    state.classes = state.classes.map(c => { c.day = c.day ?? ((weekDay(new Date())-1+c.dayOffset)%7)+1; delete c.dayOffset; return c; });
    state.tasks = state.tasks.map(t => { t.date = dateAt(t.dayOffset); delete t.dayOffset; return t; });
    state.schemaVersion=2;
    state.settings={termStart:seed.settings?.termStart||defaultTerm(),lowBalance:20,notifications:false};
    state.classes=state.classes.map(c=>({...c,...weekFields(c)}));
    state.occupancy=state.occupancy.map(o=>({...o,...weekFields(o)}));
    state.tasks=state.tasks.map(t=>({...t,type:t.type??'deadline',origin:'demo',reminded:[]}));
    state.lost_items=state.lost_items.map(l=>({...l,type:'found',local:false}));
    state.focus={timer:freshTimer(),records:[],phases:[],plan:freshPlan()};
    state.scheduleRules=scheduleRules.empty();
    state.electricityRecords=[];
    // 固定截图只是待载入素材，不自动成为个人记录。
    state.electricitySnapshot=null;
    state.hydration=freshHydration();
    state.dashboard=freshDashboard();
    state.navigation=freshNavigation();
    state.servicePins=freshServicePins();
    state.appearance=freshAppearance();
    state.profile=freshProfile();
    state.resources=[];
    state.seedDate = dateAt();
    return state;
  }
  // 导入只接受业务字段；配置、教学楼与资源引用由可信本地配置控制。
  function validateState(input) {
    if (!input || typeof input !== 'object' || ![1,2].includes(input.schemaVersion)) throw Error('不支持的数据版本，需要 schemaVersion: 1 或 2。');
    const v2=input.schemaVersion===2;
    const object=o=>o&&typeof o==='object'&&!Array.isArray(o);
    const allowed=(o,keys)=>{if(!object(o)||Object.keys(o).some(k=>!keys.includes(k)))throw Error('数据包含未知字段或无效对象。');};
    allowed(input,['schemaVersion','campus','rooms','occupancy','classes','tasks','weather','lost_items','market_items','campus_jobs','electricity','seedDate','settings','focus','electricityRecords','electricitySnapshot','hydration','dashboard','appearance','navigation','profile','servicePins','resources','scheduleRules']);
    const out = initialState();
    const checkList = (key, max) => { if (!Array.isArray(input[key]) || input[key].length > max) throw Error(`${key} 必须是数组，且不超过 ${max} 条。`); };
    ['classes','tasks','lost_items'].forEach(k=>checkList(k,1000));
    const unique = list => new Set(list.map(x=>x.id)).size === list.length;
    const roomIds = new Set(seed.rooms.map(r=>r.id));
    out.classes = input.classes.map(c => {
      allowed(c,['id','title','day','dayOffset','start','end','roomId','location','color','startWeek','endWeek','parity']);
      const wf=weekFields(c);if(!weekValid(wf))throw Error('课程周次无效。');
      const day = c.day === undefined && Number.isInteger(c.dayOffset) && c.dayOffset>=0 && c.dayOffset<=6 ? ((weekDay(new Date())-1+c.dayOffset)%7)+1 : c.day;
      if (!textValid(c.id,100)||!textValid(c.title)||!Number.isInteger(day)||day<1||day>7||!rangeValid(c.start,c.end)||!(roomIds.has(c.roomId)||(c.roomId===''&&textValid(c.location,100)))||(c.location!==undefined&&!textValid(c.location,100))) throw Error('课程字段无效：检查名称、星期、起止时间与教室。');
      return {...wf,id:c.id,title:c.title.trim(),day,start:c.start,end:c.end,roomId:c.roomId,...(c.location?{location:c.location.trim()}:{}),color:['purple','blue','orange','green'].includes(c.color)?c.color:'purple'};
    });
    out.tasks = input.tasks.map(t => {
      allowed(t,['id','title','date','dayOffset','time','source','done','origin','reminded','type','startTime','endTime']);
      const type=t.type===undefined?'deadline':t.type;
      if(!['deadline','block'].includes(type))throw Error('任务类型无效。');
      if(type==='block'&&(!rangeValid(t.startTime,t.endTime)||t.time!==t.endTime))throw Error('时段安排须为同日有效区间，结束晚于开始，time 必须等于 endTime。');
      if(type==='deadline'&&(t.startTime!==undefined||t.endTime!==undefined))throw Error('截止待办不能包含时段字段。');
      if(v2&&(!['manual','demo'].includes(t.origin)||!Array.isArray(t.reminded)||t.reminded.length>2||!t.reminded.every(x=>['early','due'].includes(x))))throw Error('任务来源或提醒记录无效。');
      const date = t.date === undefined && Number.isInteger(t.dayOffset) && Math.abs(t.dayOffset)<=365 ? dateAt(t.dayOffset) : t.date;
      if (!textValid(t.id,100)||!textValid(t.title)||!dateValid(date)||!timeValid(t.time)||!['学习通','考试','学业','个人'].includes(t.source)||typeof t.done!=='boolean') throw Error('待办字段无效：检查日期、时间、来源与完成状态。');
      return {id:t.id,title:t.title.trim(),type,date,time:t.time,...(type==='block'?{startTime:t.startTime,endTime:t.endTime}:{}),source:t.source,done:t.done,origin:t.origin||'demo',reminded:t.reminded||[]};
    });
    out.lost_items = input.lost_items.map(l => {
      allowed(l,['id','title','category','place','description','question','answer','hint','status','type','local']);
      if(v2&&(!['lost','found'].includes(l.type)||typeof l.local!=='boolean'))throw Error('失物类型或归属无效。');
      if (!textValid(l.id,100)||!textValid(l.title,80)||!textValid(l.category,30)||!textValid(l.place,100)||!textValid(l.description,500)||!textValid(l.question,160)||!textValid(l.answer,80)||!textValid(l.hint,160)||!['待认领','待人工核验','寻找中','已解决','已找回','已认领'].includes(l.status)) throw Error('失物字段无效：请检查文本长度及状态。');
      const type=l.type||'found';
      if((l.status==='已找回'&&type!=='lost')||(l.status==='已认领'&&type!=='found'))throw Error('失物状态与类型不匹配。');
      return {type,local:l.local??false,id:l.id,title:l.title.trim(),category:l.category,place:l.place,description:l.description,question:l.question,answer:l.answer.trim(),hint:l.hint,status:lostStatusLabel({...l,type})};
    });
    if(input.market_items!==undefined){
      checkList('market_items',1000);
      out.market_items=input.market_items.map(m=>{
        if(m?.local===true){if(seed.market_items.some(s=>s.id===m.id)||m.id.startsWith('circle-demo-'))throw Error('个人闲置 ID 不得占用演示记录。');return validateMarketItem(m);}
        const original=seed.market_items.find(s=>s.id===m?.id);
        if(!original||!exactKeys(m,Object.keys(original))||Object.keys(original).some(k=>original[k]!==m[k]))throw Error('虚构闲置示例为只读，不能修改或伪装为个人记录。');
        return clone(original);
      });
      if(!unique(out.market_items))throw Error('闲置 ID 重复。');
    }
    if(input.resources!==undefined){checkList('resources',1000);out.resources=input.resources.map(validateResource);if(!unique(out.resources))throw Error('资料 ID 重复。');}
    if (![out.classes,out.tasks,out.lost_items].every(unique)) throw Error('同一列表不能出现重复 ID。');
    if (Array.isArray(input.occupancy)) {
      checkList('occupancy',5000);
      out.occupancy = input.occupancy.map(o => {
        allowed(o,['roomId','days','start','end','startWeek','endWeek','parity']);
        if(!weekValid(weekFields(o)))throw Error('占用周次无效。');
        if (!roomIds.has(o.roomId)||!Array.isArray(o.days)||!o.days.length||!o.days.every(d=>Number.isInteger(d)&&d>=1&&d<=7)||!rangeValid(o.start,o.end)) throw Error('全量占用表字段无效。');
        return {...weekFields(o),roomId:o.roomId,days:[...new Set(o.days)],start:o.start,end:o.end};
      });
    }
    // 旧版若已存有设置，同样校验并保留，不因新增校历静默重置。
    if(v2||input.settings!==undefined){
      allowed(input.settings,['termStart','lowBalance','notifications']);
      if(!dateValid(input.settings.termStart)||input.settings.termStart<'2000-01-01'||input.settings.termStart>'2100-12-31'||!Number.isFinite(input.settings.lowBalance)||input.settings.lowBalance<0||input.settings.lowBalance>100000||typeof input.settings.notifications!=='boolean')throw Error('设置字段无效。');
      out.settings={...input.settings};
    }
    if(v2){
      allowed(input.focus,['timer','records','plan','phases']);allowed(input.focus.timer,['duration','mode','remaining','deadline','finished','round','phase','sessionId','taskId','taskTitle']);
      const plan=input.focus.plan===undefined?freshPlan():input.focus.plan;
      if(!planValid(plan))throw Error('专注方案字段无效。');
      const round=input.focus.timer.round===undefined?1:input.focus.timer.round,phase=input.focus.timer.phase===undefined?(input.focus.timer.mode==='focus'?'focus':'short'):input.focus.timer.phase;
      if(!Number.isInteger(round)||round<1||round>plan.rounds||!['focus','short','long'].includes(phase)||(phase==='focus')!==(input.focus.timer.mode==='focus'))throw Error('专注轮次或阶段无效。');
      const phases=input.focus.phases===undefined?[]:input.focus.phases;
      if(!Array.isArray(phases)||phases.length>10000)throw Error('阶段记录无效。');
      const phaseRecords=phases.map(r=>{allowed(r,['id','phase','round','minutes','completedAt','target']);if(!textValid(r.id,100)||!['focus','short','long'].includes(r.phase)||!Number.isInteger(r.round)||r.round<1||r.round>12||!Number.isInteger(r.minutes)||r.minutes<1||r.minutes>180||typeof r.completedAt!=='string'||!Number.isFinite(Date.parse(r.completedAt))||typeof r.target!=='string'||r.target.length>120)throw Error('阶段记录字段无效。');return {...r};});
      if(!unique(phaseRecords))throw Error('阶段记录 ID 重复。');
      const t=input.focus.timer;
      if(!Number.isInteger(t.duration)||t.duration<1||t.duration>180||!['focus','break'].includes(t.mode)||!Number.isSafeInteger(t.remaining)||t.remaining<0||t.remaining>t.duration*60000||(t.deadline!==null&&(!Number.isSafeInteger(t.deadline)||t.deadline<0||!Number.isFinite(new Date(t.deadline).getTime())||t.deadline>Date.now()+t.duration*60000+60000))||typeof t.finished!=='boolean'||(t.finished&&(t.deadline!==null||t.remaining!==0)))throw Error('番茄钟字段无效。');
      if(!Array.isArray(input.focus.records)||input.focus.records.length>10000)throw Error('专注记录过多或无效。');
      const records=input.focus.records.map(r=>{
        allowed(r,['id','date','minutes','completedAt','elapsedMs','taskId','taskTitle','outcome','decision']);
        if(!textValid(r.id,100)||!dateValid(r.date)||!Number.isFinite(r.minutes)||r.minutes<=0||r.minutes>180||typeof r.completedAt!=='string'||!Number.isFinite(Date.parse(r.completedAt)))throw Error('专注记录无效。');
        const modern=r.elapsedMs!==undefined;
        if(modern&&(!Number.isSafeInteger(r.elapsedMs)||r.elapsedMs<1000||r.elapsedMs>10800000||Math.abs(r.minutes-r.elapsedMs/60000)>.000001||typeof r.taskId!=='string'||r.taskId.length>100||typeof r.taskTitle!=='string'||r.taskTitle.length>120||!['complete','partial'].includes(r.outcome)||!['pending','kept','completed'].includes(r.decision)||(!r.taskId&&r.decision!=='kept')))throw Error('投入记录关联或时长无效。');
        if(!modern&&(!Number.isInteger(r.minutes)||r.taskId!==undefined||r.taskTitle!==undefined||r.outcome!==undefined||r.decision!==undefined))throw Error('旧专注记录字段无效。');
        return modern?{...r}:{...r,elapsedMs:r.minutes*60000,taskId:'',taskTitle:'',outcome:'complete',decision:'kept'};
      });
      const timerLink={sessionId:t.sessionId??'',taskId:t.taskId??'',taskTitle:t.taskTitle??''};
      if(Object.values(timerLink).some(x=>typeof x!=='string')||timerLink.sessionId.length>100||timerLink.taskId.length>100||timerLink.taskTitle.length>120||(!timerLink.taskId&&timerLink.taskTitle))throw Error('计时任务关联无效。');
      if(!t.finished&&timerLink.sessionId&&records.some(r=>r.id===timerLink.sessionId))throw Error('未结束会话的 sessionId 已存在于投入记录中。');
      checkList('electricityRecords',5000);
      out.electricityRecords=input.electricityRecords.map(r=>{allowed(r,['id','date','balance']);if(!textValid(r.id,100)||!dateValid(r.date)||!Number.isFinite(r.balance)||r.balance< -100000||r.balance>100000)throw Error('手工电费记录无效。');return {...r};});
      if(!unique(records)||!unique(out.electricityRecords))throw Error('记录 ID 重复。');
      out.focus={timer:{...t,round,phase,...timerLink},records,plan:{...plan},phases:phaseRecords};
    }
    if(input.electricitySnapshot!==undefined&&input.electricitySnapshot!==null)out.electricitySnapshot=validateElectricitySnapshot(input.electricitySnapshot);
    // hydration 可缺省，旧 schema 1/2 存档仍可完整迁移。
    if(input.hydration!==undefined){
      const h=input.hydration;
      allowed(h,['enabled','interval','start','end','volume','notifications','records']);
      if(typeof h.enabled!=='boolean'||typeof h.notifications!=='boolean'||!hydrationIntervals.includes(h.interval)||!rangeValid(h.start,h.end)||!hydrationVolumes.includes(h.volume)||!Array.isArray(h.records)||h.records.length>hydrationLimit)throw Error('喝水设置无效：检查间隔、同日起止时段、杯量及记录数量（最多10000条）。');
      const records=h.records.map(r=>{allowed(r,['id','date','ml']);if(!textValid(r.id,100)||!dateValid(r.date)||!hydrationVolumes.includes(r.ml))throw Error('喝水记录无效：检查 ID、真实日期和杯量。');return {id:r.id,date:r.date,ml:r.ml};});
      if(!unique(records))throw Error('喝水记录 ID 重复。');
      out.hydration={enabled:h.enabled,interval:h.interval,start:h.start,end:h.end,volume:h.volume,notifications:h.notifications,records};
    }
    if(input.dashboard!==undefined){
      const d=input.dashboard,keys=dashboardCards.map(c=>c[0]);
      allowed(d,['order','hidden']);
      if(!Array.isArray(d.order)||d.order.length!==keys.length||new Set(d.order).size!==keys.length||!d.order.every(k=>keys.includes(k))||!Array.isArray(d.hidden)||d.hidden.length>keys.length||new Set(d.hidden).size!==d.hidden.length||!d.hidden.every(k=>keys.includes(k)))throw Error('首页布局无效：排序必须完整且不重复，隐藏项只允许现有卡片。');
      out.dashboard={order:[...d.order],hidden:[...d.hidden]};
    }
    if(input.navigation!==undefined){
      allowed(input.navigation,['hidden']);
      const hidden=input.navigation.hidden,keys=[...navs.map(n=>n[0]).filter(k=>!fixedPages.includes(k)),'rooms'];
      if(!Array.isArray(hidden)||hidden.length>keys.length||new Set(hidden).size!==hidden.length||!hidden.every(k=>keys.includes(k)))throw Error('页面导航无效：隐藏项必须为不重复的现有可隐藏页面。');
      out.navigation={hidden:hidden.filter(k=>k!=='rooms')};
    }
    if(input.appearance!==undefined){
      if(!appearanceValid(input.appearance))throw Error('外观设置包含未知字段或无效选项。');
      out.appearance={...freshAppearance(),...input.appearance};
      // 用户改定默认风格：只升级旧版默认深色，不动固定浅色、系统及其他配色。
      // 新版手动选择深色带版本标记，刷新和备份恢复都保留；迁移不主动写盘。
      if(input.appearance.themeVersion===undefined&&input.appearance.color==='dark')out.appearance.color='campus';
    }
    if(input.scheduleRules!==undefined)out.scheduleRules=scheduleRules.validate(input.scheduleRules,out.classes);
    if(input.servicePins!==undefined)out.servicePins=validateServicePins(input.servicePins);
    if(input.profile!==undefined)out.profile=validateProfile(input.profile);
    out.schemaVersion=2;
    out.seedDate = dateValid(input.seedDate) ? input.seedDate : dateAt();
    return out;
  }
  let state = initialState(),focusMemoryDirty=false;
  const saved = read(config.storageKey);
  let protectedArchive = false;
  if (saved) { try { state = validateState(parseArchive(saved)); } catch {
    protectedArchive = true;
    storageOK = false;
    $('#storage-warning').hidden = false;
    $('#storage-warning').textContent = '原存档损坏或版本不兼容，已保护并禁止覆盖及导入。本页使用临时数据，修改仅留在当前页面，请导出备份；可在数据管理中另行导出原始存档。';
    toast('已加载临时种子；原存档受保护，不会被计时器、设置或导入覆盖。');
  } }
  function save() {
    const persisted=!protectedArchive&&write(config.storageKey,JSON.stringify(state));
    if(persisted){focusMemoryDirty=false;if($('#focus-save-warning'))$('#focus-save-warning').hidden=true;}
    return persisted;
  }
  function savedFeedback(persisted,message) {
    toast(persisted?`${message}已保存到本机。`:`${message}仅更新当前页面，未写入本机存档；关闭或刷新会丢失，请导出备份。`);
  }
  function persistReplacement(next) {
    if(protectedArchive)throw Error('原存档受保护，未替换当前数据；请先导出原始存档和当前临时数据。');
    if(!write(config.storageKey,JSON.stringify(next)))throw Error('本机保存失败，未替换当前页面数据或原存档；请检查存储空间或权限。');
    state=next;focusMemoryDirty=false;
  }
  const legacyPeriod=read(config.periodKey);
  // 旧档只在内存迁移，已含外观的 JSON 为唯一权威；periodKey 保留为兼容镜像。
  if(!saved||(!protectedArchive&&!Object.prototype.hasOwnProperty.call(JSON.parse(saved),'appearance')))state.appearance.period=/^[0-5]$/.test(legacyPeriod??'')?legacyPeriod:'auto';
  const systemColor=window.matchMedia?.('(prefers-color-scheme: dark)');
  const systemMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  function applyAppearance() {
    const a=state.appearance,root=document.querySelector('body');
    root.dataset.color=a.color==='system'?(systemColor?.matches?'dark':'light'):['light','campus'].includes(a.color)?'light':'dark';
    root.dataset.palette=a.color;
    root.dataset.scheduleBackground=a.scheduleBackground;
    root.dataset.fontScale=a.fontScale;
    root.dataset.scheduleImage=a.scheduleImage?'true':'false';
    root.style.setProperty('--font-scale',Number(a.fontScale)/100);
    root.style.setProperty('--schedule-wallpaper',a.scheduleImage?`url("${a.scheduleImage}")`:'none');
    root.style.setProperty('--schedule-mask',Number(a.scheduleMask)/100);
    root.dataset.background=a.background;
    root.dataset.motion=a.motion==='system'?(systemMotion?.matches?'reduce':'moderate'):a.motion;
    renderPeriod();
  }
  systemColor?.addEventListener('change',applyAppearance);systemMotion?.addEventListener('change',applyAppearance);
  function syncPeriodKey(){if(!protectedArchive)write(config.periodKey,state.appearance.period);}
  function appearanceModal() {
    const a=state.appearance;
    const select=(name,label,options)=>`<label class="field">${label}<select name="${name}">${options.map(([v,t])=>`<option value="${v}" ${a[name]===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
    openModal('外观设置',`<form id="appearance-form">${select('period','光影时段',[['auto','自动跟随本地时间'],...config.periods.map((p,i)=>[String(i),p.label])])}${select('background','校园场景',[...campusScenes.map(([id,name])=>[id,name]),['solid','简洁纯色']])}${select('color','界面色彩',colorModes)}${select('scheduleBackground','整张课表网格背景',scheduleBackgrounds)}${select('fontScale','字体大小',[['90','小 · 90%'],['100','标准 · 100%'],['110','大 · 110%'],['120','特大 · 120%']])}${select('scheduleMask','壁纸遮罩（越高越清晰）',[['45','45%'],['60','60%'],['70','70%（推荐）'],['85','85%']])}<label class="field">整张课表壁纸<input id="schedule-wallpaper-file" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"></label><p class="subtle">仅本机 JPG/PNG/WebP；最多 3 MiB、4096 单边及 1600 万像素，重编码至 1440 单边、420000 字符内。拒绝 SVG、远程 URL。不改变课程颜色；取消不写入。手机一屏课表可切换清晰阅读。</p><div id="wallpaper-preview" class="wallpaper-preview"></div><p id="wallpaper-status" role="status"></p><button type="button" data-action="wallpaper-default">恢复默认壁纸（待保存）</button>${select('motion','动画',[['system','尊重系统减少动画偏好（默认）'],['moderate','适度动画'],['reduce','减少动画']])}${actions('保存外观')}</form><p class="subtle">默认“时段淡彩”让全站底色、纸张卡片、按钮和课表随六时段变换：清晨米白、中午湖绿、下午暖黄、傍晚暖粉、晚上淡蓝、深夜浅紫，夜间仍保留浅色纸张阅读。可另选固定浅色、固定深色或跟随系统。课表默认承接时段底色，已有自定义渐变或本机壁纸优先保留，课程分类色不被统一覆盖。校园画册、静湖日光和放学后的天空使用三套随站点附带的 AI 新创作水彩，分别呈现建筑湖面、湖岸桥影与足球篮球场。六时段对应四幅主画，午后与深夜作细微光色变化；非实景精确复刻、非实时天气。手动时段改变景观与时段淡彩，不改变课程、待办的真实日期和时间。设置仅存本机并纳入 JSON 备份。</p>`);
  }
  let wallpaperDraft=null,wallpaperRequest=0;
  function clearWallpaperDraft(){wallpaperRequest++;wallpaperDraft=null;}
  function wallpaperPreview(){const el=$('#wallpaper-preview');if(el&&wallpaperDraft)el.style.setProperty('background-image',wallpaperDraft.image?`url("${wallpaperDraft.image}")`:'none');}
  async function selectWallpaper(input){
    const file=input.files?.[0];input.value='';if(!file||!wallpaperDraft)return;
    const draft=wallpaperDraft,request=++wallpaperRequest,form=$('#appearance-form');
    const current=()=>wallpaperDraft===draft&&request===wallpaperRequest&&$('#modal').open&&$('#appearance-form')===form;
    draft.busy=true;$('#wallpaper-status').textContent='正在校验并压缩壁纸…';
    try{
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||! /\.(jpe?g|png|webp)$/i.test(file.name)||file.size<1||file.size>3*1024*1024)throw Error('请选择 3 MiB 内的 JPG、PNG、WebP 本机图片。');
      const buffer=await file.arrayBuffer();if(!current())return;
      const info=rasterInfo(new Uint8Array(buffer));if(info.width<1||info.height<1||info.width>4096||info.height>4096||info.width*info.height>16000000)throw Error('图片尺寸超过安全限制。');
      const url=URL.createObjectURL(new Blob([buffer],{type:info.type}));let image;
      try{image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('图片解码失败。'));img.src=url;});}finally{URL.revokeObjectURL(url);}
      if(!current())return;
      const canvas=document.createElement('canvas'),scale=Math.min(1,1440/info.width,1440/info.height);canvas.width=Math.max(1,Math.round(info.width*scale));canvas.height=Math.max(1,Math.round(info.height*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('当前浏览器无法处理图片。');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
      let value;for(const quality of [.82,.65,.48,.32]){value=canvas.toDataURL('image/jpeg',quality);if(value.length<=420000)break;}
      canvas.width=canvas.height=1;
      if(!validScheduleImage(value))throw Error('压缩后仍超限，请选择更简单或更小的图片。');
      draft.image=value;wallpaperPreview();$('#wallpaper-status').textContent='已生成本机壁纸草稿，保存后生效。';
    }catch(e){if(current())$('#wallpaper-status').textContent=e.message;}
    finally{if(current())draft.busy=false;}
  }
  let weather = clone(seed.weather);
  const cachedWeather = read(config.weatherKey);
  if (cachedWeather) { try { const w=JSON.parse(cachedWeather); if (Number.isFinite(w.temperature)&&Number.isInteger(w.code)&&dateValid(w.observedAt?.slice(0,10))&&Number.isFinite(Date.parse(w.collectedAt))) weather={...w,mode:'cache'}; } catch { /* 无效天气缓存不影响离线界面。 */ } }
  let view = 'home', circleFilter = 'lost', noticeFilter = '全部', weatherBusy = false, lastWeatherAttempt = 0;
  let scheduleDate=dateAt(), taskQuery='', circleQuery='', circleCategory='全部', lostStatus='全部', lostType='全部', circleSource='全部';
  let scheduleMode='compact', scheduleDays=5;
  const scheduleMobile=window.matchMedia('(max-width:760px)');
  let scheduleFitObserver=null;
  function fitSchedule(){
    const body=$('.schedule-mobile .schedule-body');
    if(!body||!scheduleMobile.matches)return;
    // 使用文档坐标，滚动不会改变网格高度；极矮屏保留最低可读高度并允许纵向滚动。
    body.style.setProperty('--schedule-top',`${Math.ceil(body.getBoundingClientRect().top+window.scrollY)}px`);
  }
  window.addEventListener('resize',fitSchedule);
  scheduleMobile.addEventListener('change',()=>{if(view==='schedule')render();});
  let timer = state.focus.timer;
  const adapter = {load:validateState, snapshot:()=>clone(state), persist:save};
  const cloudPayload = () => clone({classes:state.classes,tasks:state.tasks,settings:{termStart:state.settings.termStart}});
  function validateCloudPayload(payload) {
    if(!payload || typeof payload!=='object' || Array.isArray(payload) || Object.keys(payload).sort().join(',')!=='classes,settings,tasks' || !payload.settings || typeof payload.settings!=='object' || Object.keys(payload.settings).join(',')!=='termStart')throw {localMessage:'云备份包含未知或缺失字段，已拒绝恢复。'};
    const candidate=initialState();candidate.classes=payload.classes;candidate.tasks=payload.tasks;candidate.settings.termStart=payload.settings.termStart;
    let checked;try{checked=validateState(candidate);}catch{throw {localMessage:'云备份未通过现有严格数据校验，未覆盖本机。'};}
    return {classes:checked.classes,tasks:checked.tasks,settings:{termStart:checked.settings.termStart}};
  }
  const cloudSync=window.CampusCloudSync?.attach({
    payload:cloudPayload, fingerprint:()=>JSON.stringify(cloudPayload()), validate:validateCloudPayload,
    protected:()=>protectedArchive||!storageOK,
    backup:exportData,
    apply:payload=>{
      if(protectedArchive||!storageOK)throw {localMessage:'本机存档受保护或不可写，恢复取消。'};
      const p=validateCloudPayload(payload),next=clone({...state,classes:p.classes,tasks:p.tasks,settings:{...state.settings,termStart:p.settings.termStart}});
      try{next.scheduleRules=scheduleRules.validate(next.scheduleRules,next.classes);}catch{throw {localMessage:'云课表与本机单课调课规则不匹配，未恢复、未清除记录。请先导出完整 JSON，再在规则管理中核对并撤销不再适用的规则后重试。'};}
      persistReplacement(next);timer=state.focus.timer;timerSaveFailed=false;render();
    }
  });
  const editButtons=(kind,item)=>`<div class="item-actions"><button data-edit="${kind}" data-id="${escape(item.id)}">编辑</button>${kind==='classes'?'':`<button class="danger" data-delete="${kind}" data-id="${escape(item.id)}">删除</button>`}</div>`;
  // 通用操作采用同一套 Tabler outlines；简称字标不混作用户身份。
  const icon = name => window.CampusIcons.icon(name);
  const roomName = (rid,location) => {if(location)return location;const r=seed.rooms.find(r=>r.id===rid);return r?`${r.building} ${r.name}`:'未知教室';};
  const empty = text => `<div class="empty">${escape(text)}</div>`;
  function toast(text) { $('#toast').textContent=text; $('#toast').classList.add('visible'); clearTimeout(toast.timeout); toast.timeout=setTimeout(()=>$('#toast').classList.remove('visible'),4000); }
  function updateNetwork() { const badge=$('#network');badge.textContent = navigator.onLine ? '在线' : '离线';badge.title='仅为浏览器网络提示，不代表云服务或站外入口可用；各项数据来源见服务状态。'; }
  const routeScroll=new Map();
  if(window.history&&'scrollRestoration' in window.history)window.history.scrollRestoration='manual';
  function navigate(next) {
    if(next==='mine')next='profile';
    if(next==='rooms'){next='services';location.hash='services';}
    const target=navs.some(n=>n[0]===next)?next:'home';
    // 相同路由的 hashchange 不重绘，避免替换刚恢复的焦点和滚动位置。
    if(target===view){if(!$('#content').children.length)render();return;}
    routeScroll.set(view,Number.isFinite(window.scrollY)?window.scrollY:0);
    view=target;render();
    const focusTarget=$('#page-title')||$('#content');
    if(focusTarget){focusTarget.setAttribute('tabindex','-1');focusTarget.focus({preventScroll:true});}
    window.scrollTo({top:routeScroll.get(view)||0,behavior:'instant'});
  }
  function render() {
    document.body.dataset.view=view;
    const brand=$('.brand-mark');if(brand&&!brand.querySelector('[data-brand-kind="folio"]'))brand.innerHTML=window.CampusBrand.mark('folio',false);
    const avatar=$('.topbar .avatar');if(avatar){avatar.innerHTML=state.profile.avatar.kind==='image'?`<img src="${escape(state.profile.avatar.value)}" alt="" width="36" height="36">`:state.profile.avatar.value==='local'?window.CampusBrand.mark('folio',false):escape((profilePresets.find(p=>p[0]===state.profile.avatar.value)||profilePresets[0])[1]);avatar.setAttribute('aria-label','我的：'+state.profile.nickname);}
    if(scheduleFitObserver){scheduleFitObserver.disconnect();scheduleFitObserver=null;}
    $('#navigation').innerHTML=navs.filter(([key])=>!state.navigation.hidden.includes(key)).map(([key,label,img])=>`<a href="#${key}" ${view===key?'aria-current="page"':''} class="${view===key?'active':''}">${icon(img)}<span>${label}</span></a>`).join('');
    $('#page-title').textContent=navs.find(n=>n[0]===view)[1] === '工作台' ? '校园工作台' : navs.find(n=>n[0]===view)[1];
    syncSidebarSummary();
    // 服务总览与详情都重建同一完整容器，不能只替换内层导致常用入口消失。
    $('#content').innerHTML=({home:homeView,focus:focusView,schedule:scheduleView,notices:noticesView,circle:circleView,services:servicesView,profile:profileView})[view]();
    if(view==='home') { renderPeriod(); renderTimer(); }
    applyAppearance();
    if(view==='profile'||view==='focus') renderTimer();
    if(view==='profile')cloudSync?.paint();
    if(view==='circle') renderLost(circleQuery);
    if(view==='notices') renderTasks();
    updateNetwork();
    if(view==='schedule'&&scheduleMobile.matches){
      fitSchedule();
      if(window.ResizeObserver){scheduleFitObserver=new ResizeObserver(fitSchedule);scheduleFitObserver.observe($('.schedule-mobile'));scheduleFitObserver.observe($('.topbar'));scheduleFitObserver.observe($('#storage-warning'));}
    }
  }
  // 沿用本地 时段壁纸_demo.html 的 periodIndex / orbPosition，边界由 config 维护。
  function periodIndex(hour) { return config.periods.findIndex(p=>p.start<p.end ? hour>=p.start&&hour<p.end : hour>=p.start||hour<p.end); }
  function orbPosition(index,hourFloat) {
    const dark=index>=4;
    const progress=dark?((hourFloat>=19?hourFloat-19:hourFloat+5)/10):Math.min(1,Math.max(0,(hourFloat-5)/14));
    return {x:10+progress*78,y:18+Math.pow(progress-.5,2)*100};
  }
  function renderPeriod() {
    const periodOverride=state.appearance.period==='auto'?null:Number(state.appearance.period);
    const now=new Date(), index=periodOverride===null?periodIndex(now.getHours()):periodOverride, p=config.periods[index];
    document.body.dataset.campusPeriod=p.id;
    document.querySelectorAll('[data-campus-scene]').forEach(b=>{const active=b.dataset.campusScene===state.appearance.background;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    if(!$('#hero')) return;
    const art=[0,1,1,2,3,3][index];
    document.querySelectorAll('[data-campus-frame]').forEach(el=>el.classList.toggle('is-visible',Number(el.dataset.campusFrame)===art));
    const orb=orbPosition(index,periodOverride===null?now.getHours()+now.getMinutes()/60:p.hour);
    $('#hero').dataset.period=p.id;
    $('#hero').style.setProperty('--orb-x',orb.x+'%'); $('#hero').style.setProperty('--orb-y',orb.y+'%');
    $('#hero-date').textContent=`${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 · 星期${days[weekDay(now)-1]} · ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    $('#hero-title').textContent=p.label+'，校园里的你'; $('#hero-greeting').textContent=p.greeting;
    $('#period-mode').textContent=periodOverride===null?'自动跟随设备本地时间':'手动光影预览 · 课表仍按真实时间';
    document.querySelectorAll('[data-period-index]').forEach(b=>{const active=b.dataset.periodIndex===(periodOverride===null?'auto':String(periodOverride)); b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  }
  function landscape() {
    return `<div class="campus-art" aria-hidden="true">${[0,1,2,3].map(i=>`<span class="campus-art-frame frame-${i}" data-campus-frame="${i}"></span>`).join('')}</div>`;
  }
  function weatherText(code) {
    if(code===0) return '晴'; if([1,2].includes(code))return '晴间多云'; if(code===3)return '阴'; if([45,48].includes(code))return '雾'; if([51,53,55,56,57].includes(code))return '毛毛雨'; if([61,63,65,66,67,80,81,82].includes(code))return '雨'; if([71,73,75,77,85,86].includes(code))return '雪'; if([95,96,99].includes(code))return '雷雨'; return '天气码 '+code;
  }
  function weatherView() {
    const hint=weather.temperature<16?'偏凉，记得带件外套':weather.temperature>28?'日间偏热，及时补水':'温度适宜，出门带件薄外套';
    const mode=weather.mode==='demo'?'虚构演示':weather.mode==='cache'?'历史缓存（非实时）':'联网获取（非校园实测）';
    return `<section class="weather-strip" aria-label="区域天气"><span class="weather-glyph" aria-hidden="true">☼</span><strong>${escape(weather.temperature)}°</strong><span>${escape(weatherText(weather.code))}<small> · ${hint}</small></span><div class="weather-meta"><small>${mode}<br>${weather.mode==='demo'?'固定样本 · 未采集':`观测 ${escape(weather.observedAt)}<br>采集 ${escape(new Date(weather.collectedAt).toLocaleString())}`}</small><button class="text-button" data-action="weather" ${weatherBusy?'disabled':''}>${weatherBusy?'请求中…':'手动更新'} ↻</button></div><small>Open-Meteo · ${escape(config.weatherLocation.label)}</small></section>`;
  }
  // 仅给用户明确确认过的课程加小便签，不据此申请通知或修改课表数据。
  function courseComputerNote(c) {return /Auto\s*CAD|计算机制图|计算机绘图|(?:^|[^A-Za-z])C\s*语言/i.test(c.title)?'<span class="course-note-stamp" aria-label="课程小提醒：记得带电脑">记得<br>带电脑</span>':'';}
  function courseView(c) {
    return `<div class="course"><div class="course-time"><strong>${escape(c.start)}</strong>${escape(c.end)}</div><div class="course-info ${escape(c.color)}"><h3>${escape(c.title)}</h3><small>${escape(roomName(c.roomId,c.location))} · ${weekLabel(c)}${c.ruleLabel?' · '+escape(c.ruleLabel):''} · 本机课表</small>${courseComputerNote(c)}<div class="course-link-actions"><button class="text-button" data-course-detail="${escape(c.id)}" data-date="${escape(c.date||'')}" data-occurrence="${escape(c.occurrenceId||'')}">课程详情</button>${editButtons('classes',c)}</div></div></div>`;
  }
  function courseDetailModal(c) {
    openModal('课程详情',`<section class="campus-course-detail"><h3>${escape(c.title)}</h3><dl><div><dt>上课时间</dt><dd>${c.date?escape(c.date)+' · 周'+days[weekDay(new Date(c.date+'T12:00:00'))-1]:'常规周'+days[c.day-1]} · ${escape(c.start)}–${escape(c.end)}</dd></div><div><dt>上课地点</dt><dd>${escape(roomName(c.roomId,c.location))}</dd></div><div><dt>课程周次</dt><dd>${escape(weekLabel(c))}${c.ruleLabel?' · '+escape(c.ruleLabel):''}</dd></div></dl>${courseComputerNote(c)}<p class="subtle">${c.ruleLabel?'已应用本机临时规则。':''}来自本机课表，非教务实时同步。编辑常规课程不会删除单次规则。</p><div class="form-actions"><button data-action="close">返回</button><button data-course-map="${escape(c.id)}" data-date="${escape(c.date||'')}" data-occurrence="${escape(c.occurrenceId||'')}">查看上课地点</button><button data-course-exception="${escape(c.id)}" data-date="${escape(c.date||scheduleDate)}">单次停课 / 调课 / 补课</button><button data-action="schedule-rules">查看已设规则</button><button data-edit="classes" data-id="${escape(c.id)}">编辑常规课程</button><button class="primary" data-nav="schedule">完整周课表</button></div></section>`);
  }
  const taskStart = t => t.type==='block'?t.startTime:t.time;
  const taskEnd = t => t.type==='block'?t.endTime:t.time;
  const taskSort = (a,b) => `${a.date}T${taskStart(a)}`.localeCompare(`${b.date}T${taskStart(b)}`);
  function taskStatus(t) {
    if(t.done)return '已完成';
    const now=Date.now(),end=new Date(`${t.date}T${taskEnd(t)}:00`).getTime();
    if(t.type!=='block')return end===now?'已到截止时间':remainingText(end-now);
    if(now>=end)return '已结束未完成';
    return now>=new Date(`${t.date}T${t.startTime}:00`).getTime()?'进行中':'未开始';
  }
  function taskUrgency(t){
    if(t.done)return 'complete';
    if(t.type==='block')return 'block';
    const remaining=new Date(`${t.date}T${t.time}:00`).getTime()-Date.now();
    return remaining<=0?'overdue':remaining<=86400000?'urgent':remaining<=7*86400000?'soon':'later';
  }
  function deadlineOverview(tasks=state.tasks){
    const deadlines=tasks.filter(t=>!t.done&&t.type!=='block');
    const overdue=deadlines.filter(t=>taskUrgency(t)==='overdue');
    const upcoming=deadlines.filter(t=>['urgent','soon'].includes(taskUrgency(t))).sort(taskSort);
    const manual=upcoming.filter(t=>t.origin==='manual'),demo=upcoming.filter(t=>t.origin!=='manual');
    return `<section class="card deadline-overview" aria-label="临近截止任务"><div class="card-head"><h2>先看临近截止</h2><a class="text-button" href="#notices">全部任务 →</a></div><p>未来 7 天 · 手动 ${manual.length} 项 · 演示 ${demo.length} 项 · 已逾期 ${overdue.length} 项（不含已完成和时段安排）</p>${manual.slice(0,3).map(taskView).join('')||empty('未来 7 天暂无手动截止任务。')}${manual.length>3?`<p class="subtle">还有 ${manual.length-3} 项手动任务，请在全部任务查看。</p>`:''}${demo.length?`<details><summary>演示截止任务（${demo.length}） · 非本人真实任务</summary>${demo.slice(0,3).map(taskView).join('')}</details>`:''}</section>`;
  }
  function taskView(t) {
    const label=t.type==='block'?'时段安排':'截止待办',time=t.type==='block'?`${t.startTime}–${t.endTime}`:`${t.time} 截止`;
    return `<div class="timeline-item ${t.done?'done':''} task-${taskUrgency(t)}"><input class="check" type="checkbox" data-task="${escape(t.id)}" aria-label="完成：${escape(t.title)}" ${t.done?'checked':''}><div class="task-text"><strong>${escape(t.title)}</strong><small>${label} · ${escape(t.source)} · ${escape(t.date)} ${escape(time)}${t.origin==='manual'?' · 手动录入':' · 虚构种子'}</small><div class="task-focus-actions">${!t.done?`<button data-focus-task="${escape(t.id)}">${timer.taskId===t.id&&!timer.finished?'返回专注':'开始专注'}</button>`:''}<small>已投入 ${focusMinutes(taskFocusMs(t.id)/60000)} 分钟</small></div>${editButtons('tasks',t)}</div><span class="due">${taskUrgency(t)==='urgent'?'24小时内 · ':taskUrgency(t)==='soon'?'7天内 · ':''}${taskStatus(t)}</span></div>`;
  }
  function todayCourses() {return coursesOn(dateAt());}
  function courseStatus(c) {
    const now=Date.now(),start=new Date(`${dateAt()}T${c.start}:00`).getTime(),end=new Date(`${dateAt()}T${c.end}:00`).getTime();
    if(now>=end)return '已结束';
    if(now>=start)return '正在上课';
    const next=todayCourses().find(x=>new Date(`${dateAt()}T${x.start}:00`).getTime()>now);
    return next?.start===c.start?'下一节':'未开始';
  }
  function timelineItems() {
    const list=state.tasks.filter(t=>t.date===dateAt());
    const classes=todayCourses().map(c=>({...c,kind:'class',time:c.start,date:dateAt()}));
    return [...list,...classes].sort(taskSort);
  }
  function timelineView() {
    const timeline=timelineItems(),overdue=state.tasks.filter(t=>t.type!=='block'&&!t.done&&t.date<dateAt()).slice().sort(taskSort),ended=state.tasks.filter(t=>t.type==='block'&&!t.done&&t.date<dateAt()).slice().sort(taskSort);
    return `<section class="card"><div class="card-head"><h2>今日时间线 <small>${dateAt()} · 课程 + 时段 + 截止节点</small></h2><button class="text-button" data-action="add-task">＋ 添加待办</button></div>${timeline.map(t=>t.kind==='class'?`<div class="timeline-item"><span class="badge">课程</span><div class="task-text"><strong>${escape(t.title)}</strong><small>${escape(t.start)}–${escape(t.end)} · ${escape(roomName(t.roomId,t.location))} · ${weekLabel(t)}</small></div><span class="due">${courseStatus(t)}</span></div>`:taskView(t)).join('')||empty('今天的时间线很清爽。添加一个小目标吧。')}${overdue.length?`<section class="overdue-region" aria-label="往日逾期待办"><h3>往日逾期待办</h3>${overdue.map(taskView).join('')}</section>`:''}${ended.length?`<section class="overdue-region" aria-label="往日已结束未完成安排"><h3>往日已结束未完成安排</h3>${ended.map(taskView).join('')}</section>`:''}<details class="task-explanation"><summary>时间线与冲突说明</summary><p class="subtle">时间线包含课程 + 时段安排 + 截止节点，按本地日期和开始 / 截止时间穿插；往日逾期截止待办与已结束未完成安排分别列出，课程仍按个人学期与单双周筛选。时间重叠仅提示，可自行确认保留。</p></details></section>`;
  }
  // 校历独立按截图中的日期计算，不使用个人开学日，也不参与课程排课。
  const calendarTypes = {holiday:'放假',adjust:'调课',exam:'考试 / 停课',notice:'校历安排'};
  const calendarMonths = (() => {
    const result=[], d=new Date(`${schoolCalendar.firstMonth}-01T12:00:00`);
    while(localDate(d).slice(0,7)<=schoolCalendar.lastMonth){result.push(localDate(d).slice(0,7));d.setMonth(d.getMonth()+1);}
    return result;
  })();
  let calendarMonth = calendarMonths.includes(dateAt().slice(0,7)) ? dateAt().slice(0,7) : dateAt()<schoolCalendar.termStart ? calendarMonths[0] : calendarMonths[calendarMonths.length-1];
  function schoolWeek(date) {
    if(date<schoolCalendar.termStart||date>schoolCalendar.termEnd)return null;
    const utc=s=>{const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d);};
    return Math.floor((utc(date)-utc(schoolCalendar.termStart))/604800000)+1;
  }
  function schoolWeekLabel(date) {const week=schoolWeek(date);return week===null?(date<schoolCalendar.termStart?'尚未开学':'本学期已结束'):`第 ${week} 教学周`;}
  function calendarEvents(date) {return schoolCalendar.events.filter(e=>e.start<=date&&e.end>=date);}
  function calendarEventList(events) {
    return events.length?`<ul class="calendar-events">${events.map(e=>`<li class="calendar-${e.type}"><time>${escape(e.start)}${e.end===e.start?'':' 至 '+escape(e.end)}</time><strong>${escape(e.title)}</strong><small>${calendarTypes[e.type]} · 校历参考</small>${['holiday','adjust','exam'].includes(e.type)?`<button data-calendar-rule="${schoolCalendar.events.indexOf(e)}">核对并设为个人课表规则</button>`:''}</li>`).join('')}</ul>`:empty('本学期已无后续校历事件。');
  }
  function ruleSummary(rule){
    if(rule.courseId){const course=state.classes.find(c=>c.id===rule.courseId);return `${course?.title||'原课程'} · ${rule.date} · ${{cancel:'停课一次',move:'调至 '+rule.toDate+' '+rule.start+'–'+rule.end,extra:'补课 '+rule.start+'–'+rule.end}[rule.kind]}${rule.location?' · '+rule.location:''}`;}
    return `${rule.date} · ${rule.kind==='off'?'全天常规课程停课':'按 '+rule.sourceDate+' 的课表上课'}`;
  }
  function scheduleRulesModal(){
    const rules=[...state.scheduleRules.days,...state.scheduleRules.exceptions].sort((a,b)=>a.date.localeCompare(b.date));
    openModal('临时调课与停课',`<div class="rule-actions"><button data-action="schedule-day-rule">设置日期停课 / 调休</button>${state.classes.length?`<label>选择课程<select id="exception-course">${state.classes.map(c=>`<option value="${escape(c.id)}">${escape(c.title)} · 周${days[c.day-1]} ${c.start}</option>`).join('')}</select></label><button data-action="new-course-exception">设置单次调课 / 补课</button>`:''}</div><p class="subtle">统一用于今日课程、周课表、时间线、服务摘要、冲突检查、分享图和课表 ICS。不会改写常规课程模板；删除规则可恢复。具体单课例外优先于整日停课。</p><div class="rule-list">${rules.map(r=>`<article><strong>${escape(ruleSummary(r))}</strong>${r.reason?`<small>${escape(r.reason)}</small>`:''}<button class="danger" data-rule-delete="${escape(r.id)}">撤销这条规则</button></article>`).join('')||empty('尚未设置临时规则，仍按常规课表上课。')}</div><p class="subtle">只应用你明确保存的规则；校历节假日不会自动停课。规则随本机 JSON 导出，暂不参与云备份。</p>`);
  }
  function dayRuleModal(date=scheduleDate,endDate=date){
    const existing=state.scheduleRules.days.find(r=>r.date===date);
    openModal('设置日期规则',`<form id="day-rule-form"><div class="two-col"><label class="field">开始日期<input name="date" type="date" value="${escape(date)}" min="2000-01-01" max="2100-12-31" required></label><label class="field">结束日期（同日即可）<input name="endDate" type="date" value="${escape(endDate)}" min="2000-01-01" max="2100-12-31" required></label></div><label class="field">当天如何上课<select name="kind"><option value="off" ${existing?.kind==='off'?'selected':''}>常规课程全天停课</option><option value="follow" ${existing?.kind==='follow'?'selected':''}>按另一具体日期的常规课表补课</option></select></label><label class="field">参考日期（仅“按另一日”时填写）<input name="sourceDate" type="date" value="${escape(existing?.sourceDate||'')}" min="2000-01-01" max="2100-12-31"></label><label class="field">依据 / 原因（可空）<input name="reason" maxlength="200" value="${escape(existing?.reason||'')}"></label><p class="subtle">保存前会列出实际影响。按参考日期本身的星期、教学周及单双周排课，不递归叠加参考日的停课；连续多日时参考日期也依次后移。单次显式补课优先于全天停课。</p>${actions('核对并保存日期规则')}</form>`);
  }
  function courseExceptionModal(courseId,date=scheduleDate){
    const c=state.classes.find(c=>c.id===courseId);if(!c)return;
    openModal('单次停课 / 调课 / 补课',`<form id="course-exception-form" data-course="${escape(c.id)}"><h3>${escape(c.title)}</h3><label class="field">操作<select name="kind"><option value="move">调课 / 改时间地点（取消原日一次）</option><option value="cancel">原日停课一次</option><option value="extra">额外补课（不取消原日）</option></select></label><label class="field">原上课日期 / 补课日期<input name="date" type="date" value="${escape(date)}" min="2000-01-01" max="2100-12-31" required></label><label class="field">调至日期（仅调课填写，可同日）<input name="toDate" type="date" value="${escape(date)}" min="2000-01-01" max="2100-12-31"></label><div class="two-col"><label class="field">新开始时间<input name="start" type="time" value="${c.start}"></label><label class="field">新结束时间<input name="end" type="time" value="${c.end}"></label></div><label class="field">新地点（留空沿用原地点）<input name="location" maxlength="100" placeholder="${escape(roomName(c.roomId,c.location))}"></label><label class="field">依据 / 原因（可空）<input name="reason" maxlength="200"></label><p class="subtle">仅停课时忽略新日期、时间和地点。调课只取消原日期这一次；补课只新增一次，不改后续每周安排。已建立的规则可在列表撤销后重设。</p>${actions('核对并保存单次规则')}</form>`);
  }
  function deleteScheduleRule(ruleId){
    const rule=[...state.scheduleRules.days,...state.scheduleRules.exceptions].find(r=>r.id===ruleId);if(!rule||!confirm('撤销「'+ruleSummary(rule)+'」？常规课程模板保留，将重新计算相关日期。'))return;
    const next=clone(state);next.scheduleRules.days=next.scheduleRules.days.filter(r=>r.id!==ruleId);next.scheduleRules.exceptions=next.scheduleRules.exceptions.filter(r=>r.id!==ruleId);
    if(commitLocal(next,'临时规则已撤销，相关日期已重新计算。'))scheduleRulesModal();
  }
  function calendarSettingsView() {
    return `<div class="calendar-settings"><p>个人课表计算起始日：<strong>${escape(state.settings.termStart)}</strong>${state.settings.termStart!==schoolCalendar.termStart?'（与校历不同，保留你的设置）':'（与校历一致）'}</p><button type="button" data-action="apply-calendar-start">应用校历起始日</button><p class="subtle">基准日期只影响教学周；临时停课、调休、补课由你核对后设置，统一用于所有课程展示。<button type="button" data-action="schedule-rules">管理临时调课与停课（${state.scheduleRules.days.length+state.scheduleRules.exceptions.length} 条）</button></p></div>`;
  }
  function schoolCalendarCard() {
    const upcoming=schoolCalendar.events.filter(e=>e.end>=dateAt()).slice().sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)).slice(0,4);
    return `<section class="card school-calendar-card"><div class="card-head"><h2>校历小窗口</h2><span class="badge">空白示例</span></div><strong class="calendar-current">${schoolWeekLabel(dateAt())}</strong><p class="subtle">${dateAt()} · 按空白示例学期计算，非官方校历<br>${schoolCalendar.termStart} 至 ${schoolCalendar.termEnd} · 请先设置个人教学周基准</p><h3>近期安排（含进行中）</h3>${calendarEventList(upcoming)}<button class="primary" data-action="school-calendar">查看完整校历</button>${calendarSettingsView()}<p class="subtle">${escape(schoolCalendar.source)}</p><p class="subtle">校历不会自行改课；核对后设置的日期规则会统一作用到个人课表。</p></section>`;
  }
  function calendarMonthView() {
    const first=new Date(`${calendarMonth}-01T12:00:00`), leading=weekDay(first)-1;
    const count=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
    const cells=Array.from({length:Math.ceil((leading+count)/7)*7},(_,i)=>{
      const day=i-leading+1;if(day<1||day>count)return '<td class="calendar-blank" aria-hidden="true"></td>';
      const date=`${calendarMonth}-${pad(day)}`, events=calendarEvents(date),week=schoolWeek(date),isToday=date===dateAt();
      return `<td class="calendar-day${isToday?' calendar-today':''}" ${isToday?'aria-current="date"':''}><time datetime="${date}">${day}${isToday?' · 今天':''}</time><small class="calendar-week">${week===null?(date<schoolCalendar.termStart?'开学前':'学期结束'):`第${week}周`}</small>${events.map(e=>`<span class="calendar-tag calendar-${e.type}">${calendarTypes[e.type]}：${escape(e.title)}</span>`).join('')}</td>`;
    });
    return `<div class="calendar-table-scroll"><table class="calendar-table"><caption>${first.getFullYear()}年${first.getMonth()+1}月 · 校历教学周（非个人课表周次）</caption><thead><tr>${days.map(d=>`<th scope="col">周${d}</th>`).join('')}</tr></thead><tbody>${Array.from({length:cells.length/7},(_,i)=>`<tr>${cells.slice(i*7,i*7+7).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function renderSchoolCalendar() {
    const index=calendarMonths.indexOf(calendarMonth);
    $('#modal-body').innerHTML=`<div class="calendar-toolbar"><button data-action="calendar-prev" ${index===0?'disabled':''} aria-label="上个月">上个月</button><label>月份 <select id="calendar-month">${calendarMonths.map(m=>`<option value="${m}" ${m===calendarMonth?'selected':''}>${m}</option>`).join('')}</select></label><button data-action="calendar-next" ${index===calendarMonths.length-1?'disabled':''} aria-label="下个月">下个月</button></div><div class="calendar-legend">${Object.entries(calendarTypes).map(([key,label])=>`<span class="calendar-tag calendar-${key}">${label}</span>`).join('')}<span>描边：今天</span></div><div id="calendar-month-view" aria-live="polite">${calendarMonthView()}</div><h3>节假日及调课列表（全学期）</h3>${calendarEventList(schoolCalendar.events.filter(e=>['holiday','adjust'].includes(e.type)).slice().sort((a,b)=>a.start.localeCompare(b.start)))}<h3>考试、停课及其他安排</h3>${calendarEventList(schoolCalendar.events.filter(e=>!['holiday','adjust'].includes(e.type)).slice().sort((a,b)=>a.start.localeCompare(b.start)))}${calendarSettingsView()}<ul>${schoolCalendar.notes.map(n=>`<li>${escape(n)}</li>`).join('')}</ul><p class="subtle">来源：${escape(schoolCalendar.source)}</p>`;
  }
  function schoolCalendarModal() {
    openModal(schoolCalendar.title,'');$('#modal').classList.add('school-calendar-modal');renderSchoolCalendar();
  }
  function applyCalendarStart() {
    if(!confirm(`将个人课表教学周计算起始日从 ${state.settings.termStart} 改为 ${schoolCalendar.termStart}？只改教学周计算，不改变各课开课范围，不将 1–30 周改为 1–20 周，也不会自动改写调休或停课安排。`))return;
    state.settings.termStart=schoolCalendar.termStart;const persisted=save();render();
    if($('#modal').open&&$('#modal').classList.contains('school-calendar-modal'))renderSchoolCalendar();
    savedFeedback(persisted,'已应用校历起始日；课程及各课开课范围保持不变。');
  }
  // nextAt 仅属当前页面会话，刷新/导入后重新等待，不补发历史提醒。
  let hydrationNextAt = null, hydrationDay = dateAt();
  function resetHydrationSchedule(now=Date.now()) {
    hydrationDay=localDate(new Date(now));
    const h=state.hydration;
    hydrationNextAt=h.enabled?now+h.interval*60000:null;
  }
  function checkHydration(now=Date.now()) {
    const h=state.hydration, d=new Date(now), day=localDate(d);
    if(!h.enabled){hydrationNextAt=null;return;}
    if(day!==hydrationDay||hydrationNextAt===null){resetHydrationSchedule(now);return;}
    if(document.hidden||now<hydrationNextAt)return;
    // 先推进绝对时间，再显示提示；后台恢复至多一次，不循环追赶。
    hydrationNextAt=now+h.interval*60000;
    const minute=d.getHours()*60+d.getMinutes();
    if(minute<minutes(h.start)||minute>=minutes(h.end))return;
    const message='喝水小提醒：可按自身需要和医嘱安排，记录仅供自己参考。';
    toast(message);
    if(h.notifications&&'Notification' in window&&Notification.permission==='granted'){
      try{new Notification('喝水小提醒',{body:message,tag:'campus-hydration'});}catch{ /* 系统通知失败仍保留页面提示，不影响待办。 */ }
    }
  }
  function hydrationStats() {
    const records=state.hydration.records.filter(r=>r.date===dateAt());
    return {cups:records.length,ml:records.reduce((sum,r)=>sum+r.ml,0)};
  }
  function hydrationCard() {
    if(!state.hydration.enabled)return '';
    const h=state.hydration, stats=hydrationStats();
    return `<section class="card hydration-card"><div class="card-head"><h2>喝水随手记</h2><button class="text-button" data-action="hydration-settings">设置</button></div><p class="hydration-total">今日 <strong>${stats.cups}</strong> 杯 · <strong>${stats.ml}</strong> ml</p><div class="hydration-controls"><label>本杯 <select id="hydration-volume" aria-label="本杯毫升">${hydrationVolumes.map(n=>`<option value="${n}" ${n===h.volume?'selected':''}>${n} ml</option>`).join('')}</select></label><button class="primary" data-action="hydration-record">记录一杯</button><button data-action="hydration-undo" ${stats.cups?'':'disabled'}>撤销今日最近一杯</button></div><p class="subtle">${h.start}–${h.end} · 每 ${h.interval} 分钟 · 仅页面打开时提醒。<br>不设每日目标，请按自身需要和医嘱安排。</p></section>`;
  }
  function hydrationSettingsModal() {
    const h=state.hydration;
    openModal('本地喝水提醒',`<p>默认关闭；开启后工作台右侧才显示随手记。无医学定量建议，无强制每日目标，请按自身需要和医嘱安排。</p><form id="hydration-form"><label class="field"><span><input type="checkbox" name="enabled" ${h.enabled?'checked':''}> 开启喝水提醒与首页小卡</span></label><label class="field">提醒间隔<select name="interval">${hydrationIntervals.map(n=>`<option value="${n}" ${n===h.interval?'selected':''}>${n} 分钟</option>`).join('')}</select></label><div class="two-col"><label class="field">开始<input type="time" name="start" value="${h.start}" required></label><label class="field">结束<input type="time" name="end" value="${h.end}" required></label></div><label class="field">默认每杯<select name="volume">${hydrationVolumes.map(n=>`<option value="${n}" ${n===h.volume?'selected':''}>${n} ml</option>`).join('')}</select></label>${actions('保存喝水设置')}</form><p class="subtle">仅支持同日时段，结束须晚于开始。保存、重新开启或重开页面后重新等待一个间隔；后台节流恢复最多提示一次，不补刷。关闭立即停止，已记录数据保留。页面关闭后无推送，多标签页各自计时。</p><button data-action="hydration-notifications">${h.notifications?'关闭喝水系统通知':'点击申请喝水系统通知（可选）'}</button><p class="subtle">系统通知：${h.notifications?'已选择使用':'未启用'}；权限：${'Notification' in window?escape(Notification.permission):'不支持'}。拒绝或不支持仍在可见页面提示，不改待办通知设置。</p><p>智慧笑联：仅文字说明，未接入。本功能不安装、不联网，不提供水机实时状态、订单或余额，也不收集宿舍房号、商户或账号信息。</p>`);
  }
  function recordHydration() {
    if(!state.hydration.enabled)return;
    if(state.hydration.records.length>=hydrationLimit){toast('喝水记录已达10000条，请先导出备份。');return;}
    const ml=Number($('#hydration-volume')?.value||state.hydration.volume);
    if(!hydrationVolumes.includes(ml))return;
    state.hydration.volume=ml;
    state.hydration.records.push({id:id('water'),date:dateAt(),ml});
    const persisted=save();render();savedFeedback(persisted,`已记录 ${ml} ml，仅供自己参考。`);
  }
  function undoHydration() {
    if(!state.hydration.enabled)return;
    const records=state.hydration.records;
    for(let i=records.length-1;i>=0;i--){if(records[i].date===dateAt()){records.splice(i,1);const persisted=save();render();savedFeedback(persisted,'已撤销今日最近一杯。');return;}}
  }
  async function toggleHydrationNotifications() {
    const h=state.hydration;
    if(h.notifications){h.notifications=false;const persisted=save();hydrationSettingsModal();savedFeedback(persisted,'已关闭喝水系统通知。');return;}
    if(!('Notification' in window)){toast('浏览器不支持系统通知；开启喝水提醒后仍有页面提示。');return;}
    try{
      const permission=await Notification.requestPermission();
      if(state.hydration!==h)return;
      h.notifications=permission==='granted';const persisted=save();
      if($('#modal').open&&$('#hydration-form'))hydrationSettingsModal();
      savedFeedback(persisted,h.notifications?'已选择喝水系统通知，提醒总开关仍由你控制。':'未授予系统通知；开启喝水提醒后仍有可见页面提示。');
    }catch{toast('无法申请系统通知；开启喝水提醒后仍有页面提示。');}
  }
  resetHydrationSchedule();
  function homeView() {
    const courses=todayCourses();
    const cards={};
    cards.courses=`<section class="card campus-course-card"><div class="card-head"><h2>今日课程便签 <small>${courses.length} 个安排</small></h2><button class="text-button" data-action="add-class">＋ 添加课程</button></div>${courses.map(c=>`<div class="today-course"><span class="badge">${courseStatus(c)}</span>${courseView(c)}</div>`).join('')||empty('今天没有课程，好好安排这段自由时间。')}<div style="margin-top:16px"><a class="text-button" href="#schedule">查看完整周课表 →</a></div></section>`;
    const header=`<section class="hero campus-hero" id="hero"><div class="campus-hero-copy"><span class="campus-kicker campus-brand-signature">把日常，写进师大。${window.CampusBrand.signature()}</span><span class="date" id="hero-date"></span><h2 id="hero-title"></h2><p id="hero-greeting"></p><div class="campus-scene-picker" role="group" aria-label="校园画面">${campusScenes.map(([id,name,desc])=>`<button data-campus-scene="${id}" title="${desc}">${name}</button>`).join('')}</div><button class="text-button campus-appearance" data-action="appearance">光影与外观</button></div>${landscape()}<span class="scene-note">非官方 · 演示版</span></section>
      <div class="period-controls campus-period-controls">${config.periods.map((p,i)=>`<button data-period-index="${i}" title="${pad(p.start)}:00–${pad(p.end)}:00">${escape(p.label)}</button>`).join('')}<button data-period-index="auto">恢复自动</button><span id="period-mode"></span></div>${weatherView()}`;
    cards.timeline=`<div id="today-timeline">${deadlineOverview()}${timelineView()}</div>`;
    cards.calendar=schoolCalendarCard();
    cards.focus=`<section class="card"><div class="card-head"><h2>一小段专注</h2><a class="text-button" href="#focus">打开番茄钟 →</a></div><p id="focus-summary">${focusSummary()}</p><p class="subtle" id="home-focus-stats">${focusStatsText()}</p></section>`;
    cards.shortcuts=`<section class="card"><div class="card-head"><h2>校园捷径</h2><span class="subtle">少一点寻找</span></div><div class="quick-grid"><button class="library-shortcut" data-action="campus-code-guide" aria-label="校园码：查看企业微信内打开指引">${icon('grid')} 校园码<small>企业微信内打开</small></button><a class="library-shortcut" href="https://tsg.jxnu.edu.cn/" target="_blank" rel="noopener noreferrer" aria-label="江西师范大学图书馆官网（新窗口打开）">${icon('building')} 图书馆官网 ↗<small>官方站外服务，不代登录</small></a><button data-nav="circle">${icon('circle')} 失物招领<small>本机登记与问答</small></button><button data-nav="notices">${icon('bell')} 课程通知<small>演示分类汇总</small></button><button data-nav="services">${icon('grid')} 校园服务<small>电费与教学区</small></button></div></section>`;
    cards.tip=`<div class="info-box">先添课程，再记待办。修改后记得定期导出备份。</div>`;
    const visible=state.dashboard.order.filter(key=>!state.dashboard.hidden.includes(key));
    const items=visible.map(key=>({key,html:cards[key]}));
    if(state.hydration.enabled)items.push({key:'hydration',html:hydrationCard()});
    return `<div class="home-dashboard">${header}<div class="dashboard-toolbar"><span class="subtle">按你的节奏安排首页</span><button data-action="dashboard-settings">整理工作台</button></div><div class="dashboard-grid dashboard-custom">${[0,1].map(column=>`<div class="home-column">${items.map((item,index)=>index%2===column?`<div class="stack" data-home-card="${item.key}" style="--home-order:${index}">${item.html}</div>`:'').join('')}</div>`).join('')}${!visible.length?`<div class="home-layout-empty">${empty('首页卡片已全部隐藏，可通过“整理工作台”恢复。')}</div>`:''}</div></div>`;
  }
  function focusSummary() {const s=Math.ceil(timerRemaining()/1000);return `${timer.mode==='focus'?'专注':'休息'} · ${pad(Math.floor(s/60))}:${pad(s%60)} · ${timer.finished?'已完成':timer.deadline!==null?'进行中':'未开始 / 已暂停'}`;}
  function focusView() {
    const p=state.focus.plan;
    return `<div class="focus-layout" data-focus-palette="${p.palette}"><section class="card focus-stage" aria-label="彩雾专注舞台"><div class="focus-stage-heading"><h2>留一段时间，做好一件事</h2><span id="focus-round">第 ${timer.round} / ${p.rounds} 轮</span></div><div class="timer-ring"><strong id="timer-time"></strong><small id="timer-state"></small></div><div class="focus-stage-footer"><progress id="focus-progress" max="100" value="0" aria-label="当前阶段完成进度"></progress><div class="focus-round-dots" aria-hidden="true">${Array.from({length:p.rounds},(_,i)=>`<span${i<timer.round?' class="is-reached"':''}></span>`).join('')}</div><p class="focus-target">${escape(timer.taskId?(state.tasks.find(t=>t.id===timer.taskId)?.title||timer.taskTitle):p.target)||'这一轮，只做一件事'}</p><section id="focus-task-link" class="focus-task-link" aria-label="专注关联待办">${focusTaskLinkView()}</section><p class="focus-stage-caption">安静开始 · 从容推进 · 让注意力回来</p></div><div class="timer-controls"><button class="primary" data-action="timer-start" id="timer-start">开始专注</button><button data-action="timer-reset">重置当前阶段</button></div><p class="subtle" id="focus-stats">${focusStatsText()}</p><details class="focus-help"><summary>计时与保存说明</summary><p class="subtle">刷新恢复当前阶段，暂停不计时；完整和提前结束均记录实际投入，每轮只结算一次。关联待办结束后由你确认完成，不自动勾选；关联专注不自动衔接下一轮。预设、重置和切换前保留已投入时间。记录仅本机保存，JSON备份包含联动；云备份暂不含投入。</p></details></section><section class="card focus-options"><h2>计时方案</h2><p class="subtle">按学科难度选</p><div class="focus-presets">${[[50,10,'硬核','数理·编程·推导','适合需要耐心推敲的任务。'],[90,20,'心流','论文·大工程·长文本','留一段不切换任务的长时间。'],[25,5,'经典','背诵·错题·复习','适合背诵、复习与整理。'],[15,3,'起步','拖延·不想开始','先做15分钟，轻一点开始。']].map(([f,b,name,tag,scene])=>`<button type="button" data-focus-preset="${f}" data-short="${b}" aria-pressed="${p.focus===f&&p.short===b}"><span class="focus-preset-time">${name} <b>${f} / ${b}</b><small>专注 / 短休 · 分钟</small></span><span class="focus-preset-scene">${tag}</span><span class="focus-preset-scene">${scene}</span></button>`).join('')}</div><form id="focus-plan-form"><label class="field">这一轮只做一件事<span class="subtle">写下来，就不容易跑</span><input name="target" maxlength="120" value="${escape(p.target)}" placeholder="例如：推完第3章5道证明题"></label><div class="focus-numbers">${[['focus','专注分钟'],['short','短休分钟'],['long','长休分钟'],['rounds','轮数']].map(([k,label])=>`<label class="field">${label}<input type="number" name="${k}" min="1" max="${k==='rounds'?12:180}" value="${p[k]}" required></label>`).join('')}</div><label class="field" for="focus-palette">原创配色（预览，保存后生效）</label><div class="focus-palette-buttons" role="group" aria-label="专注配色预览">${[['iris','鸢尾雾紫'],['lagoon','浅湾青绿'],['apricot','杏光暖橙'],['rose','蔷薇暮粉']].map(([k,label])=>`<button type="button" data-palette="${k}" aria-label="预览${label}" aria-pressed="${p.palette===k}"><span class="focus-swatch" aria-hidden="true"></span>${label}</button>`).join('')}</div><label class="field">配色列表<select id="focus-palette" name="palette">${[['iris','鸢尾雾紫'],['lagoon','浅湾青绿'],['apricot','杏光暖橙'],['rose','蔷薇暮粉']].map(([k,label])=>`<option value="${k}" ${p.palette===k?'selected':''}>${label}</option>`).join('')}</select></label><label class="focus-switch"><input type="checkbox" name="autoNext" ${p.autoNext?'checked':''}> 自动进入下一阶段（默认关）</label><label class="focus-switch"><input type="checkbox" name="endNotice" ${p.endNotice?'checked':''}> 阶段结束页面提示（无声音）</label><button class="primary">保存方案并从第1轮开始</button></form><details><summary>单阶段自定义</summary>${legacyTimerForm()}</details></section><section class="card focus-history"><h2>专注记录</h2><div id="focus-records">${focusRecordsView()}</div><p class="subtle">完整及提前结束均计入实际投入；休息不计入。显示最近30条已处理记录及全部待确认记录，JSON备份保留全部。</p></section></div>`;
  }
  function legacyTimerForm() {
    return `<div class="focus-layout"><section class="card timer-card"><div class="card-head"><h2>一小段专注</h2><span class="badge">番茄钟</span></div><form id="timer-form" class="toolbar"><label>模式<select name="mode"><option value="focus" ${timer.mode==='focus'?'selected':''}>专注</option><option value="break" ${timer.mode==='break'?'selected':''}>休息</option></select></label><label>分钟<input name="duration" type="number" min="1" max="180" value="${timer.duration}" required></label><button>应用自定义</button></form><div class="chips"><button data-duration="25" data-mode="focus">25 分钟专注</button><button data-duration="5" data-mode="break">5 分钟休息</button></div></section></div>`;
  }
  const focusMinutes = value => Math.round(value*10)/10;
  function taskFocusMs(taskId){return state.focus.records.filter(r=>r.taskId===taskId).reduce((n,r)=>n+(r.elapsedMs??r.minutes*60000),0);}
  function focusTaskLinkView(){
    const task=state.tasks.find(t=>t.id===timer.taskId);
    return `<div class="focus-link-heading"><strong>${timer.taskId?'关联待办':'自由专注'}</strong><a class="text-button" href="#notices">选择待办 →</a></div><p>${escape(task?.title||timer.taskTitle||'可从通知里的待办直接开始，或自由设定本轮目标。')}</p>${timer.taskId?`<small>${task?task.done?'待办已完成；投入仍会保留':'已记录投入 '+focusMinutes(taskFocusMs(timer.taskId)/60000)+' 分钟':'原待办已删除，历史记录保留，不会关联其他任务'}</small>`:''}<button data-action="focus-finish" ${timer.mode!=='focus'||timer.finished?'disabled':''}>结束本次并记录实际投入</button>`;
  }
  function focusRecordsView(){
    const pending=state.focus.records.filter(r=>r.decision==='pending'),recent=state.focus.records.filter(r=>r.decision!=='pending').slice(-30);
    return [...recent,...pending].reverse().map(r=>`<article class="focus-record"><div class="focus-record-heading"><strong>${r.taskId?escape(r.taskTitle):'自由专注'}</strong><b>${focusMinutes(r.minutes)} 分钟${r.minutes<.1?'（不足6秒）':''}</b></div><small>${escape(new Date(r.completedAt).toLocaleString())} · ${r.outcome==='partial'?'提前结束 · 实际投入':'完整专注'}${r.taskId&&!state.tasks.some(t=>t.id===r.taskId)?' · 原待办已删除':''}</small>${r.decision==='pending'?`<div class="focus-record-decision"><span>这项任务完成了吗？</span><button data-focus-keep="${escape(r.id)}">还没，保留待办</button><button class="primary" data-focus-complete="${escape(r.id)}" ${state.tasks.some(t=>t.id===r.taskId)?'':'disabled'}>确认完成任务</button></div>`:r.taskId?`<p class="subtle">${r.decision==='completed'?'已确认完成任务':'已记录投入，保留待办'}</p>`:''}</article>`).join('')||empty('从待办开始一小段专注，投入会记在这里。');
  }
  function courseColor(c){let hash=0;for(const char of c.title.trim())hash=(hash*31+char.charCodeAt(0))>>>0;return ['iris','lagoon','apricot','rose'][hash%4];}
  function courseLanes(courses){
    const sorted=courses.slice().sort((a,b)=>minutes(a.start)-minutes(b.start)||minutes(a.end)-minutes(b.end)||a.id.localeCompare(b.id)),result=[];
    let group=[],ends=[],groupEnd=-1;
    const flush=()=>{for(const item of group)result.push({...item,lanes:ends.length});group=[];ends=[];};
    for(const c of sorted){const start=minutes(c.start),end=minutes(c.end);if(start>=groupEnd){flush();groupEnd=-1;}let lane=ends.findIndex(e=>e<=start);if(lane<0)lane=ends.length;ends[lane]=end;group.push({course:c,lane});groupEnd=Math.max(groupEnd,end);}flush();return result;
  }
  const examOrigin = t => t.origin==='manual'?'手动录入 · 请核对教务通知':'演示数据 · 非真实考试';
  function weekExams(dates){
    const selected=new Set(dates.map(localDate));
    return state.tasks.filter(t=>t.source==='考试'&&selected.has(t.date)).sort(taskSort);
  }
  function weekExamView(dates){
    const exams=weekExams(dates);
    return `<section class="week-exams" aria-label="当周考试提醒"><div class="card-head"><h3>当周考试提醒（${exams.length}）</h3><button data-action="add-exam">＋ 添加考试</button></div><p class="subtle">手动记录考试，不自动同步教务。</p>${exams.map(t=>`<div class="week-exam-row${t.done?' exam-done':''}"><button class="exam-reminder" data-edit="tasks" data-id="${escape(t.id)}"><b>考试 · ${escape(t.title)}</b><span>${t.date} · ${t.type==='block'?`${t.startTime}–${t.endTime}`:`${t.time} 截止 · 未填写考试时段`} · ${taskStatus(t)}</span><small>${examOrigin(t)}</small></button>${editButtons('tasks',t)}</div>`).join('')||'<p class="subtle">本周暂无考试记录，可添加已确定日期和时间的考试。</p>'}</section>`;
  }
  function scheduleShortTitle(title){
    return title.replace(/大学生心理健康教育/g,'心理健康').replace(/程序设计/g,'编程').replace(/思想道德与法治/g,'思法').replace(/大学英语/g,'英语').replace(/高等数学/g,'高数').replace(/大学物理/g,'大物').replace(/大学体育/g,'体育');
  }
  function scheduleExamCard(t,lane,lanes,y,span){ 
    return `<article class="schedule-course schedule-exam${t.done?' exam-done':''}" data-task-id="${escape(t.id)}" data-lane="${lane}" data-lanes="${lanes}" style="top:${y(t.startTime)};height:${span(t.startTime,t.endTime)};left:calc(${lane/lanes*100}% + 3px);width:calc(${100/lanes}% - 6px)"><button class="exam-card-open" data-edit="tasks" data-id="${escape(t.id)}" aria-label="编辑考试：${escape(t.title)}"></button><b class="exam-badge">考试${t.done?' · 已完成':''}</b><small>${t.startTime}–${t.endTime}</small><strong class="schedule-full-title">${escape(t.title)}</strong><strong class="schedule-short-title" aria-hidden="true">${escape(scheduleShortTitle(t.title))}</strong><small class="schedule-exam-origin">${examOrigin(t)}<br>${taskStatus(t)}</small>${lanes>1?'<b class="schedule-conflict">时间冲突 · 分栏</b>':''}${editButtons('tasks',t)}</article>`;
  }
  function scheduleGrid(dates){
    const exams=weekExams(dates).filter(t=>t.type==='block');
    const visible=dates.map(d=>[...coursesOn(localDate(d)),...exams.filter(t=>t.date===localDate(d)).map(t=>({id:t.id,start:t.startTime,end:t.endTime,exam:t}))]);
    const start=Math.min(480,...visible.flat().map(c=>minutes(c.start))),end=Math.max(1280,...visible.flat().map(c=>minutes(c.end))),height=(end-start)*2;
    const compact=scheduleMobile.matches&&scheduleMode==='compact';
    const y=time=>compact?`${(minutes(time)-start)/(end-start)*100}%`:`${(minutes(time)-start)*2}px`;
    const span=(a,b)=>compact?`${(minutes(b)-minutes(a))/(end-start)*100}%`:`${(minutes(b)-minutes(a))*2}px`;
    const axis=config.slots.filter(s=>s.start!=='19:00'||s.end==='21:20').map(s=>`<div class="schedule-axis-label" style="top:${y(s.start)}">${escape(s.label)}<small>${s.start}<br>${s.end}</small></div>`).join('');
    return `<p class="subtle schedule-grid-note">点课程看详情；重叠时分栏显示。</p><div class="week-scroll"><div class="schedule-board" style="--schedule-days:${dates.length}"><div class="schedule-heading"><strong>${compact?`${pad(Math.floor(start/60))}:${pad(start%60)}<br>–${pad(Math.floor(end/60))}:${pad(end%60)}`:'节次 / 时间'}</strong>${dates.map((d,i)=>`<strong class="${localDate(d)===dateAt()?'today':''}">周${days[i]}<small>${d.getMonth()+1}/${d.getDate()}</small></strong>`).join('')}</div><div class="schedule-body" style="--schedule-natural-height:${height}px;height:var(--schedule-height, var(--schedule-natural-height))"><div class="schedule-axis">${axis}<span class="schedule-gap" style="top:${y('12:00')}">12:00 午休<br>14:00 下午</span><span class="schedule-gap" style="top:${y('17:10')}">17:10 晚间间歇<br>19:00 晚课</span></div>${visible.map((courses,i)=>`<div class="schedule-day ${localDate(dates[i])===dateAt()?'today-column':''}">${config.slots.map(s=>`<div class="schedule-rule" style="top:${y(s.start)}"></div>`).join('')}${courseLanes(courses).map(({course:c,lane,lanes})=>{if(c.exam)return scheduleExamCard(c.exam,lane,lanes,y,span);const current=localDate(dates[i])===dateAt()&&courseStatus(c)==='正在上课';return `<article class="schedule-course tone-${courseColor(c)}${current?' current-course':''}" data-course-id="${escape(c.id)}" data-lane="${lane}" data-lanes="${lanes}" style="top:${y(c.start)};height:${span(c.start,c.end)};left:calc(${lane/lanes*100}% + 3px);width:calc(${100/lanes}% - 6px)" ${current?'aria-current="true"':''}><button class="schedule-course-open" data-course-detail="${escape(c.id)}" data-date="${escape(c.date||'')}" data-occurrence="${escape(c.occurrenceId||'')}" aria-label="查看课程：${escape(c.title)}，${c.start}–${c.end}，${escape(roomName(c.roomId,c.location))}"></button><small class="schedule-card-time">${c.start}–${c.end}</small><strong class="schedule-full-title">${escape(c.title)}${c.ruleLabel?' · '+escape(c.ruleLabel):''}</strong><strong class="schedule-short-title" aria-hidden="true">${escape(scheduleShortTitle(c.title))}</strong><small class="schedule-room">${escape(roomName(c.roomId,c.location))}</small><small class="schedule-card-weeks">${weekLabel(c)}</small>${lanes>1?'<b class="schedule-conflict">时间冲突 · 分栏</b>':''}${current?'<b>正在上课</b>':''}${editButtons('classes',c)}</article>`;}).join('')}</div>`).join('')}</div></div></div>`;
  }
  let scheduleShare=null;
  function clearScheduleShare(){
    if(scheduleShare?.url)URL.revokeObjectURL(scheduleShare.url);
    scheduleShare=null;
  }
  function scheduleShareModel(date,includeLocation){
    const monday=new Date(`${date}T12:00:00`);monday.setDate(monday.getDate()-weekDay(monday)+1);
    return {selected:date,days:days.map((label,i)=>{
      const d=new Date(monday);d.setDate(d.getDate()+i);const key=localDate(d);
      const courses=coursesOn(key).map(c=>({title:c.title,start:c.start,end:c.end,location:includeLocation?roomName(c.roomId,c.location):'',tone:courseColor(c),note:c.ruleLabel}));
      const exams=state.tasks.filter(t=>t.source==='考试'&&t.type==='block'&&t.date===key).map(t=>({title:`考试 · ${t.title}`,start:t.startTime,end:t.endTime,location:includeLocation?(t.location||''):'',tone:'exam',note:`${t.done?'已完成 · ':''}${examOrigin(t)}`}));
      return {date:key,label:`周${label}`,week:semesterWeek(key),items:[...courses,...exams].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end))};
    }),includeLocation};
  }
  function scheduleShareModal(){
    const model=scheduleShareModel(scheduleDate,false);
    openModal('导出浏览周课表图片',`<section id="schedule-share"><p>分享排版，非页面截图。导出 ${model.days[0].date} 至 ${model.days[6].date} 的周一至周日，含实际排课及固定日期的时段考试，不受手机视口限制。</p><p class="subtle">PNG 仅在本机生成，不上传；不含头像、昵称或 ID。课程名称、时间及考试内容也可能透露个人行程，分享前请检查。仅截止时间的考试不编造时段，请另看课表考试提醒。</p><label><input id="schedule-share-location" type="checkbox"> 包含课程地点（可能暴露行踪，默认关闭）</label><div class="toolbar"><button data-action="schedule-share-generate">重新生成预览</button><button data-action="schedule-share-download" disabled>下载 PNG</button><button data-action="schedule-share-copy" disabled>复制图片</button></div><p id="schedule-share-status" role="status" aria-live="polite"></p><div id="schedule-share-preview"></div></section>`);
    scheduleShare={date:scheduleDate};generateScheduleShare();
  }
  async function generateScheduleShare(){
    if(!scheduleShare||!$('#schedule-share'))return;
    const date=scheduleShare.date,includeLocation=$('#schedule-share-location').checked;
    clearScheduleShare();const request={date};scheduleShare=request;
    const model=scheduleShareModel(date,includeLocation),status=$('#schedule-share-status');
    $('#schedule-share-preview').replaceChildren();status.textContent='正在本机生成完整七天分享图…';
    for(const action of ['download','copy'])$(`[data-action="schedule-share-${action}"]`).disabled=true;
    try{
      if(document.fonts?.ready)await document.fonts.ready;
      if(scheduleShare!==request)return;
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw new Error('设备无法创建画布，请换用支持 Canvas 的浏览器。');
      const width=1800,pad=28,gap=12,column=(width-pad*2-gap*6)/7,font='"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
      const wrap=(text,size,max)=>{
        ctx.font=`${size}px ${font}`;const lines=[];let line='';
        for(const char of String(text)){if(char==='\n'){lines.push(line);line='';continue;}if(line&&ctx.measureText(line+char).width>max){lines.push(line);line='';}line+=char;}
        if(line)lines.push(line);return lines;
      };
      const columns=model.days.map(day=>({...day,cards:day.items.map(item=>{
        const title=wrap(item.title,24,column-28),location=item.location?wrap(`地点：${item.location}`,19,column-28):[],note=item.note?wrap(item.note,17,column-28):[];
        return {...item,title,location,note,height:56+title.length*32+location.length*27+note.length*24};
      })}));
      const height=280+Math.max(100,...columns.map(day=>day.cards.reduce((sum,c)=>sum+c.height+12,0)))+100;
      if(height>16000||width*height>28000000)throw new Error('本周内容过多，超过设备安全画布尺寸；未截断任何信息，请减少异常重复记录后再试。');
      canvas.width=width;canvas.height=height;
      ctx.fillStyle='#f5f4fa';ctx.fillRect(0,0,width,height);
      const text=(value,x,y,size=22,color='#25233a')=>{ctx.font=`${size}px ${font}`;ctx.fillStyle=color;ctx.fillText(value,x,y);};
      text('一周课表 · 分享排版',pad,55,36);
      text(`${model.days[0].date} — ${model.days[6].date}  |  所选日期 ${model.selected} · 第 ${semesterWeek(model.selected)} 周`,pad,98,24);
      text(`非页面截图 · 周一至周日 · ${includeLocation?'含地点，请谨慎分享':'不含地点'} · 不含个人身份资料`,pad,132,21,'#625c77');
      const tones={iris:['#e7e2ff','#65509b'],lagoon:['#daf1ee','#286f69'],apricot:['#ffecd7','#9c622e'],rose:['#fbe2ec','#98536f'],exam:['#ffe2de','#a23e38']};
      columns.forEach((day,i)=>{
        const x=pad+i*(column+gap);ctx.fillStyle='#ffffff';ctx.fillRect(x,158,column,height-240);
        text(day.label,x+14,192,26);text(day.date,x+14,222,20);text(`第 ${day.week} 周`,x+14,249,18,'#625c77');let y=268;
        if(!day.cards.length)text('暂无课程或时段考试',x+12,y+28,18,'#625c77');
        day.cards.forEach(card=>{
          const [bg,ink]=tones[card.tone];ctx.fillStyle=bg;ctx.fillRect(x+4,y,column-8,card.height);ctx.fillStyle=ink;ctx.fillRect(x+4,y,4,card.height);
          text(`${card.start}–${card.end}`,x+14,y+28,21,ink);let lineY=y+61;
          for(const line of card.title){text(line,x+14,lineY,24);lineY+=32;}
          for(const line of card.location){text(line,x+14,lineY,19,'#514b61');lineY+=27;}
          for(const line of card.note){text(line,x+14,lineY,17,ink);lineY+=24;}
          y+=card.height+12;
        });
      });
      text('个人课表 · 已应用本机临时规则 · 仅含已填写起止时间的考试，不推测考试时长',pad,height-49,21,'#625c77');
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG 编码失败，请重试或更换浏览器。')),'image/png'));
      if(scheduleShare!==request||!$('#modal').open||!$('#schedule-share'))return;
      request.blob=blob;request.url=URL.createObjectURL(blob);request.filename=`课表-${model.days[0].date}-${model.days[6].date}.png`;
      const image=document.createElement('img');image.src=request.url;image.alt=`${model.days[0].date}至${model.days[6].date}完整七天课表分享图`;$('#schedule-share-preview').replaceChildren(image);
      for(const action of ['download','copy'])$(`[data-action="schedule-share-${action}"]`).disabled=false;
      status.textContent=`预览已生成（${width} × ${height}），请检查后下载或复制。复制不可用时仍可下载 PNG。`;
    }catch(error){if(scheduleShare===request&&$('#schedule-share-status'))status.textContent=`生成失败：${error.message}`;}
  }
  function downloadScheduleShare(){
    if(!scheduleShare?.blob)return;
    const a=document.createElement('a');a.href=scheduleShare.url;a.download=scheduleShare.filename;document.body.append(a);a.click();a.remove();
    $('#schedule-share-status').textContent='已请求浏览器下载 PNG；请在下载列表确认，移动端也可长按预览图片保存。';
  }
  async function copyScheduleShare(){
    const request=scheduleShare;if(!request?.blob||request.copying)return;
    const status=$('#schedule-share-status');
    if(!window.isSecureContext||!navigator.clipboard?.write||typeof ClipboardItem==='undefined'){
      status.textContent='当前环境不支持图片剪贴板（需要安全上下文及 ClipboardItem）。请使用下载 PNG。';return;
    }
    request.copying=true;$('[data-action="schedule-share-copy"]').disabled=true;
    try{await navigator.clipboard.write([new ClipboardItem({'image/png':request.blob})]);if(scheduleShare===request&&$('#schedule-share-status'))status.textContent='图片已成功写入剪贴板，可粘贴到支持图片的应用。';}
    catch(error){if(scheduleShare===request&&$('#schedule-share-status'))status.textContent=error.name==='NotAllowedError'?'复制未获授权或页面未处于活动状态，请允许剪贴板权限后重试，或下载 PNG。':'复制图片失败：浏览器或目标系统不支持本次写入。请下载 PNG。';}
    finally{request.copying=false;if(scheduleShare===request&&$('#schedule-share'))$('[data-action="schedule-share-copy"]').disabled=false;}
  }
  function loadDemoSchedule() {
    if(!seed.classes.length){toast('公开源码版未附带演示课表，请导入或手动添加自己的课程；已有数据未修改。');return;}
    if(!confirm('载入种子课表将替换当前个人课程。请先导出备份；仅移除失去对应课程的单课规则，其他数据保持不变。确认替换？'))return;
    const next=clone(state);next.classes=initialState().classes;
    const ids=new Set(next.classes.map(c=>c.id));next.scheduleRules.exceptions=next.scheduleRules.exceptions.filter(r=>ids.has(r.courseId));
    commitLocal(next,'已载入演示课表；仅清除不再有对应课程的单课规则，日期整体规则保留。');
  }
  function scheduleView() {
    const now=new Date(`${scheduleDate}T12:00:00`), monday=new Date(now);monday.setDate(now.getDate()-weekDay(now)+1);
    const weekDates=days.map((_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return d;});
    if(scheduleMobile.matches){
      const exams=weekExams(weekDates);
      const weekend=weekDates.slice(5).some(d=>coursesOn(localDate(d)).length>0)||exams.some(t=>weekDay(new Date(`${t.date}T12:00:00`))>5);
      const count=weekend?7:scheduleDays;
      const deadlines=exams.filter(t=>t.type!=='block').length;
      return `<section class="schedule-mobile" data-mode="${scheduleMode}"><div class="schedule-mobile-heading"><h2>${monday.getMonth()+1}/${monday.getDate()} 起 · 第 ${semesterWeek(scheduleDate)} 周</h2><details class="schedule-more"><summary>更多</summary><div class="schedule-more-panel"><button class="primary" data-action="import-classes">导入自己的课表</button><button data-action="add-class">＋ 手动添加课程</button><button data-action="add-exam">＋ 添加考试</button><a class="schedule-official-link" href="https://jwc.jxnu.edu.cn/" target="_blank" rel="noopener noreferrer">教务在线 ↗</a><p class="subtle">在学校官网查看通知及教务入口；不会自动同步课表</p><button data-action="appearance">课表背景与外观</button><button data-action="schedule-ics">导出课表 ICS</button><label>查看日期<input id="schedule-date" type="date" value="${scheduleDate}"></label><p class="subtle">公开源码版默认没有课程。请先设置实际第一教学周，再导入或添加课程；导入前请导出备份。临时调课规则在“管理临时调课与停课”设置；不自动套用校历节假日。</p>${termSettingsForm()}${calendarSettingsView()}<button data-action="school-calendar">查看完整校历</button></div></details></div><div class="schedule-week-tools" aria-label="切换周次"><button data-action="schedule-prev">前一周</button><button data-action="schedule-today">回本周</button><button data-action="schedule-next">后一周</button></div><div class="toolbar" aria-label="课表导入"><button class="primary" data-action="import-html-classes">教务网页导入</button><button data-action="import-classes">其他课表导入</button></div><button class="schedule-share-entry" data-action="schedule-share">导出本周图片 / 复制图片</button><div class="schedule-mode-tools" aria-label="课表显示方式"><button data-action="schedule-mode" aria-label="当前${scheduleMode==='compact'?'紧凑总览，切换到清晰阅读':'清晰阅读，切换到紧凑总览'}">${scheduleMode==='compact'?'清晰阅读':'紧凑总览'}</button><button data-action="schedule-days" aria-pressed="${count===7}" ${weekend?'disabled':''}>${weekend?'周末有安排 · 七天':count===5?'显示七天':'仅周一至五'}</button></div><p class="schedule-mobile-status">课程与考试 · ${exams.length} 项考试${deadlines?`（${deadlines} 项仅截止时间，见下方提醒）`:''}${weekend?' · 周末安排不可隐藏':''}</p>${scheduleGrid(weekDates.slice(0,count))}<details class="schedule-exam-details"><summary>考试提醒（${exams.length}）${deadlines?' · 有未填时段考试':''}</summary>${weekExamView(weekDates)}</details><details><summary>全部课程管理（包括本周未排课）</summary>${state.classes.map(courseView).join('')||empty('暂无课程。')}</details><p class="schedule-reading-help">点卡片查看完整名称、时间与编辑。系统超大字体或矮屏请用“清晰阅读”；紧凑模式按完整时间范围缩放，不保证所有屏幕一屏可读。考试来源见考试提醒；仅本机记录。</p></section>`;
    }
    return `<p class="section-intro">先设开学日期，再导入或添加课程。</p>${termSettingsForm()}<div class="toolbar"><button data-action="schedule-prev">前一周</button><button data-action="schedule-today">回本周</button><button data-action="schedule-next">后一周</button><label>教学周<select id="schedule-week">${Array.from({length:60},(_,i)=>`<option value="${i+1}" ${semesterWeek(scheduleDate)===i+1?'selected':''}>第 ${i+1} 周</option>`).join('')}</select></label><label>查看日期<input id="schedule-date" type="date" value="${scheduleDate}"></label><span>所选日期：第 ${semesterWeek(scheduleDate)} 周</span></div>${calendarSettingsView()}<p class="subtle">本页已统一应用个人周次与已保存的临时调课、补课和停课规则。校历事件需核对后启用。<button type="button" data-action="school-calendar">查看完整校历</button></p><section class="card"><div class="card-head"><h2>${monday.getMonth()+1}月 · 本周课表</h2><div class="toolbar schedule-actions"><button class="primary" data-action="import-html-classes">教务网页导入</button><button data-action="schedule-share">导出本周图片 / 复制图片</button><a class="schedule-official-link" href="https://jwc.jxnu.edu.cn/" target="_blank" rel="noopener noreferrer">教务在线 ↗</a><span class="subtle schedule-official-note">在学校官网查看通知及教务入口；不会自动同步课表</span><button class="primary" data-action="import-classes">导入自己的课表</button><button data-action="add-class">＋ 手动添加课程</button><button data-action="appearance">课表背景与外观</button><button data-action="schedule-ics">导出课表 ICS</button></div></div><details class="usage-help"><summary>导入与周次说明</summary><p class="subtle">课程按个人学期、起止周和单双周排课。示例周次不代表真实安排；导入前请核对并导出备份，已有课程不会自动替换。</p></details>${weekExamView(weekDates)}${scheduleGrid(weekDates)}<details><summary>全部课程管理（包括本周未排课）</summary>${state.classes.map(courseView).join('')||empty('暂无课程。')}</details></section><section class="card" style="margin-top:20px"><h2>作息参考</h2><div class="chips" style="margin:15px 0 0">${config.slots.map(s=>`<span class="badge">${escape(s.label)} ${escape(s.start)}–${escape(s.end)}</span>`).join('')}</div><p class="subtle" style="margin-top:15px">晚间为两个重叠的长时段选项，非连续两次上课。休息时刻未知，保留完整占用；不推测拆分。</p></section>`;
  }
  function remainingText(ms) {const n=Math.max(1,Math.ceil(Math.abs(ms)/60000));return `${ms<0?'逾期':'剩余'} ${n>=1440?Math.floor(n/1440)+'天 ':''}${Math.floor(n%1440/60)}时 ${n%60}分`;}
  function noticesView() {
    return `<p class="section-intro">记下作业与考试。手动整理，不自动同步。</p><div class="chips">${['全部','个人','学习通','考试','学业'].map(s=>`<button data-notice="${s}" aria-pressed="${noticeFilter===s}" class="${noticeFilter===s?'active':''}">${s}</button>`).join('')}<button data-action="add-task">＋ 手动录入</button><button data-action="ics">导出全部任务 ICS</button></div><div class="toolbar"><label>全文检索<input id="task-search" type="search" maxlength="120" value="${escape(taskQuery)}" placeholder="标题、日期、时间、分类、录入来源"></label><button data-action="notifications">${state.settings.notifications?'关闭到期通知':'点击申请浏览器通知'}</button></div><details class="task-explanation"><summary>提醒规则与使用边界</summary><p class="subtle" id="notification-status">截止待办在截止前 10 分钟及到期提醒；时段安排在开始前 10 分钟及开始时提醒，仅页面打开时检查；后台标签可能被浏览器节流，无关闭页面推送。</p></details><div id="task-groups" class="task-groups"></div>`;
  }
  function renderTasks() {
    if(!$('#task-groups'))return;
    const expanded=Array.from(document.querySelectorAll('#task-groups details[open]')).map(d=>d.className||'demo');
    const list=state.tasks.filter(t=>(noticeFilter==='全部'||t.source===noticeFilter)&&[t.title,t.date,t.time,t.startTime,t.endTime,t.type==='block'?'时段安排':'截止待办',taskStatus(t),t.source,t.origin==='manual'?'手动录入':'虚构种子'].join(' ').toLowerCase().includes(taskQuery.trim().toLowerCase())).sort(taskSort);
    const groups=[[],[],[],[],[]];list.forEach(t=>groups[t.done?4:new Date(`${t.date}T${taskEnd(t)}:00`).getTime()<=Date.now()?(t.type==='block'?1:0):t.date===dateAt()?2:3].push(t));
    $('#task-groups').innerHTML=deadlineOverview(list)+groups.map((g,i)=>i===4?`<details class="card completed-tasks"><summary>已完成（${g.length}）</summary>${g.map(taskView).join('')||empty('暂无任务。')}</details>`:g.length?`<section class="card"><h2>${['逾期截止待办','已结束未完成安排','今日','未来'][i]} <small>${g.length}</small></h2>${g.map(taskView).join('')}</section>`:'').join('');
    document.querySelectorAll('#task-groups details').forEach(d=>{if(expanded.includes(d.className||'demo'))d.open=true;});
    if(state.settings.notifications)$('#notification-status').textContent=`提醒已开启；浏览器权限：${'Notification' in window?Notification.permission:'不支持'}。仅页面打开时检查，不提供关闭页面推送。`;
  }
  function circleView() {
    return `<p class="section-intro">让物品被找回，也让校园里的小信息有个去处。</p><div class="chips">${[['lost','失物招领'],['market','二手闲置'],['jobs','校内兼职']].map(([key,label])=>`<button data-circle="${key}" aria-pressed="${circleFilter===key}" class="${circleFilter===key?'active':''}">${label}</button>`).join('')}</div>${circleFilter==='lost'?`<div class="warning">纯前端问答不能保密，也不是生产级防冒领：答案可被查看代码或导出读取。回答正确只进入“待人工核验”，不会交付物品。请勿输入真实证件号、他人姓名或联系方式。</div><div class="toolbar"><label>搜索失物<input id="lost-search" type="search" value="${escape(circleQuery)}" placeholder="物品、分类、地点关键词" maxlength="100"></label><button class="primary" data-action="add-lost">＋ 本机登记失物</button></div>${circleFilters()}<div class="feed-grid" id="lost-results"></div>`:`<div class="info-box">${circleFilter==='market'?'个人闲置仅为本机记录，不公开发布、不同步云、不联系卖家、不提供支付。请勿填写联系方式、真实身份或精确住址。示例只读。':'只读虚构条目 · 课程演示 · 不开放交易、发布、报名或联系。'}</div>${circleFilter==='market'?'<button class="primary" data-action="add-market">本机登记闲置</button>':''}<label>搜索<input id="circle-search" type="search" maxlength="100" value="${escape(circleQuery)}"></label>${circleFilters()}<div class="feed-grid" id="lost-results"></div>`}`;
  }
  function feedCard(item,lost) {
    if(circleFilter==='market')return `<article class="card feed-card"><span class="badge">${item.local?`本机登记 · ${escape(item.status)}`:'虚构演示 · 只读'}</span><h3>${escape(item.title)}</h3><p>${escape(item.description)}</p><small>${escape(circleItemCategory(item))}${item.local?` · ${escape(item.condition)} · ¥${(item.price/100).toFixed(2)}（记录价，非付款）`:''}</small><div class="item-actions"><button data-market-detail="${escape(item.id)}">查看详情</button>${item.local?`<button data-market-edit="${escape(item.id)}">编辑</button><button data-market-state="${escape(item.id)}" data-status="${item.status==='在架'?'已下架':'在架'}">${item.status==='在架'?'下架':'重新上架'}</button>${item.status!=='已转出'?`<button data-market-state="${escape(item.id)}" data-status="已转出">标记已转出</button>`:''}`:''}</div></article>`;
    return `<article class="card feed-card"><div class="feed-symbol" aria-hidden="true">${lost?'◇':circleFilter==='market'?'▱':'□'}</div><span class="badge">${escape(lost?`${item.type==='lost'?'寻物启事':'拾物招领'} · ${lostStatusLabel(item)} · ${item.local?'本机登记':'虚构演示 · 只读'}`:'课程演示 · 只读')}</span><h3>${escape(item.title)}</h3><p>${escape(item.description)}</p><small class="subtle">${escape(circleItemCategory(item))} · ${escape(item.place)}</small>${lost?`${item.local&&item.type==='found'&&item.status==='待认领'?`<br><button data-claim="${escape(item.id)}">认领问答演示 →</button>`:''}${item.local?editButtons('lost_items',item):''}`:''}</article>`;
  }
  function circleList(){const list=circleFilter==='lost'?state.lost_items:circleFilter==='market'?state.market_items:state.campus_jobs;return [...list,...(circleDemo[circleFilter]||[]).filter(d=>!list.some(l=>circleItemCategory(l)===d.category))];}
  function circleFilters(){
    const select=(name,label,values,value)=>`<label>${label}<select data-circle-select="${name}">${values.map(v=>`<option value="${escape(v)}" ${v===value?'selected':''}>${escape(v)}</option>`).join('')}</select></label>`;
    const categories=circleFilter==='market'?marketCategories:circleFilter==='lost'?lostCategories:[...new Set(circleList().map(l=>l.category))];
    const statuses=lostType==='寻物启事'?lostStatuses('lost'):lostType==='拾物招领'?lostStatuses('found'):[...lostStatuses('lost'),...lostStatuses('found')];
    return `<div class="circle-filters">${circleFilter==='lost'?select('type','模式',['全部','寻物启事','拾物招领'],lostType):''}${select('category','物品分类',['全部',...categories],circleCategory)}${circleFilter==='lost'?select('status','状态',['全部',...statuses],lostStatus):circleFilter==='market'?select('status','状态',['全部',...marketStatuses,'演示只读'],lostStatus):''}${select('source','来源',circleFilter!=='jobs'?['全部','本机登记','虚构演示']:['全部','虚构演示'],circleSource)}<button data-action="circle-clear">清除筛选</button></div><p id="circle-count" class="subtle" aria-live="polite"></p>`;
  }
  function renderLost(query=circleQuery) {
    if(!$('#lost-results'))return;
    const all=circleList(),categoryList=all.filter(l=>circleCategory==='全部'||circleItemCategory(l)===circleCategory);
    const list=categoryList.filter(l=>[l.title,circleItemCategory(l),l.place,l.description,l.condition,l.local&&circleFilter==='market'?(l.price/100).toFixed(2):''].join(' ').toLowerCase().includes(query.trim().toLowerCase())&&(circleSource==='全部'||(l.local?'本机登记':'虚构演示')===circleSource)&&(circleFilter!=='market'||lostStatus==='全部'||(l.local?l.status:'演示只读')===lostStatus)&&(circleFilter!=='lost'||((lostStatus==='全部'||lostStatusLabel(l)===lostStatus)&&(lostType==='全部'||l.type===(lostType==='寻物启事'?'lost':'found')))));
    $('#circle-count').textContent=`当前结果 ${list.length} 条 · 当前分类 ${categoryList.length} 条 · 本栏总计 ${all.length} 条（本机 ${all.filter(l=>l.local).length} / 虚构演示 ${all.filter(l=>!l.local).length}）；补充演示仅在内存展示，不写入个人记录。`;
    $('#lost-results').innerHTML=list.map(l=>feedCard(l,circleFilter==='lost')).join('')||`${empty('没有匹配的条目。')}<button data-action="circle-clear">一键清除筛选</button>`;
  }
  function localSelect(name,label,values,value){return `<label class="field">${label}<select name="${name}">${values.map(v=>`<option ${v===value?'selected':''} value="${escape(v)}">${escape(v)}</option>`).join('')}</select></label>`;}
  function marketModal(item){
    if(item&&!item.local)return;
    openModal(item?'编辑本机闲置':'本机登记闲置',`<form id="market-form" data-record="${escape(item?.id||'')}"><p>仅本机保存，不发布、不交易、不支付。不要填写联系方式、身份信息或精确地址。</p><label class="field">物品名称<input name="title" maxlength="80" required value="${escape(item?.title||'')}"></label>${localSelect('category','分类',marketCategories,item?.category)}${localSelect('condition','成色',marketConditions,item?.condition)}<label class="field">人民币记录价（元；0 表示无偿；非付款）<input name="price" type="number" min="0" max="100000" step="0.01" required value="${item?(item.price/100).toFixed(2):''}"></label><label class="field">物品说明<textarea name="description" maxlength="500" required>${escape(item?.description||'')}</textarea></label>${localSelect('status','状态',marketStatuses,item?.status)}${actions('保存本机记录')}</form>`);
  }
  let resourceQuery='',resourceKind='全部',resourceSubject='全部',resourceCollege='';
  function resourcesModal(){
    openModal('学习资料',`<div id="learning-info"></div><details class="learning-local-resources"><summary>我的本机链接 · 登记与管理</summary><p>培养方案 / 历年真题 / 模拟 / 笔记。仅本机索引，不是公共资源库，不同步云；不上传或下载 PDF，不代表学校背书。只收录有权分享的网页，拒绝密码、付费内部资料和泄题。</p><a href="https://jwc.jxnu.edu.cn/" target="_blank" rel="noopener noreferrer">教务在线（培养方案请自行核对学年与专业） ↗</a><div class="toolbar"><button data-action="add-resource">登记资料链接</button><label>搜索<input id="resource-search" type="search" maxlength="100" value="${escape(resourceQuery)}"></label></div><div class="circle-filters">${localSelect('resource-kind','资料类型',['全部',...resourceKinds],resourceKind)}${localSelect('resource-subject','公共课 / 专业课',['全部',...publicSubjects],resourceSubject)}<label>学院（自填关键词，不预设学院名）<input id="resource-college" maxlength="40" value="${escape(resourceCollege)}"></label></div><div id="resource-results"></div></details>`);window.CampusLearningInfo?.mount($('#learning-info'));renderResources();
  }
  function renderResources(){
    const el=$('#resource-results');if(!el)return;
    const list=state.resources.filter(r=>(resourceKind==='全部'||r.kind===resourceKind)&&(resourceSubject==='全部'||r.subject===resourceSubject)&&r.college.toLowerCase().includes(resourceCollege.trim().toLowerCase())&&[r.title,r.source,r.year,r.major,r.subject,r.college].join(' ').toLowerCase().includes(resourceQuery.trim().toLowerCase()));
    el.innerHTML=`<p class="subtle">匹配 ${list.length} / 本机 ${state.resources.length} 条</p>`+(list.map(r=>`<article class="card"><span class="badge">${escape(r.kind)} · 本机索引</span><h3>${escape(r.title)}</h3><p>${escape(r.subject)} · ${escape(r.college||'未指定学院')} · ${escape(r.year)} · ${escape(r.major||'未指定专业')}</p><p>来源：${escape(r.source)}；授权：${escape(r.license)}</p><a href="${escape(r.url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">打开来源网页 ↗</a><div class="item-actions"><button data-resource-edit="${escape(r.id)}">编辑</button><button class="danger" data-resource-delete="${escape(r.id)}">删除</button></div></article>`).join('')||empty('暂无资料索引。未预置或伪造历年真题、培养方案文档；请登记可分享的来源网页。'));
  }
  function resourceModal(item){
    const field=(name,label,max,required=true)=>`<label class="field">${label}<input name="${name}" maxlength="${max}" ${required?'required':''} value="${escape(item?.[name]||'')}"></label>`;
    openModal(item?'编辑本机资料索引':'登记可分享资料',`<form id="resource-form" data-record="${escape(item?.id||'')}">${field('title','资料名称',100)}${localSelect('kind','类型',resourceKinds,item?.kind)}${localSelect('subject','科目分类',publicSubjects,item?.subject)}${field('college','学院（可空，自填短名称）',40,false)}${field('year','年份 / 培养方案学年',30)}${field('major','专业（培养方案请填写）',60,false)}${field('source','来源名称',100)}${field('url','HTTP/HTTPS 来源网页（不填写下载地址、密码）',1000)}${field('license','授权 / 可分享依据说明',200)}<label><input name="shareable" type="checkbox" required> 我确认有权分享；不是泄题、付费内部或密码保护资料，不含个人信息。</label><p class="subtle">仅存本机网页链接索引，不上传下载文件，不验证或冒充学校认证。培养方案须自行核对学年和专业。</p>${actions('保存本机索引')}</form>`);
  }
  function termSettingsForm() {
    return `<form id="term-form" class="toolbar"><label>开学日期<input name="termStart" type="date" value="${state.settings.termStart}" required></label><button>保存学期设置</button></form>`;
  }
  function focusStatsText() {
    const records=state.focus.records.filter(r=>r.date===dateAt());
    return `今日投入 ${focusMinutes(records.reduce((s,r)=>s+r.minutes,0))} 分钟 · ${records.length} 次记录（完整 ${records.filter(r=>r.outcome!=='partial').length} 次） · 累计 ${focusMinutes(state.focus.records.reduce((s,r)=>s+r.minutes,0))} 分钟`;
  }
  let profileDraft=null, profileRequest=0, profileReader=null, profileImage=null;
  function clearProfileDraft() {
    profileRequest++;profileDraft=null;
    if(profileReader){const reader=profileReader;reader.onabort?.();reader.onload=reader.onerror=reader.onabort=null;if(reader.readyState===1)reader.abort();profileReader=null;}
    if(profileImage){const image=profileImage;image.onerror?.();image.onload=image.onerror=null;image.src='';profileImage=null;}
  }
  function profileAvatar(avatar) {
    if(avatar.kind==='image')return `<span class="profile-avatar"><img src="${escape(avatar.value)}" alt="本机头像" width="64" height="64"></span>`;
    const preset=profilePresets.find(([key])=>key===avatar.value)||profilePresets[0];
    return `<span class="profile-avatar profile-avatar-${preset[0]}" aria-label="${preset[2]}预设头像">${preset[0]==='local'?window.CampusBrand.mark('folio',false):escape(preset[1])}</span>`;
  }
  function profileModal() {
    openModal('编辑本机资料',`<form id="profile-form"><p class="subtle">只保存在此浏览器，不是真账号、学号或学校认证，不启用云同步。建议使用化名。</p><div id="profile-avatar-preview">${profileAvatar(state.profile.avatar)}</div><fieldset class="profile-presets"><legend>预设头像</legend>${profilePresets.map(([key,label,title])=>`<button type="button" data-profile-preset="${key}" aria-label="${title}" aria-pressed="${state.profile.avatar.kind==='preset'&&state.profile.avatar.value===key}"><span class="profile-avatar profile-avatar-${key}">${key==='local'?window.CampusBrand.mark('folio',false):escape(label)}</span></button>`).join('')}</fieldset><label class="field">上传本机图片<input id="profile-file" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" aria-describedby="profile-file-help"></label><p id="profile-file-help" class="subtle">JPG / PNG / WebP，最多 3 MiB；单边不超过 4096、总像素不超过 1600 万。缩小到 256×256 内并重新编码，拒绝 SVG 和远程 URL。选择后仅预览，保存前不会写入。</p><p id="profile-file-status" role="status" aria-live="polite"></p><label class="field">昵称（1–20 字符）<input name="nickname" value="${escape(state.profile.nickname)}" required autocomplete="off"></label><label class="field">自定义 ID（可空）<input name="customId" value="${escape(state.profile.customId)}" maxlength="24" pattern="[A-Za-z0-9_-]{3,24}" autocomplete="off" autocapitalize="none" spellcheck="false"></label><p class="subtle">ID 仅作本机展示，不保证全站唯一，不用于登录或身份验证。取消不会写入资料；JSON 备份会包含昵称、ID 和头像。</p>${actions('确认保存本机资料')}</form>`);
    profileDraft={...clone(state.profile),form:$('#profile-form'),busy:false};
  }
  function updateProfilePreview() {
    $('#profile-avatar-preview').innerHTML=profileAvatar(profileDraft.avatar);
    document.querySelectorAll('[data-profile-preset]').forEach(b=>b.setAttribute('aria-pressed',String(profileDraft.avatar.kind==='preset'&&b.dataset.profilePreset===profileDraft.avatar.value)));
  }
  async function selectProfileFile(input) {
    const file=input.files?.[0];input.value='';if(!file||!profileDraft||!$('#modal').open)return;
    const draft=profileDraft,form=draft.form;
    // 新请求主动释放旧解码；草稿对象和表单身份共同隔离关闭/重开竞态。
    const avatar=draft.avatar;clearProfileDraft();profileDraft=draft;draft.avatar=avatar;
    const request=profileRequest;
    const current=()=>profileDraft===draft&&profileRequest===request&&$('#modal').open&&$('#profile-form')===form;
    const status=$('#profile-file-status'),submit=form.querySelector('[type="submit"]')||form.querySelector('button.primary');
    draft.busy=true;if(submit)submit.disabled=true;status.textContent='正在检查并缩小图片…';
    try {
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||! /\.(jpe?g|png|webp)$/i.test(file.name)||file.size<1||file.size>3*1024*1024)throw Error('请选择不超过 3 MiB 的 JPG、PNG 或 WebP 本机文件。');
      const buffer=await file.arrayBuffer();if(!current())return;
      const info=rasterInfo(new Uint8Array(buffer));
      if(info.type!==file.type||info.width<1||info.height<1||info.width>4096||info.height>4096||info.width*info.height>16000000)throw Error('图片格式不符或尺寸超限：单边最多 4096，总像素最多 1600 万。');
      const data=await new Promise((resolve,reject)=>{
        const reader=profileReader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('图片读取失败，请重新选择。'));reader.onabort=()=>reject(Error('图片读取已取消。'));reader.readAsDataURL(new Blob([buffer],{type:info.type}));
      });
      if(!current())return;profileReader=null;
      const image=profileImage=new Image();image.decoding='async';
      await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('图片无法解码，请换一张图片。'));image.src=data;});
      if(!current())return;
      const w=image.naturalWidth,h=image.naturalHeight;
      if(!w||!h||w>4096||h>4096||w*h>16000000)throw Error('解码后的图片尺寸超限。');
      const scale=Math.min(1,256/w,256/h),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('浏览器无法处理图片，请使用预设头像。');
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
      const value=canvas.toDataURL('image/jpeg',0.82);
      const checked=validateProfile({nickname:draft.nickname,customId:draft.customId,avatar:{kind:'image',value}});
      draft.avatar=checked.avatar;updateProfilePreview();status.textContent='头像预览已就绪，点击确认保存才会更新。';
    } catch(error){if(current())status.textContent=error.message||'图片处理失败，请重新选择。';}
    finally {if(current()){draft.busy=false;if(submit)submit.disabled=false;if(profileReader){profileReader.onload=profileReader.onerror=profileReader.onabort=null;profileReader=null;}if(profileImage){profileImage.onload=profileImage.onerror=null;profileImage.src='';profileImage=null;}}}
  }
  function profileView() {
    const h=state.hydration, water=hydrationStats();
    const waterTotal=h.records.reduce((sum,r)=>sum+r.ml,0);
    const permission='Notification' in window?({granted:'已允许',denied:'已拒绝',default:'未申请'}[Notification.permission]||'未知'):'不支持';
    return `<section class="card mine-identity" aria-label="本机身份">${profileAvatar(state.profile.avatar)}<div class="profile-summary"><h2>${escape(state.profile.nickname)}</h2><p>${state.profile.customId?`本机 ID：${escape(state.profile.customId)}`:'未设置自定义 ID'} · 不保证全站唯一</p><p class="subtle">这是本机资料，不是学校认证。清除浏览器数据可能丢失记录。</p></div><button data-action="profile-settings">编辑本机资料</button></section>
      <section class="card" id="cloud-account" aria-label="我的账号与云备份"><h2>可选云登录</h2><p>云模块未加载时仍可使用本地工具。</p></section>
      <div class="mine-grid"><section class="card"><div class="card-head"><h2>我的记录</h2><a href="#home" class="text-button">去工作台</a></div><p id="mine-focus-stats">${focusStatsText()}</p><p>今日喝水 <strong>${water.cups}</strong> 杯 · <strong>${water.ml}</strong> ml（仅手动记录，不设每日目标）</p><p>累计喝水 <strong>${h.records.length}</strong> 杯 · <strong>${waterTotal}</strong> ml；关闭提醒不清空记录。</p><div class="mine-counts"><a href="#schedule">课程 <strong>${state.classes.length}</strong><small>全部安排</small></a><a href="#notices">待办 <strong>${state.tasks.length}</strong><small>未完成 ${state.tasks.filter(t=>!t.done).length}</small></a><a href="#circle">失物 <strong>${state.lost_items.length}</strong><small>本机登记 ${state.lost_items.filter(l=>l.local).length} · 含虚构示例</small></a></div></section>
      <section class="card"><h2>学期设置</h2>${termSettingsForm()}${calendarSettingsView()}<button data-action="school-calendar">查看完整校历</button><p class="subtle">仅影响个人排课；校历日期独立计算，不自动改写个人课程。</p></section>
      <section class="card"><div class="card-head"><h2>喝水提醒</h2><span class="badge">${h.enabled?'已开启':'已关闭'}</span></div><p>${h.start}–${h.end} · 每 ${h.interval} 分钟 · 默认 ${h.volume} ml / 杯</p><p class="subtle">系统通知${h.notifications?'已选择使用':'未启用'} · 浏览器权限：${permission}。仅页面打开且可见时提醒，关闭后无推送。</p><button data-action="hydration-settings">喝水设置与系统通知开关</button><p class="subtle">关闭提醒仍保留历史记录；请按自身需要和医嘱安排。</p></section>
      <section class="card"><div class="card-head"><h2>待办通知</h2><span class="badge">${state.settings.notifications?'已开启':'已关闭'}</span></div><p>浏览器系统通知权限：${permission}</p><button data-action="notifications">${state.settings.notifications?'关闭到期通知':'点击申请浏览器通知'}</button><p class="subtle">仅页面打开时检查；截止待办在截止前10分钟及到期提醒，时段安排在开始前10分钟及开始时提醒；后台可能节流，无关闭页面推送。应用开关与浏览器权限不同，拒绝后需在浏览器站点设置中调整。喝水开关独立。</p></section>
      <section class="card"><h2>数据与备份</h2><p>存储状态：${storageOK?'可用，仅此浏览器':'不可用，本次修改可能丢失，请导出备份'}</p><div class="toolbar"><button class="primary" data-action="export">导出 JSON 备份</button><button data-action="import">导入 JSON（覆盖）</button><button data-action="data">数据管理与重置</button></div><p class="subtle">JSON 导入会覆盖本机现有业务数据，校验后仍需确认；请先导出备份。备份含本机昵称、ID、头像及明文失物答案，请妥善保管。重置不是注销账号。</p></section>
      <section class="card"><h2>外观设置</h2><p>调整校园画面、课表背景、字号与动画。</p><button data-action="appearance">设置外观</button><a class="text-button" href="#focus">打开专注</a></section>
      <section class="card"><h2>导航页面</h2><p>选择导航中显示的页面，只隐藏入口，不删除记录。</p><button data-action="navigation-settings">管理页面</button></section>
      <section class="card"><h2>工作台与服务状态</h2><p>整理首页卡片，或查看各项服务状态。</p><div class="toolbar"><button data-action="dashboard-settings">整理工作台</button><button data-action="service-status">服务状态面板</button></div></section>
      <section class="card"><h2>版本与隐私</h2><p>师大 · 日常 v${escape(config.version)} · 非官方校园工具 · 早期 Alpha</p><button data-action="about">关于、近期更新与数据隐私边界</button><p class="subtle">本机功能可实际使用，部分栏目含示例。可选云登录与手动课程/待办备份入口，真人登录及跨设备恢复待验证，非学校认证；未登录仍可使用本地工具。天气仅在手动更新时联网；未接入校内业务接口。失物问答不是真实审核。</p></section></div>`;
  }
  function serviceStatuses() {
    const collected=weather.mode!=='demo'&&Number.isFinite(Date.parse(weather.collectedAt));
    return [
      {key:'schedule',title:'课表',status:'本机记录 / 含初始示例',description:`本机 ${state.classes.length} 门课程；支持手动编辑、CSV/TSV 和已保存的教务 HTML 本机解析，预览核对、补齐周次后去重追加；支持 ICS 导出和课表 PNG 分享。初始课程含示例，个人导入可为真实记录；未接入教务接口，不自动登录或同步。`,nav:'schedule'},
      {key:'cloud',title:'实验云账号与备份',status:'本源码版停用',description:'不加载云 SDK、不读取会话、不连接原作者服务。保留的实验代码尚未完成恢复与权限验收，请通过数据管理导出 JSON 手动备份。',nav:'profile'},
      {key:'notices',title:'通知',status:'本机手工 / 演示示例',description:`手工 ${state.tasks.filter(t=>t.origin==='manual').length} 条，示例 ${state.tasks.filter(t=>t.origin==='demo').length} 条，未完成 ${state.tasks.filter(t=>!t.done).length} 条；非学习通同步。`,nav:'notices'},
      {key:'weather',title:'天气',status:weather.mode==='demo'?'虚构演示':weather.mode==='cache'?'历史缓存（非实时）':'联网获取（非校园实测）',description:collected?`观测 ${weather.observedAt}；采集 ${new Date(weather.collectedAt).toLocaleString()}。仅表示上次获取，不代表持续连接。`:'固定样本；未采集，无实际观测。'},
      {key:'electricity',title:'电费',status:state.electricitySnapshot?'本机截图 / 非实时':'本机手工 / 可选演示',description:`本机 ${state.electricityRecords.length} 条余额记录；${state.electricitySnapshot?`独立截图 ${state.electricitySnapshot.daily.length} 天有效用电明细；`:'截图待主动载入；'}电控接口未接入，无自动查询或缴费。`},
      {key:'campusCode',title:'校园码',status:'站外操作指引 / 未接入',description:'用户实测学校工作台原入口正常，当前复制链接无法独立出码。请在企业微信切换江西师范大学，进入工作台→校园卡/校园码（入口名称以实际所见为准）。原码每分钟刷新，仅当面使用；本应用仅提供指引，不自动唤起、不代登录、不抓取或保存二维码及个人信息。'},
      {key:'library',title:'图书馆',status:'官方站外入口',description:'打开江西师范大学图书馆官网；借阅、座位预约等以官网为准，本应用不登录、不代办、不采集凭证。'},
      {key:'map',title:'地图',status:'第一版 / 公开地点选择',description:'提供 5 个公开地点的搜索与选择；腾讯底图和路线依赖网络与 WorkBuddy 代理，可能加载或请求失败。课程地点仅在点击查看时传入地图，入口与楼层未核验，不承诺已接通定位或精确到达教室。'},
      {key:'water',title:'智慧笑联',status:'未接入',description:'仅文字说明，无水机状态、订单或余额接口。本地喝水提醒独立，不代表智慧笑联连接。'},
      {key:'circle',title:'生活圈',status:'本机记录 / 只读演示',description:`失物本机登记 ${state.lost_items.filter(l=>l.local).length} 条；闲置本机 ${state.market_items.filter(m=>m.local).length} 条，其余闲置和兼职为只读虚构示例；不公开发布、不交易、不支付。`,nav:'circle'}
    ];
  }
  function campusCodeGuideModal() {
    openModal('校园码 / 入馆码 · 企业微信内打开',`<p>打开企业微信 → 切换江西师范大学 → 工作台 → 校园卡/校园码（入口名称以实际所见为准）。</p><p>原码每分钟刷新，仅当面使用。</p><p class="subtle">当前复制链接无法独立出码。本应用仅提供指引，不自动唤起、不代登录、不抓取或保存二维码及个人信息。</p>`);
  }
  function serviceStatusModal(key) {
    const items=serviceStatuses().filter(s=>!key||s.key===key);
    if(!items.length)return;
    openModal(key?items[0].title+' · 服务说明':'服务状态面板',`<p>区分本机记录、演示样本、站外入口与未接入能力；此面板不是服务探活。浏览器提示在线不代表接口或站外页面可用，天气时间仅表示上次采集。查看说明无需登录；可选云账号在独立账号区操作，真人跨设备流程待验。</p><div class="service-status-list">${items.map(s=>`<section><div class="card-head"><h3>${s.title}</h3><span class="badge">${s.status}</span></div><p>${escape(s.description)}</p>${s.nav?`<button data-nav="${s.nav}" data-action="close">打开现有页面</button>`:''}</section>`).join('')}</div>`);
  }
  function serviceCard(title,status,description,control) {
    return `<section class="card service-card"><div class="card-head"><h2>${title}</h2><span class="badge">${status}</span></div><p class="service-description">${escape(description)}</p>${control}</section>`;
  }
  let servicesSection='overview';
  const servicesScroll=new Map([['overview',0],['electricity',0]]);
  let servicesReturnSelector='',servicesTransition=0;
  function setServicesSection(section,trigger=null) {
    if(!['overview','electricity'].includes(section))return;
    const inServices=view==='services',previous=servicesSection;
    if(inServices){
      servicesScroll.set(previous,window.scrollY);
      if(previous==='overview'&&section==='electricity'&&trigger){
        const scope=trigger.closest('.campus-link-group')?'.campus-link-group':trigger.closest('.campus-digest')?'.campus-digest':trigger.closest('.service-pins')?'.service-pins':'.sidebar';
        servicesReturnSelector=scope+' [data-campus-electricity]';
      }
    }
    servicesSection=section;
    if(inServices)render();else{location.hash='services';navigate('services');}
    const token=++servicesTransition;
    const restore=()=>{
      if(token!==servicesTransition||view!=='services'||servicesSection!==section)return;
      const title=$('#services-detail-title');
      const focus=section==='overview'?$(servicesReturnSelector||'#services-detail-title')||title:title;
      focus?.focus?.({preventScroll:true});
      const top=section==='overview'?(servicesScroll.get('overview')||0):Math.max(0,(title?.getBoundingClientRect().top||0)+window.scrollY-92);
      window.scrollTo({top,behavior:'instant'});routeScroll.set('services',window.scrollY);
    };
    restore();requestAnimationFrame(restore);
  }
  const electricityGuideURL='https://fwpj.jxnu.edu.cn/Bspj_Sx.aspx?ksh=62A78EAFDD128D97&sxh=A789E73CA762BD07';
  function officialElectricityGuide(){
    openModal('电费查询与充值',`<p>请在微信按宿舍楼栋进入，查询与缴费均在原平台完成。</p><ul class="electricity-guide"><li><strong>1—15栋</strong><br>公众号“江西师范大学后勤服务” → 后勤微服务平台 → 1—15栋电费 → 水电管理。</li><li><strong>16栋</strong><br>小程序“农行微缴费” → 电费 → 江西师范大学瑶湖校区电费充值。余额可向后勤服务大厅查询。</li><li><strong>17—19栋</strong><br>小程序“师大新三栋用电管理” → 绑定电表。</li></ul><div class="toolbar"><button data-action="copy-electricity-account">复制公众号名称</button><a href="${electricityGuideURL}" target="_blank" rel="noopener noreferrer">学校办事指南 ↗</a><a href="tel:079188120660">后勤服务大厅：0791-88120660</a></div><p id="electricity-guide-status" role="status">原直链暂未验证可用，不再自动跳转。绑定及缴费前请核对楼栋寝室。</p><details><summary>适用范围与原直链</summary><p>依据学校公开办事指南整理，适用于瑶湖校区上述楼栋；菜单如有变化，以学校后勤最新通知为准。本应用不读取学校密码、宿舍绑定或余额。</p><p>历史地址（不建议直接登录或付款）：<code>http://bd.bdfairy.cn/selectservice</code>。本次未证实其可用，不替换为猜测的HTTPS地址。</p></details>`);
  }
  function campusShell(detail) {
    return `<div class="campus-workspace"><div id="campus-main" class="campus-main">${detail}</div></div>`;
  }
  function campusCourseSummary() {
    const todayList=todayCourses(),date=dateAt(todayList.length?0:1);
    const courses=todayList.length?todayList:coursesOn(date);
    const week=semesterWeek(date);
    return {date,courses,label:todayList.length?'今日安排':'今日无课 · 明日安排',week:week>0?`第 ${week} 周 · ${week%2?'单周':'双周'}`:'学期开始前 · 不计单双周'};
  }
  function syncSidebarSummary() {
    const panel=$('.sidebar-overview');
    if(!panel)return;
    const {date,courses,label,week}=campusCourseSummary(),snapshot=state.electricitySnapshot;
    const html=`<a class="sidebar-course-summary" href="#schedule"><strong>${label} · ${courses.length} 门</strong><small>${date} · ${week}</small>${courses.slice(0,2).map(c=>`<span>${escape(c.start)} ${escape(c.title)}</span>`).join('')||'<span>暂无课程安排</span>'}${courses.length>2?`<small>另 ${courses.length-2} 门，查看课表 →</small>`:''}<small>本机课表 · 由你录入，非同步</small></a><button class="sidebar-power-summary" data-campus-electricity><strong>电费 ${snapshot?`¥ ${money(snapshot.balance)}`:'暂无已确认快照'}</strong><small>${snapshot?`截图非实时 · ${escape(snapshot.platformTime)}`:'打开详情载入截图或手工记录'}</small></button>`;
    if(panel.innerHTML!==html)panel.innerHTML=html;
  }
  function campusSummaryView() {
    const {date,courses,label,week}=campusCourseSummary(),snapshot=state.electricitySnapshot;
    const tasks=state.tasks.filter(t=>!t.done&&t.origin==='manual'&&(t.source==='考试'||t.type!=='block')&&t.date>=dateAt()&&t.date<=dateAt(7)&&new Date(`${t.date}T${taskEnd(t)}:00`).getTime()>=Date.now()).sort(taskSort);
    return `<div class="campus-digest"><section class="campus-digest-card campus-course-list" aria-label="课程安排摘要"><a class="campus-digest-heading" href="#schedule"><strong>${icon('calendar')}${label} <small>${courses.length} 门</small></strong><span>课表 →</span></a><p class="campus-digest-meta">${date} · 周${days[weekDay(new Date(`${date}T12:00:00`))-1]} · ${week}</p>${courses.slice(0,4).map(c=>`<a class="campus-course-row ${courseColor(c)}" href="#schedule"><span><strong>${escape(c.title)}</strong><small>${escape(roomName(c.roomId,c.location))} · ${{all:'每周',odd:'单周',even:'双周'}[c.parity]}</small></span><time>${escape(c.start)}<small>${escape(c.end)}</small></time></a>`).join('')||'<p class="campus-digest-empty">明日也暂无课程安排</p>'}<p class="campus-digest-meta">本机课表 · 由你录入，非教务同步${courses.length>4?` · 另 ${courses.length-4} 门见课表`:''}</p></section>
      <button class="campus-digest-card campus-power-row" data-campus-electricity><span>${icon('grid')}</span><span><strong>电费 ${snapshot?`¥ ${money(snapshot.balance)}`:'暂无已确认截图'}</strong><small>${snapshot?`快照非实时 · ${escape(snapshot.platformTime)}`:'进入详情载入截图；不展示演示余额'}</small></span><span aria-hidden="true">›</span></button>
      <section class="campus-digest-card campus-task-list"><a class="campus-digest-heading" href="#notices"><strong>${icon('bell')}临近考试 / 作业</strong><span>${tasks.length?`${tasks.length} 项 · `:''}查看 →</span></a>${tasks.slice(0,2).map(t=>`<a class="campus-task-row" href="#notices"><strong>${escape(t.title)}</strong><small>${escape(t.date.slice(5))} ${escape(taskStart(t))}${t.type==='block'?`–${escape(taskEnd(t))}`:' 截止'} · ${escape(t.source)}</small></a>`).join('')||'<p class="campus-digest-empty">未来 7 天暂无未结束的手工考试或作业</p>'}${tasks.length?'<p class="campus-digest-meta">手工录入 · 未同步教务 / 学习通</p>':''}</section></div>`;
  }
  function freshmanGuideModal() {
    let html;
    try {
      if(typeof window.CampusFreshmanGuide?.render!=='function')throw Error('指南模块未加载');
      html=window.CampusFreshmanGuide.render({escape});
    } catch {
      html='<p role="alert">新生入学指南暂不可用：指南脚本未加载或内容构建失败，请刷新页面重试；其他本机工具仍可使用。</p>';
    }
    openModal('新生入学指南',html);
  }
  function campusServiceGrid() {
    const group=(title,entries)=>`<section class="campus-link-group"><h3>${title}</h3><div class="campus-service-grid">${entries.map(([key,note])=>{const entry=serviceCatalog.find(s=>s[0]===key);if(!entry)return '';const [,label,img,attrs]=entry;const content=`${icon(img)}<span>${escape(label)}<small>${escape(note)}</small></span>`;return attrs.startsWith('href=')?`<a ${attrs}>${content}</a>`:`<button ${attrs}>${content}</button>`;}).join('')}</div></section>`;
    return `<div class="campus-navigation"><p class="subtle">选择服务；学校账号只在对应官方页面输入。</p>${group('学习教务',[['academic','选课、成绩、培养方案等；需官方登录'],['library','馆藏、电子资源与预约入口'],['schedule','本机课表，非教务自动同步'],['notices','本机考试与作业安排'],['resources','推免、转专业、比赛信息与本机资料链接']])}${group('学生事务',[['freshman-guide','入学八节自查 · 非官方整理 · 可设置置顶'],['hall','综合办事入口；需学校账号'],['student-affairs','请假、离返校、奖助等；需学校认证']])}${group('校园生活',[['campus-map','5 个公开地点可搜索选择；底图与路线依网络及代理'],['official-electricity','按楼栋查看微信办理路径'],['campus-code','企业微信学校工作台内打开'],['sports','官方产品网站与 App 使用指引'],['electricity','本机记录及截图快照，非实时查询'],['hydration','自选本机提醒，不连接饮水设备'],['circle','失物与闲置本机记录／示例']])}${group('学校信息',[['university','学校公告及各部门入口'],['youth','活动、志愿实践与科创通知'],['calendar','内置校历，非实时同步']])}${group('工具与帮助',[['vpn','校外资源访问；需账号及可能的额外验证'],['focus','本机专注计时'],['sources','接入状态和使用边界'],['profile','个人资料、外观与数据设置']])}<details><summary>入口打不开？</summary><p class="subtle">部分服务需要校园网、VPN或微信内打开。可回到学校官网查找最新入口；本应用不代登录或代办。</p></details></div>`;
  }
  function servicesDetailView() {
    if(servicesSection==='electricity')return `<div class="services-detail"><div class="dashboard-toolbar"><button data-services-section="overview">← 服务总览</button><h2 id="services-detail-title" tabindex="-1">电费详情</h2></div>${electricityView()}</div>`;
    return `<section class="campus-overview" aria-label="校园服务集中页"><h2 id="services-detail-title" class="campus-overview-title" tabindex="-1">校园信息</h2><button class="freshman-guide-entry" data-action="freshman-guide">${icon('building')}<span><strong>新生入学指南</strong><small>报到、学习、住宿与安全 · 非官方整理 · 2026-11-17 核对</small></span><span aria-hidden="true">›</span></button>${campusSummaryView()}${campusServiceGrid()}</section>`;
  }
  function servicesView() {
    const pins=state.servicePins.map(key=>serviceCatalog.find(s=>s[0]===key)).filter(s=>!s[4]||!state.navigation.hidden.includes(s[4]));
    const tiles=pins.map(([key,label,img,attrs])=>attrs.startsWith('href=')?`<a ${attrs}>${icon(img)}<span>${label}</span></a>`:`<button ${attrs}>${icon(img)}<span>${label}</span></button>`).join('');
    return campusShell(`<section class="service-pins"><div class="dashboard-toolbar"><h2>个人常用服务</h2><button data-action="service-pins-settings">设置置顶</button></div><p class="subtle">把常用入口放在这里，最多6个。</p>${tiles?`<div class="campus-service-grid">${tiles}</div>`:'<p class="subtle">暂无可显示的置顶；下方原服务清单保持不变。</p>'}</section>${servicesDetailView()}`);
  }
  function validateElectricitySnapshot(s){
    const exact=(o,keys)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).length!==keys.length||!keys.every(k=>Object.prototype.hasOwnProperty.call(o,k)))throw Error('截图电费字段缺失或含未知字段。');};
    const amount=n=>Number.isFinite(n)&&n>=0&&n<=100000000&&Math.abs(n*100-Math.round(n*100))<.000001;
    exact(s,['source','platformTime','balance','prepaid','subsidy','meterReading','monthly','daily']);
    if(s.source!=='screenshot'||typeof s.platformTime!=='string'||!/^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(s.platformTime)||!dateValid(s.platformTime.slice(0,10))||!['balance','prepaid','subsidy','meterReading'].every(k=>amount(s[k]))||Math.abs(s.balance-s.prepaid-s.subsidy)>.000001)throw Error('截图余额、读数或中国本地时间无效。');
    const m=s.monthly;exact(m,['month','startReading','endReading','kwh','cost']);
    if(typeof m.month!=='string'||!/^\d{4}-\d{2}$/.test(m.month)||!dateValid(m.month+'-01')||m.month>=s.platformTime.slice(0,7)||!['startReading','endReading','kwh','cost'].every(k=>amount(m[k]))||m.endReading<m.startReading||m.endReading>s.meterReading||Math.abs(m.endReading-m.startReading-m.kwh)>.000001)throw Error('截图月账单无效。');
    if(!Array.isArray(s.daily)||s.daily.length>366)throw Error('截图每日明细无效。');
    let previous='';
    for(const d of s.daily){exact(d,['date','kwh','cost']);if(!dateValid(d.date)||d.date<=previous||d.date>s.platformTime.slice(0,10)||!amount(d.kwh)||!amount(d.cost))throw Error('截图日明细日期、用量或费用无效。');previous=d.date;}
    return clone(s);
  }
  let electricityPreview=null;
  function electricitySnapshotView(s,preview=false){
    if(!s)return seed.electricitySnapshot?`<section class="electricity-snapshot"><h3>截图数据待载入</h3><p>本机有 ${seed.electricitySnapshot.daily.length} 天有效用电明细可先预览；尚未写入个人记录。</p><button data-action="electricity-preview">载入截图数据</button></section>`:`<section class="electricity-snapshot"><h3>暂无截图数据</h3><p>暂无截图快照，可先记一笔余额。</p></section>`;
    const m=s.monthly,total=s.daily.reduce((n,d)=>n+d.kwh,0),cost=s.daily.reduce((n,d)=>n+d.cost,0),max=Math.max(1,...s.daily.map(d=>d.kwh));
    const chart=s.daily.length?`<div class="electricity-plot"><svg viewBox="0 0 680 280" role="img" aria-label="每日真实用电量柱状图，单位度 / kWh，费用另列"><text x="16" y="20">用电量（度 / kWh）</text><path class="electricity-grid" d="M48 225H668"/>${s.daily.map((d,i)=>{const slot=610/s.daily.length,x=48+slot*(i+.5),h=d.kwh/max*155;return `<g><title>${d.date}：${money(d.kwh)} kWh；费用 ${money(d.cost)} 元</title><rect class="electricity-usage-bar" x="${x-slot*.28}" y="${225-h}" width="${slot*.56}" height="${h}" rx="4"/><text x="${x}" y="${215-h}" text-anchor="middle">${money(d.kwh)}</text><text x="${x}" y="249" text-anchor="middle">${d.date.slice(5)}</text></g>`;}).join('')}</svg></div>`:empty('没有有效日明细；缺失日期不补零，不生成趋势。');
    return `<section class="electricity-snapshot"><div class="electricity-heading"><h3>${preview?'截图导入预览':'真实用电量'}</h3><span class="badge">截图导入·非实时${preview?' · 尚未保存':''}</span></div><p>平台数据时间：<strong>${escape(s.platformTime)}</strong>（中国本地文本，非当前时间）</p><div class="electricity-summary"><p>截图余额（人民币）</p><div class="electricity-balance">¥ ${money(s.balance)}</div><p>预付 ${money(s.prepaid)} 元 · 补助 ${money(s.subsidy)} 元</p><p>累计电表读数：${money(s.meterReading)} kWh（不是本月用电量）</p></div><h4>有效日用电量 · ${s.daily.length} 天</h4>${chart}<p>仅以上有效记录合计：${money(total)} 度 / kWh；费用另计 ${money(cost)} 元，不与用量混轴。</p><div class="electricity-usage-table"><table><thead><tr><th>日期</th><th>用电量（kWh）</th><th>费用（元）</th></tr></thead><tbody>${s.daily.map(d=>`<tr><td>${escape(d.date)}</td><td>${money(d.kwh)}</td><td>${money(d.cost)}</td></tr>`).join('')}</tbody></table></div><h4>${escape(m.month)} 月账单</h4><p>起读 ${money(m.startReading)} → 末读 ${money(m.endReading)} kWh<br>月用电 ${money(m.kwh)} 度 / kWh · 金额 ${money(m.cost)} 元</p><p class="subtle">截图中的重复 -- 行不导入，也不当作零。余额仅一个快照，不虚构余额历史；手工余额独立列在下方，二者不合并、不自动选择最新、不推算耗电。没有自动 OCR、登录或充值。</p>${preview?'<button data-action="close">取消</button> <button data-action="electricity-confirm">确认载入这份截图数据</button>':s?'<button data-action="electricity-preview">替换截图数据（先预览）</button> <button data-action="electricity-clear">清除已载入截图（需确认）</button>':''}</section>`;
  }
  function previewElectricitySnapshot(){
    if(!seed.electricitySnapshot){toast('公开版未附带个人用电截图，已有本机记录保持不变。');return;}
    electricityPreview=validateElectricitySnapshot(seed.electricitySnapshot);
    openModal('载入截图数据',electricitySnapshotView(electricityPreview,true));
  }
  function confirmElectricitySnapshot(){
    if(!electricityPreview||!$('#modal').open||$('#modal-title').textContent!=='载入截图数据')return;
    const incoming=validateElectricitySnapshot(electricityPreview);
    if(!confirm(`${state.electricitySnapshot?'替换已载入的截图快照':'载入截图快照'}（${incoming.daily.length} 天有效记录）？只写入独立截图字段，不覆盖任何手工余额。${protectedArchive?'原存档受保护，仅留当前页面。':''}`))return;
    state.electricitySnapshot=incoming;electricityPreview=null;electricityMode='personal';
    const persisted=save();$('#modal').close();render();savedFeedback(persisted,'已载入截图数据，非实时；手工记录保持不变。');
  }
  let electricityDays=null, electricitySelected='', electricityMode=null;
  function electricityDemoRecords(){
    // 固定金额规则：首日80元，每天减少2元；距今天第5天充值50元。
    return Array.from({length:30},(_,i)=>({id:`electricity-demo-${dateAt(i-29)}`,date:dateAt(i-29),balance:80-2*i+(i>=24?50:0)}));
  }
  const money = value => (Object.is(value,-0)?0:value).toFixed(2);
  function electricityModel(){
    const mode=electricityMode||'personal';
    if(electricityDays===null)electricityDays=mode==='demo'?30:7;
    const records=(mode==='demo'?electricityDemoRecords():state.electricityRecords).map((record,index)=>({record,index})).sort((a,b)=>a.record.date.localeCompare(b.record.date)||a.index-b.index).map(x=>x.record);
    const daily=new Map();records.forEach(r=>daily.set(r.date,r));
    const end=dateAt(),start=dateAt(1-electricityDays),last=records.filter(r=>r.date<=end).at(-1);
    const points=[...daily.values()].filter(r=>r.date>=start&&r.date<=end);
    const selected=points.find(r=>r.id===electricitySelected)||points[points.length-1];
    return {mode,records,last,start,end,points,selected};
  }
  function electricityChart(model){
    const {points,selected,start,end}=model;
    if(!points.length)return empty('此时间范围暂无手工记录；不会补入示例或缺失日期余额。');
    const values=points.map(r=>r.balance),low=Math.min(...values),high=Math.max(...values),padding=Math.max((high-low)*.15,1),min=low-padding,max=high+padding;
    const dayNumber=date=>Date.parse(date+'T00:00:00Z')/86400000;
    const x=r=>64+(dayNumber(r.date)-dayNumber(start))/(electricityDays-1)*596;
    const y=r=>220-(r.balance-min)/(max-min)*184;
    const line=points.map((r,i)=>`${i?'L':'M'}${x(r).toFixed(2)},${y(r).toFixed(2)}`).join(' ');
    const ticks=[max,(max+min)/2,min].map(value=>{const cy=220-(value-min)/(max-min)*184;return `<path class="electricity-grid" d="M64 ${cy}H660"/><text x="54" y="${cy+4}" text-anchor="end">${money(value)}</text>`;}).join('');
    return `<div class="electricity-plot"><svg viewBox="0 0 680 262" aria-label="${model.mode==='demo'?'演示':''}人民币余额趋势图，${points.length}个记录日；下方按钮可选择数据点" role="group"><defs><linearGradient id="electricity-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".24"/><stop offset="100%" stop-color="currentColor" stop-opacity=".02"/></linearGradient></defs>${ticks}${points.length>1?`<path class="electricity-area" d="${line} L${x(points[points.length-1]).toFixed(2)},220 L${x(points[0]).toFixed(2)},220 Z"/><path class="electricity-line" d="${line}"/>`:''}<path class="electricity-guide" d="M${x(selected)} 24V220"/>${points.map(r=>`<circle class="electricity-dot ${r.id===selected.id?'is-selected':''}" cx="${x(r)}" cy="${y(r)}" r="${r.id===selected.id?5:3}"/><foreignObject x="${x(r)-14}" y="${y(r)-14}" width="28" height="28"><button xmlns="http://www.w3.org/1999/xhtml" class="electricity-hit" data-electricity-point="${escape(r.id)}" aria-pressed="${r.id===selected.id}" aria-label="${escape(r.date)}，人民币余额 ${money(r.balance)} 元"></button></foreignObject>`).join('')}<text x="64" y="252">${start.slice(5)}</text><text x="660" y="252" text-anchor="end">${end.slice(5)}</text></svg></div>${points.length===1?'<p class="subtle">仅有一个记录日，展示真实数据点，暂不能形成趋势。</p>':''}`;
  }
  function electricityForm(item){
    return `<form id="electricity-form" ${item?`data-edit="${escape(item.id)}"`:''} class="toolbar"><label>记录日期<input name="date" type="date" value="${item?escape(item.date):dateAt()}" required></label><label>人民币余额（元，可为负）<input name="balance" type="number" min="-100000" max="100000" step="0.01" value="${item?money(item.balance):''}" required></label><button type="submit">${item?'保存修改':'记录余额'}</button></form>`;
  }
  function editElectricityModal(item){openModal('编辑手工余额',`<p>只修改这条本机记录，不改变同日追加顺序，不连接学校。</p>${electricityForm(item)}`);}
  function electricityDailyRows(points,selected,demo=false){
    return points.map(r=>`<button class="electricity-day ${r.id===selected?.id?'is-selected':''}" data-electricity-point="${escape(r.id)}" aria-pressed="${r.id===selected?.id}"><time>${escape(r.date)}</time><span>${demo?'演示人民币余额':'余额'} <strong>¥ ${money(r.balance)}</strong></span></button>`).join('');
  }
  function electricityView(){
    const model=electricityModel(),{mode,records,last,points,selected}=model,demo=mode==='demo';
    const personalRecords=demo?[]:records;
    return `<section class="electricity-panel" aria-label="电费小账本"><div class="electricity-official"><button class="primary electricity-official-link" data-action="official-electricity-guide">查询 / 充值指引</button><p>微信按楼栋办理；本页仅记账，不自动查询或缴费。</p></div><div class="electricity-heading"><h2>电费小账本</h2><span>${demo?'演示预览 · 非个人记录':state.electricitySnapshot?'个人模式 · 截图与手工分列':'个人模式 · 手工记录'} · 未接入学校</span></div><div class="electricity-ranges" role="group" aria-label="电费数据模式"><button data-electricity-mode="personal" aria-pressed="${!demo}">个人记录</button><button data-electricity-mode="demo" aria-pressed="${demo}">演示预览</button><button data-action="add-electricity">新增个人余额记录</button></div>${!demo||!state.electricitySnapshot?electricitySnapshotView(demo?null:state.electricitySnapshot):'<p class="subtle">已载入截图保留在个人模式；演示统计不含截图。</p><button data-action="electricity-preview">载入截图数据（先预览，需确认替换）</button>'}${!demo?'<h3>独立手工余额记录（不与截图余额合并）</h3>':''}${demo?`<p class="subtle">以下核心卡、图表及每日记录均为演示人民币余额，不是真实账户或耗电量。最近30天固定样例：首日80元，每天减少2元，${dateAt(-5)} 模拟充值50元（当日净上升48元）。仅内存预览，不保存、不导出、不参与告警或个人统计，不覆盖个人记录。</p>`:''}<div class="electricity-summary"><p>${demo?'演示人民币余额':'最近记录余额'} <small>人民币 / 元</small></p><div class="electricity-balance">${last?`<span>¥</span> ${money(last.balance)}`:'— —'}</div><p>更新于：${last?escape(last.date)+(demo?'（演示样例日期）':'（手工记录日期，未记录时分）'):'暂无记录'}</p><small>${demo?'演示人民币余额 · 不保存、不代表个人余额':'非实时余额 · 仅保存在本机，不收集宿舍身份资料'}</small></div>${!demo&&last&&last.balance<state.settings.lowBalance?'<div class="warning">最近手工余额低于阈值，请自行核实；负数表示手工记录的欠费余额。</div>':''}<section class="electricity-trend"><div class="electricity-heading"><div><h3>${demo?'演示人民币余额趋势':'人民币余额趋势'}</h3><small>近 ${electricityDays} 天 · ${points.length} 个记录日</small></div><div class="electricity-ranges" role="group" aria-label="趋势时间范围">${[7,30].map(n=>`<button data-electricity-range="${n}" aria-pressed="${electricityDays===n}">${n} 天</button>`).join('')}</div></div><div id="electricity-selection" class="electricity-selection" aria-live="polite">${selected?`<time>${escape(selected.date)}</time><strong>¥ ${money(selected.balance)} <small>元</small></strong>`:'暂无可选记录'}</div>${electricityChart(model)}<p class="subtle">每日取同日最后追加的一笔；未记录日不补值，连线仅连接记录点，不代表每日变化。不据此推算耗电量或可用天数。</p></section><section class="electricity-details"><h3>${demo?'演示人民币余额每日记录':'最近每日记录'} <small>近 ${electricityDays} 天 · 同日末笔</small></h3>${points.length?`<div class="electricity-day-list">${electricityDailyRows(points.slice().reverse().slice(0,5),selected,demo)}</div>${points.length>5?`<details class="electricity-more" ${points.slice(0,-5).some(r=>r.id===selected?.id)?'open':''}><summary>查看更多每日记录（${points.length-5}）</summary><div class="electricity-day-list">${electricityDailyRows(points.slice().reverse().slice(5),selected,demo)}</div></details>`:''}`:empty('暂无每日明细，请手工添加余额。')}</section><details class="electricity-manage"><summary>新增记录与低余额设置</summary>${electricityForm()}<form id="threshold-form" class="toolbar"><label>低余额阈值（元）<input name="threshold" type="number" min="0" max="100000" step="0.01" value="${state.settings.lowBalance}" required></label><button>保存阈值</button></form></details><details class="electricity-manage"><summary>${demo?'个人记录管理（请切到个人模式）':`全部手工记录（${personalRecords.length}）· 编辑 / 删除`}</summary><p class="subtle">同日后追加的为最新；编辑不调整追加顺序。余额上升可能来自充值或修正，不能认定为耗电。未来日期仅在此保留，不进入近7/30天趋势。</p>${personalRecords.length?personalRecords.slice().reverse().map(r=>`<div class="electricity-record"><span>${escape(r.date)} · ¥ ${money(r.balance)}</span>${editButtons('electricityRecords',r)}</div>`).join(''):empty(demo?'演示样例不可编辑或删除；切到个人模式管理已有手工记录。':'还没有手工余额记录。')}</details></section>`;
  }
  let campusMapSession=null;
  function clearCampusMap() {
    const session=campusMapSession;
    campusMapSession=null;
    $('#modal').classList.remove('campus-map-modal');
    if(session?.cleanup){try{session.cleanup();}catch(error){console.warn('校园地图清理失败',error);}}
  }
  function campusMapModal(course=null) {
    const module=window.CampusMap;
    if(typeof module?.shell!=='function'||typeof module?.mount!=='function'){toast('校园地图模块未加载，请刷新后重试。');return;}
    const locationText=course?roomName(course.roomId,course.location):'';
    let html;
    try{html=module.shell({locationText,canGoBack:!!course});}catch{toast('校园地图内容构建失败，请稍后重试。');return;}
    openModal('校园地图',html);
    $('#modal').classList.add('campus-map-modal');
    const session={cleanup:null};
    campusMapSession=session;
    const onBack=course?()=>{
      if(campusMapSession!==session||!$('#modal').open)return;
      courseDetailModal(course);
      $('#modal-body [data-course-map]')?.focus({preventScroll:true});
    }:null;
    try{
      const cleanup=module.mount($('#modal-body'),{locationText,onBack});
      if(campusMapSession===session)session.cleanup=cleanup;else cleanup?.();
    }
    catch{if(campusMapSession!==session)return;clearCampusMap();openModal('校园地图暂不可用','<p role="alert">地图初始化失败，请关闭后重试。底图与路线依赖网络和代理，其他本机工具不受影响。</p>');}
  }
  function openModal(title,html) {clearCampusMap();if(clearHTMLImport){clearHTMLImport();clearHTMLImport=null;}clearScheduleShare();clearProfileDraft();clearWallpaperDraft();$('#modal').classList.remove('school-calendar-modal');$('#modal-title').textContent=title;$('#modal-body').innerHTML=html;$('#modal').showModal();if(title==='外观设置'){wallpaperDraft={image:state.appearance.scheduleImage,busy:false};wallpaperPreview();}}
  const actions = label => `<div class="error" id="form-error" role="alert"></div><div class="form-actions"><button type="button" data-action="close">取消</button><button class="primary" type="submit">${label}</button></div>`;
  const roomOptions = () => seed.rooms.map(r=>`<option value="${escape(r.id)}">${escape(r.building)} ${escape(r.name)}</option>`).join('');
  function fillEdit(formId,item){if(!item)return;const form=$('#'+formId);form.dataset.edit=item.id;Object.entries(item).forEach(([key,value])=>{const field=form.elements.namedItem(key);if(field&&field.type!=='checkbox')field.value=value;});$('#modal-title').textContent='编辑本机条目';}
  function weekInputs(){return `<div class="two-col"><label class="field">起始周<input name="startWeek" type="number" min="1" max="60" value="1" required></label><label class="field">结束周<input name="endWeek" type="number" min="1" max="60" value="30" required></label></div><label class="field">周次<select name="parity"><option value="all">每周</option><option value="odd">单周</option><option value="even">双周</option></select></label>`;}
  function addClassModal(item) {
    openModal('添加每周课程',`<p>仅保存至本机个人课表，不会修改全量教室占用表。支持起止周及单双周；学期设置在“我的”和周课表页。</p><form id="class-form"><label class="field">课程名称<input name="title" maxlength="120" required placeholder="例如：C 语言程序设计"></label><div class="two-col"><label class="field">星期<select name="day">${days.map((d,i)=>`<option value="${i+1}" ${i+1===weekDay(new Date())?'selected':''}>星期${d}</option>`).join('')}</select></label><label class="field">教室<select name="roomId"><option value="">使用自填教室</option>${roomOptions()}</select></label></div><label class="field">自填教室（填写时优先使用，最多 100 字符）<input name="location" maxlength="100" placeholder="例如：惟义楼7208"></label><div class="two-col"><label class="field">开始<input type="time" name="start" value="08:00" required></label><label class="field">结束<input type="time" name="end" value="09:30" required></label></div>${weekInputs()}${actions('保存课程')}</form>`);fillEdit('class-form',item);
  }
  const scheduleImportLimit = 200000;
  const scheduleSample = '课程名称,星期,开始,结束,教室\nC语言程序设计,周一,08:00,09:30,示例教学楼101\n高等数学,周三,10:00,11:30,示例教学楼202';
  let schedulePreview = null, scheduleImageURL = null, scheduleFileRequest = 0, clearHTMLImport = null;
  function importHTMLClassesModal(initialCandidates=null) {
    if(!window.CampusScheduleHTML){toast('HTML 导入模块未加载，请刷新或使用 CSV 导入。');return;}
    openModal('从教务网页导入课表',window.CampusScheduleHTML.shell());
    clearHTMLImport=window.CampusScheduleHTML.mount($('#modal-body'),courses=>{
      const seen=new Set(state.classes.map(scheduleCourseKey));
      const fresh=courses.filter(c=>{const key=scheduleCourseKey(c);if(seen.has(key))return false;seen.add(key);return true;});
      if(!fresh.length)throw Error('所选课程均已存在，未重复追加。');
      if(state.classes.length+fresh.length>1000)throw Error('追加后超过 1000 条课程，请先精简。');
      const next=validateState({...state,classes:[...state.classes,...fresh.map(c=>({...c,id:id('c')}))]});
      if(!confirm(`确认追加 ${fresh.length} 条课程（跳过重复 ${courses.length-fresh.length} 条）？原课表保留；请确认周次、钟点及学期第一教学周日期。`))return;
      persistReplacement(next);timer=state.focus.timer;timerSaveFailed=false;
      $('#modal').close();render();toast(`已追加 ${fresh.length} 条课程并保存到本机；原课表及日期规则保留。`);
    },{slots:config.slots,initialCandidates});
  }
  function clearScheduleImage() {if(scheduleImageURL)URL.revokeObjectURL(scheduleImageURL);scheduleImageURL=null;}
  $('#modal').addEventListener('close',()=>{if($('#modal').open)return;clearCampusMap();if(clearHTMLImport){clearHTMLImport();clearHTMLImport=null;}clearScheduleShare();clearProfileDraft();clearWallpaperDraft();clearScheduleImage();schedulePreview=null;scheduleFileRequest++;});
  $('#modal').addEventListener('cancel',()=>{clearCampusMap();clearScheduleShare();clearProfileDraft();clearWallpaperDraft();});
  document.addEventListener('change',event=>{if(event.target.id==='profile-file')selectProfileFile(event.target);});
  function invalidateSchedulePreview() {
    schedulePreview=null;
    const button=$('#confirm-classes');if(button)button.disabled=true;
    const preview=$('#schedule-preview');if(preview)preview.textContent='文本已变更，请重新生成预览。';
  }
  function importClassesModal() {
    clearScheduleImage();schedulePreview=null;scheduleFileRequest++;
    openModal('导入自己的课表',`<p><button type="button" data-action="import-html-classes">新：从教务网页 HTML 导入（本机解析）</button></p><p>从教务在线自行导出 CSV，或复制表格（TSV）粘贴到下方。本页不收密码，不自动登录或抓取；只追加个人课表，不覆盖已有课程，不改教室占用表。</p><p>必需列：课程名称 / 星期 / 开始 / 结束 / 教室；也支持 title / day / start / end / room（或 location）。星期支持 1–7、周一、星期日、Monday 等；时间使用 HH:MM，不支持节次或跨午夜。可选列：起始周 / 结束周 / 单双周（或 startWeek / endWeek / parity）；周次须为 1–60 的整数且起始周不晚于结束周，单双周支持每周/单周/双周或 all/odd/even。仅缺少对应列时默认起始周 1、结束周 30、每周；已有列的空值或无效值会报错，导入后可编辑周次。</p><label class="field">CSV / TSV 文件（UTF-8，最多 512 KiB）<input id="schedule-text-file" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"></label><label class="field">粘贴课表 / 粘贴助手识别后的结构化文本（最多 200000 字符）<textarea id="schedule-import-text" maxlength="200000" rows="8" placeholder="课程名称,星期,开始,结束,教室"></textarea></label><details><summary>可复制样例（虚构课程地点）</summary><pre style="white-space:pre-wrap;user-select:text">${escape(scheduleSample)}</pre><button type="button" data-action="schedule-sample">填入样例</button></details><details><summary>用截图对照录入（无自动 OCR）</summary><p>本版没有自动 OCR。截图仅在本机显示，不上传、不保存到课表。请把截图发给当前助手识别，再将返回的 CSV / TSV 粘贴到上方，预览核对后导入。请勿提供真实师生姓名等无关个人信息。</p><label class="field">选择截图（PNG / JPEG / WebP，最多 5 MiB）<input id="schedule-image-file" type="file" accept="image/png,image/jpeg,image/webp"></label><p id="schedule-image-status" role="status"></p><img id="schedule-image-preview" alt="本机课表截图，仅供对照" hidden style="max-width:100%;max-height:420px;object-fit:contain"></details><p class="subtle">自填教室可使用实际地点，如惟义楼7208；不要填写真实师生姓名。最多保存 1000 条课程。重复课程按名称、星期、起止时间、教室及周次跳过；不同课程的时间冲突请自行核对。</p><div class="error" id="schedule-import-error" role="alert"></div><div class="toolbar"><button data-action="preview-classes">生成候选预览</button><button id="confirm-classes" class="primary" data-action="confirm-classes" disabled>确认追加到我的课表</button></div><div id="schedule-preview" aria-live="polite"></div>`);
  }
  function parseScheduleText(text) {
    if(typeof text!=='string'||text.length>scheduleImportLimit)throw Error('文本超过 200000 字符，请拆分导入。');
    text=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
    if(!text.trim())throw Error('请先粘贴或读取 CSV / TSV 课表。');
    // 仅依据引号外的表头确定分隔符，支持 CSV 双引号转义与带换行字段。
    let quoted=false, delimiter=',', commas=0, tabs=0;
    for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"')i++;else quoted=!quoted;}else if(!quoted){if(c==='\n')break;if(c===',')commas++;if(c==='\t')tabs++;}}
    if(tabs>commas)delimiter='\t';
    const rows=[];let cells=[], value='', inQuote=false, afterQuote=false, line=1, rowLine=1;
    const endCell=()=>{cells.push(value.trim());value='';afterQuote=false;};
    const endRow=()=>{endCell();if(cells.some(Boolean))rows.push({cells,line:rowLine});cells=[];rowLine=line+1;};
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(inQuote){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{inQuote=false;afterQuote=true;}}else{value+=c;if(c==='\n')line++;}continue;}
      if(c===delimiter){endCell();continue;}
      if(c==='\n'){endRow();line++;continue;}
      if(afterQuote){if(c===' ')continue;throw Error(`第 ${line} 行：引号结束后只能是分隔符或换行。`);}
      if(c==='"'){if(value.trim())throw Error(`第 ${line} 行：引号必须位于字段开头。`);value='';inQuote=true;}else value+=c;
    }
    if(inQuote)throw Error(`第 ${rowLine} 行：双引号未闭合。`);
    endRow();
    if(rows.length>1001)throw Error('单次最多读取 1000 行课程，请拆分。');
    const aliases=[['课程名称','课程名','课程','title','name','course','coursename'],['星期','周几','day','weekday'],['开始','开始时间','start','starttime'],['结束','结束时间','end','endtime'],['教室','地点','room','roomid','classroom','location']];
    const headers=rows.shift()?.cells.map(s=>s.toLowerCase().replace(/[\s_]/g,''))||[];
    const indexes=aliases.map(names=>headers.map((h,i)=>names.includes(h)?i:-1).filter(i=>i>=0));
    if(indexes.some(x=>x.length!==1))throw Error('表头缺失或重复：需要课程名称、星期、开始、结束、教室（可用英文列名）。');
    const weekAliases=[['起始周','开始周','startweek'],['结束周','endweek'],['单双周','周次','parity']];
    const weekIndexes=weekAliases.map(names=>headers.map((h,i)=>names.includes(h)?i:-1).filter(i=>i>=0));
    if(weekIndexes.some(x=>x.length>1))throw Error('可选周次表头重复：起始周、结束周、单双周各只能有一列。');
    const errors=[], candidates=[];
    const parseDay=s=>{const v=s.toLowerCase().replace(/\s/g,'');if(/^[1-7]$/.test(v))return Number(v);const chinese=v.replace(/^(星期|周|礼拜)/,'');if(['一','二','三','四','五','六','日','天'].includes(chinese))return chinese==='天'?7:days.indexOf(chinese)+1;return ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].findIndex(d=>d===v||d.slice(0,3)===v)+1;};
    const parseTime=s=>/^\d:[0-5]\d$/.test(s)?'0'+s:s;
    for(const row of rows){
      if(row.cells.length!==headers.length){errors.push(`第 ${row.line} 行：列数 ${row.cells.length} 与表头 ${headers.length} 不一致。`);continue;}
      const [title,dayText,startText,endText,location]=indexes.map(x=>row.cells[x[0]]);
      const day=parseDay(dayText),start=parseTime(startText),end=parseTime(endText), problems=[];
      if(!textValid(title))problems.push('课程名称须为 1–120 字符');
      if(!day)problems.push('星期无效');
      if(!rangeValid(start,end))problems.push('起止时间须有效且结束晚于开始（HH:MM）');
      if(!textValid(location,100))problems.push('教室须为 1–100 字符');
      const [startWeekText,endWeekText,parityText]=weekIndexes.map(x=>x.length?row.cells[x[0]]:undefined);
      const parseWeek=s=>/^\d+$/.test(s)?Number(s):NaN;
      const wf={startWeek:startWeekText===undefined?1:parseWeek(startWeekText),endWeek:endWeekText===undefined?30:parseWeek(endWeekText),parity:parityText===undefined?'all':new Map([['每周','all'],['单周','odd'],['双周','even'],['all','all'],['odd','odd'],['even','even']]).get(parityText.toLowerCase())};
      if(!weekValid(wf))problems.push('起始周和结束周须为 1–60 的整数且起始周不晚于结束周，单双周须为每周/单周/双周或 all/odd/even（已有列不可留空）');
      if(problems.length){errors.push(`第 ${row.line} 行：${problems.join('；')}。`);continue;}
      const room=seed.rooms.find(r=>r.id===location||`${r.building} ${r.name}`===location||`${r.building}${r.name}`===location);
      candidates.push({line:row.line,course:{...wf,title,day,start,end,roomId:room?.id||'',...(room?{}:{location}),color:'purple'}});
    }
    return {candidates,errors};
  }
  function scheduleCourseKey(c) {return JSON.stringify([c.title.trim(),c.day,c.start,c.end,roomName(c.roomId,c.location).replace(/\s/g,''),c.startWeek,c.endWeek,c.parity]);}
  function previewClasses() {
    invalidateSchedulePreview();$('#schedule-import-error').textContent='';
    try{
      const text=$('#schedule-import-text').value, result=parseScheduleText(text), seen=new Set(state.classes.map(scheduleCourseKey));let duplicates=0;
      const courses=[];
      const items=result.candidates.map(({line,course})=>{const key=scheduleCourseKey(course),duplicate=seen.has(key);seen.add(key);if(duplicate)duplicates++;else courses.push(course);return `<li>第 ${line} 行 · ${escape(course.title)} · 周${days[course.day-1]} ${escape(course.start)}–${escape(course.end)} · ${escape(roomName(course.roomId,course.location))} · ${weekLabel(course)}${duplicate?' · 重复，跳过':''}</li>`;});
      const overflow=state.classes.length+courses.length>1000;
      $('#schedule-preview').innerHTML=`<p>可追加 ${courses.length} 条，跳过重复 ${duplicates} 条，错误 ${result.errors.length} 行。${overflow?'追加后超过 1000 条，请精简。':''}</p><h3>候选预览</h3><ol>${items.join('')}</ol><h3>错误明细</h3>${result.errors.length?`<ul>${result.errors.map(e=>`<li>${escape(e)}</li>`).join('')}</ul>`:'<p>无行错误。</p>'}<p>错误行不会导入；确认按钮仅追加上方有效、非重复课程。请核对星期、时间、教室及周次。</p>`;
      schedulePreview={text,courses};$('#confirm-classes').disabled=!courses.length||overflow;
    }catch(error){$('#schedule-import-error').textContent=error.message;}
  }
  function confirmClasses() {
    if(!schedulePreview||schedulePreview.text!==$('#schedule-import-text').value){invalidateSchedulePreview();return;}
    const seen=new Set(state.classes.map(scheduleCourseKey)), courses=schedulePreview.courses.filter(c=>{const key=scheduleCourseKey(c);if(seen.has(key))return false;seen.add(key);return true;});
    if(!courses.length||state.classes.length+courses.length>1000){previewClasses();return;}
    if(!confirm(`确认追加 ${courses.length} 条课程？已有课表保留，错误行和重复项不会导入。周次按预览导入；缺少对应列时才默认起始周 1、结束周 30、每周，可稍后编辑。`))return;
    const incoming={...state,classes:[...state.classes,...courses.map(c=>({...c,id:id('c')}))]};
    try{const validated=validateState(incoming);if(commitLocal(validated,`已追加 ${courses.length} 条课程，原课表及临时规则保留。`))$('#modal').close();}catch(error){$('#schedule-import-error').textContent=error.message;}
  }
  document.addEventListener('input',event=>{if(event.target.id==='schedule-import-text'){scheduleFileRequest++;invalidateSchedulePreview();}});
  document.addEventListener('change',async event=>{
    const input=event.target;if(!['schedule-text-file','schedule-image-file'].includes(input.id))return;
    const file=input.files[0];input.value='';if(!file)return;
    if(input.id==='schedule-text-file'){
      const request=++scheduleFileRequest,textarea=$('#schedule-import-text');invalidateSchedulePreview();$('#schedule-import-error').textContent='';
      try{if(!/\.(csv|tsv|txt)$/i.test(file.name))throw Error('请选择 CSV / TSV / TXT 文件。');if(file.size>512*1024)throw Error('文本文件超过 512 KiB。');const text=await file.text();if(request!==scheduleFileRequest||textarea!==$('#schedule-import-text'))return;if(text.length>scheduleImportLimit)throw Error('文本超过 200000 字符。');if(text.includes('\uFFFD'))throw Error('文件编码可能不是 UTF-8，请转为 UTF-8 后读取。');textarea.value=text;invalidateSchedulePreview();}catch(error){if(request===scheduleFileRequest&&textarea===$('#schedule-import-text'))$('#schedule-import-error').textContent=error.message;}
    }else{
      clearScheduleImage();const img=$('#schedule-image-preview');img.hidden=true;img.removeAttribute('src');const status=$('#schedule-image-status');
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){status.textContent='仅支持不超过 5 MiB 的 PNG / JPEG / WebP 图片。';return;}
      scheduleImageURL=URL.createObjectURL(file);img.onload=()=>{img.hidden=false;status.textContent='仅供本机对照；没有自动 OCR，也未上传截图。';};img.onerror=()=>{img.hidden=true;status.textContent='图片无法读取，请换用有效截图。';clearScheduleImage();};img.src=scheduleImageURL;
    }
  });
  function addExamModal(){
    const selected=new Date(`${scheduleDate}T12:00:00`),today=new Date(`${dateAt()}T12:00:00`);
    const monday=d=>{const value=new Date(d);value.setDate(value.getDate()-weekDay(value)+1);return localDate(value);};
    addTaskModal(undefined,{source:'考试',type:'block',date:monday(selected)===monday(today)?dateAt():scheduleDate});
  }
  function addTaskModal(item,defaults) {
    openModal('给自己一个小目标',`<p>仅存本机，不会发送至其他平台。时间线包含课程 + 时段安排 + 截止节点；截止待办不占用时段，时段安排仅支持同日。时间重叠会提示，可本人确认保存，不覆盖课表。</p><form id="task-form"><label class="field">类型<select name="type" id="task-type"><option value="deadline">截止待办</option><option value="block">时段安排</option></select></label><label class="field">标题<input name="title" maxlength="120" required></label><label class="field">日期<input name="date" type="date" value="${dateAt()}" required></label><label class="field" id="task-deadline-field">截止时间<input name="time" type="time" value="20:00" required></label><div class="two-col" id="task-block-fields" hidden><label class="field">开始时间<input name="startTime" type="time" value="19:00" disabled></label><label class="field">结束时间<input name="endTime" type="time" value="20:00" disabled></label></div><label class="field">来源分类<select name="source">${['个人','学习通','考试','学业'].map(s=>`<option>${s}</option>`).join('')}</select></label>${actions('保存待办 / 安排')}</form>`);fillEdit('task-form',item);if(!item&&defaults){const form=$('#task-form');for(const [key,value] of Object.entries(defaults))form.elements.namedItem(key).value=value;form.elements.namedItem('startTime').value='';form.elements.namedItem('endTime').value='';$('#modal-title').textContent='添加考试';}syncTaskType();
  }
  function syncTaskType() {
    const form=$('#task-form'),block=form.elements.namedItem('type').value==='block';
    $('#task-deadline-field').hidden=block;$('#task-block-fields').hidden=!block;
    ['time','startTime','endTime'].forEach(name=>{const field=form.elements.namedItem(name),active=name==='time'?!block:block;field.disabled=!active;field.required=active;});
  }
  function blockConflicts(task) {
    const overlap=(start,end)=>minutes(task.startTime)<minutes(end)&&minutes(task.endTime)>minutes(start);
    const day=weekDay(new Date(`${task.date}T12:00:00`));
    return [...coursesOn(task.date).filter(c=>overlap(c.start,c.end)).map(c=>`课程「${c.title}」${c.start}–${c.end}${c.ruleLabel?' · '+c.ruleLabel:''}`),...state.tasks.filter(t=>t.id!==task.id&&t.type==='block'&&t.date===task.date&&overlap(t.startTime,t.endTime)).map(t=>`安排「${t.title}」${t.startTime}–${t.endTime}`)];
  }
  function addLostModal(item) {
    openModal('本机登记失物 · 虚构演示',`<p>这是本机列表，不会发布到校园。不要填写真实姓名、证件号、电话或其他联系信息。问答答案以明文保存，不具备保密能力。</p><form id="lost-form"><div class="two-col"><label class="field">类型<select name="type"><option value="found">拾物招领</option><option value="lost">寻物启事</option></select></label><label class="field">状态<select name="status">${lostStatuses('found').map(s=>`<option>${s}</option>`).join('')}</select></label></div><label class="field">虚构物品名称<input name="title" maxlength="80" required></label><div class="two-col"><label class="field">物品分类<select name="category">${lostCategories.map(c=>`<option>${c}</option>`).join('')}</select></label><label class="field">示例地点<select name="place">${config.buildings.map(b=>`<option>${escape(b)}公共区域</option>`).join('')}</select></label></div><label class="field">公开描述（不含核验特征）<textarea name="description" maxlength="500" required></textarea></label><label class="field">私密特征问题（流程演示，实际不能保密）<input name="question" maxlength="160" required placeholder="例如：虚构卡片的末四位？"></label><label class="field">演示答案（证件类必须是虚构四位数字）<input name="answer" maxlength="80" required autocomplete="off"></label><label class="field">公开演示提示<input name="hint" maxlength="160" required placeholder="可填写虚构演示答案，便于测试"></label><label><input style="width:auto" name="consent" type="checkbox" required> 我确认只使用虚构数据，并理解前端问答不是生产防冒领</label>${actions('保存本机登记')}</form>`);fillEdit('lost-form',item?{...item,category:circleItemCategory(item,'lost')}:item);syncLostForm(item?lostStatusLabel(item):undefined);
  }
  function syncLostForm(status) {
    const form=$('#lost-form');if(!form)return;
    const values=lostStatuses(form.elements.type.value),current=status||form.elements.status.value;
    form.elements.status.innerHTML=values.map(s=>`<option ${s===current?'selected':''}>${s}</option>`).join('');
    if(!values.includes(current))form.elements.status.value=values[0];
  }
  function claimModal(itemId) {
    const item=state.lost_items.find(l=>l.id===itemId);if(!item||!item.local||item.type!=='found'||item.status!=='待认领')return;
    openModal('认领问答 · 仅流程演示',`<p>${escape(item.title)} · 请勿输入真实证件信息。</p><div class="warning">答案保存在前端，任何人都可读取。回答正确仅进入待人工核验，不会自动交付。此页面没有真实审核后台。</div><form id="claim-form" data-item="${escape(itemId)}"><label class="field">${escape(item.question)}<input name="answer" maxlength="80" required autocomplete="off"></label><p>${escape(item.hint)}</p>${actions('提交演示核验')}</form>`);
  }
  function dataModal() {
    openModal('本地数据管理',`<p>存储状态：${storageOK?'可用（仅此浏览器）':'不可用，请导出备份'}。JSON v2 包含课程、日期规则 scheduleRules（全天停课 / 参考日补课 / 单课停调补）、任务关联的专注投入和逐条完成确认、截止待办与时段安排（type 为 deadline / block；旧任务缺少 type 时补 deadline；block 明确保存同日 startTime / endTime，兼容字段 time 等于 endTime）、失物、旧档兼容字段、学期/阈值设置、番茄钟与专注记录、手工电费余额、独立截图电费快照 electricitySnapshot（旧档缺省为空，固定素材不会自动导入）、喝水设置与逐杯记录、首页布局 dashboard、外观 appearance（时段 / 景观背景 / 色彩 / 动画 / 整张课表背景；旧档缺少 scheduleBackground 时补 plain）；兼容旧 v1/v2（缺失 hydration 时默认关闭且无记录，缺失 dashboard 时恢复默认布局）；失物答案是明文，导出文件不能保密。</p><p>本源码版的 data.js 仅为公开空白种子，不附个人 data.json。应用不会 fetch 本地 JSON；个人备份请通过文件选择导入，不要写回公开种子或提交到仓库。导入只替换业务字段，校园配置、只读展示与天气使用可信本地配置。建议使用本地 HTTP 服务打开以获得稳定的存储来源。</p><div class="toolbar"><button class="primary" data-action="export">导出当前 JSON</button><button data-action="import">选择 JSON 导入</button></div><p>导入前会校验并再次确认，且覆盖本机现有业务数据。建议先导出备份。</p>${protectedArchive?'<div class="warning">原存档保护中：所有修改和导入仅留在本页，不能写回原存档。重置也不可解除保护。</div><button data-action="export-original">导出受保护的原始存档</button>':''}<p>截图数据：${state.electricitySnapshot?`已载入 ${state.electricitySnapshot.daily.length} 天有效明细`:'尚未载入'}；与手工余额独立。</p><button data-action="electricity-preview">${state.electricitySnapshot?'预览并替换截图数据':'载入截图数据（先预览）'}</button>${state.electricitySnapshot?'<button data-action="electricity-clear">清除截图数据（需确认）</button>':''}<button class="danger" data-action="reset">重置本机为空白初始数据（需两次确认）</button>`);
  }
  function aboutModal() {
    openModal('关于 · 数据与参考来源',`<p><strong>${escape(config.name)} · v${escape(config.version)}</strong><br>非官方校园工具 · 早期 Alpha，本地优先、无广告，本机功能可实际使用，部分栏目保留示例。界面不依赖外部 UI 框架，本地工具无需登录。本源码版默认停用实验云同步，不加载云 SDK、不读取登录会话、不连接原作者的云资源。请使用数据管理中的 JSON 手动备份；实验实现的恢复可靠性、登录开关、权限与跨设备流程尚未完成验收。建议用本地 HTTP 服务打开，文件双击仅作兼容方式。不是 PWA，不提供离线安装或关闭页面后的推送。</p><h3>数据与接入边界</h3><ul><li>课程、待办、电费截图及业务种子默认空白；生活圈仍有明确标记的内存只读虚构示例，天气为明确的固定演示值。个人编辑和导入的记录不是演示数据。电费支持手工人民币余额及用户主动预览确认载入的独立截图快照，两者分开保存，均不是实时接口；虚构用电样本仅在明确选择演示模式时展示，不写入个人记录。新增内容默认保存在当前浏览器；本源码版没有启用云上传；本机记录属于当前来源和浏览器，不会随账号自动隔离。</li><li>支持用户选择已保存的教务 HTML，在本机解析课表、预览核对、补齐周次并去重追加；不上传原始 HTML，不代登录、不读取教务密码，也不自动同步。教务、学习通、考试、学业、电控、成绩学分及真实认领审核接口均未接入；本机记录不等于共享后台或真实业务接入。本地地图现以惟义楼、实验大楼为重点，选楼、方向球与步行查路共用同一腾讯地图，不再以艺术展台代替真实校园空间。底图和查路需有效安全代理及网络；没有可信楼体轮廓、高度或入口数据，原生建筑覆盖以腾讯底图为准。查询仅发送公开地点坐标，不上传课程或教室文字、不申请定位；具体入口与楼层未核验。</li><li>天气由手动请求 Open-Meteo 获得，展示区域参考坐标而非校园实测，标注观测与采集时间；来源 Open-Meteo，天气数据署名 CC BY 4.0。请求失败保留历史缓存或明确的固定演示值，不静默伪造更新。</li><li>图书馆为官方站外跳转，本站不代登录、预约或读取借阅记录。</li><li>认领问答无法在纯前端保密，答案、提示和状态均可被修改。回答正确只转待人工核验，无自动交付；无真实联系方式。</li></ul><h3>代码与素材来源</h3><p>直接沿用本地「时段壁纸_demo.html」的 periodIndex、orbPosition、05/10/14/17/19/23 六时段边界及六套主配色。该 demo 借鉴 khkdfsj/campus-frontend-template 的主题组织思路，而非复制其原代码；本版本没有下载或声称复制其原仓库代码，未重新核验原仓库及其许可。</p><p>基于用户提供清单中的 room-tba 的配置/示例数据思路、notice-hub 的跨源分类、Campus-Market 的栏目边界进行设计参考，未导入上述三个项目的源码、组件或数据。不能将清单中的许可记载当作本次核验。地图方向球实际改造自 NJUPT-CS-StuDev/studev 固定提交 <code>cf85eec1182583a030b57d09073c27e67c9298b9</code> 的源码，遵循 AGPL-3.0-or-later；详见<a href="campus-map/source.html" target="_blank" rel="noopener noreferrer">地图源码与改造说明</a>及<a href="campus-map/vendor/studev/LICENSE.txt" target="_blank" rel="noopener noreferrer">完整许可证</a>。</p><p>校园水彩最初由纯文本提示生成三套 AI 新创作画面：红砖建筑与湖面、湖岸小桥与树影、足球场篮球场与大天空；未上传或嵌入用户提供的他人参考图。2026-11-19 仅以本项目原生成球场图作编辑输入，修正四幅主画中前景篮球架结构，并统一朝向：镜头看到近端篮板背面，篮圈朝向场内纵深，独立短支架不再延伸成灯杆。每套包含清晨、白天、晚霞、夜景四幅主画，按既有六时段切换。受师大校园意象启发，并非学校实景精确复刻、官方图片或摄影实拍，不承诺排他版权；保留生成来源标识。品牌采用用户已选定的完整翻页 JXNU，系本项目原创、非官方标识；<a href="campus-map/source.html#brand" target="_blank" rel="noopener noreferrer">查看品牌与来源说明</a>。通用 UI 图标实际采用 Tabler Icons outlines（24×24、2px 笔画），Copyright (c) 2020-2026 Paweł Kuna，<a href="tabler-icons-LICENSE.txt" target="_blank" rel="noopener noreferrer">MIT 完整许可</a>；Lucide 仅用于方法参考，不引入源码。界面与业务逻辑由本项目实现，未使用来源不明的地形图、航拍图或网络照片。后续引入外部素材仍需核验许可并保留署名。</p><h3>近期本地更新 · 2026-11-24</h3><ul><li>品牌与外观：采用已选定的完整翻页 JXNU 非官方标识；三套校园水彩随六时段淡彩切换，保留手动预览与减少动画选项。</li><li>专注与待办：50/10、90/20、25/5、15/3 四组真实计时预设；从待办开始专注，完整或提前结束记录实际投入，再逐条确认是否完成，不自动勾选。投入与确认随本机 JSON 备份，暂不参与云备份；不承诺关闭网页后后台常驻。</li><li>课表日期规则：支持全天停课、按参考日补课和单课停调补，统一作用于课表、今日摘要、时间线、冲突检查、分享图及 ICS；规则可撤销，不改常规模板，校历不会自动停课。规则随本机 JSON 备份，暂不参与云备份。</li><li>双楼同屏地图：默认聚焦惟义楼与实验大楼，选楼、方向球拖动 / 键盘、俯视 / 倾斜、缩放、双楼总览和步行查路统一在真实腾讯地图里。查路保留当前方向与倾角，调整窗口不强制回到二维；提供双楼快捷起点和交换方向。只绘制服务返回的合法轨迹，失败不补直线；没有把虚构展台当校园模型。入口、楼层与教室未核验。</li><li>课表与简介：保留教务 HTML 本机导入预览、周次核对与去重追加，以及手机整周课表、ICS / PNG 分享和两份作品简介；不代登录、不自动同步。<a href="campus-map/source.html" target="_blank" rel="noopener noreferrer">地图源码与许可</a>可下载，不含个人记录。</li></ul><p class="subtle">以上为本地开发版改动，不表示发布源或公网已更新，本轮未部署。双楼同屏交互已进入本地原型；当前隔离服务未配置地图凭据，真实底图、两楼原生建筑覆盖及浏览器 Walking 仍待本次验收；2026-11-20 的旧记录不能代替本次重验。云真人登录、跨设备恢复及校内业务接入仍未验收。导入或恢复前请先导出备份，避免覆盖本机记录。</p><h3>时段淡彩与校园画面</h3><p>默认主题改为六时段淡彩：全站底色、纸张卡片、按钮和默认周课表随设备时间变换，夜间使用淡蓝与浅紫而非全黑。可手动预览光影，不影响真实课程和待办时间；保留固定深色、系统配色、自选课表渐变和本机壁纸。旧默认深色在内存升级，保存后纳入备份；新选择的固定深色刷新后保留。</p><h3>历史版本记录</h3><p class="subtle">以下保留各版本当时的改动，当前功能和限制请以上方说明及服务状态面板为准。</p><h3>v0.2.7 人民币余额趋势</h3><p>电费局部改为浅色余额概览、青绿色折线与半透明面积图、7/30天每日明细联动；深色适配。只展示手工人民币余额，同日末笔绘图，缺失日期不补值，单条仅显示点；不推算耗电量或可用天数。支持负余额、全部记录编辑与确认删除，保留旧档和坏档保护；未接入学校。</p><h3>v0.2.6 专注方案与彩色周网格</h3><p>专注页采用左大倒计时和当前目标、右方案配置的响应式布局，提供50/10、90/20、25/5、15/3及四套原创配色。专注、短休、长休及轮数独立配置；最后一轮专注后进入长休，长休结束停止，可手动开始新周期。自动进入下一阶段默认关闭，结束页面提示可关闭；无声音、不自动全屏。单一计时状态按绝对截止时间恢复，逐阶段记录，自动衔接按原截止时间结算，刷新不重复计入。配置、目标、轮次和阶段历史纳入白名单备份，旧档补默认值。</p><p>周课表借鉴 WakeUp 的七日彩色时间网格组织方式，按真实起止时间跨行，午休不挤掉、晚课不拆分，部分重叠课程分栏并标冲突；支持前后周、回本周及教学周选择，今天高亮、当前课程描边。同名课程使用稳定颜色，保留编辑、导入、全部课程管理及学期设置，移动端横向滚动。仅借鉴交互和信息组织，不复制截图、素材、源码、图标或品牌配色；本次CSS及界面由本地原创实现，未下载外部素材。</p><h3>v0.2.5 专注、时间线与外观</h3><p>新增独立专注栏目，首页改为可隐藏摘要；今日时间线包含课程 + 时段安排 + 截止节点：课程按个人学期周次筛选，安排按开始排序并展示完整区间及完成状态，往日逾期截止待办和已结束未完成安排分别列出。旧任务默认仍是截止待办；时段重叠仅提示，本人确认可保留，不覆盖课表。时段提醒在开始前10分钟及开始时检查，ICS 导出真实起止区间。我的新增外观设置：复用六时段自动 / 手动、景观 / 纯色、浅色 / 深色 / 系统和减少动画偏好，纳入白名单 JSON 备份，旧档不自动覆盖。</p><h3>v0.2.4 布局与服务透明化</h3><p>新增“整理工作台”：现有首页卡片勾选显隐、上移下移及确认恢复默认；布局独立保存并随 JSON 备份，兼容缺少布局字段的旧档。天气与时段顶栏保留，喝水仍默认关闭且由独立开关控制。校园服务按学习、生活、个人工具分组，新增按当前本机记录和天气来源生成的服务状态面板；未接入服务点击说明，不伪造连接或操作成功。</p><p>本次将既有 GitHub 研究记录中的信息分组、卡片组织和能力边界提示思路用于本地实现。来源范围沿用下述 room-tba、notice-hub、studev、Campus-Market 与本地时段 demo 的参考记录；仅作设计借鉴，不声称复制原仓库代码、组件或数据。本次没有联网下载源码或重新核验许可，不新增真实接口、地图、登录或凭证。</p><h3>v0.2.3 我的与核验改进</h3><p>新增一级“我的”大页面，以本机访客身份集中学期设置、喝水提醒与待办通知入口、专注及今日喝水统计、课程/待办/失物数量、JSON备份与关于隐私说明。复用原有表单及操作，不新增登录或跨设备同步；手机七项导航采用带文字横滑；标准路由为 profile，兼容旧 mine 链接。记录概览补充累计喝水统计；损坏或不兼容存档禁止自动写回，并可另行导出原始存档。补全重置确认的数据范围，并补充我的页模拟DOM回归；不宣称已通过真实浏览器或系统通知集成核验。</p><h3>v0.2.2 可选喝水提醒</h3><p>校园服务中设置，默认关闭；开启后才显示工作台右侧小卡。间隔30/60/90/120分钟，同日起止时段默认09:00–21:00；逐杯记录默认250 ml，可选100/200/250/300/500 ml，按设备本地日期统计今日杯数与毫升，可撤销今日最近一杯。不设医学定量建议或强制每日目标，按自身需要和医嘱安排。设置与记录仅存本机，纳入JSON导入导出，兼容旧v1/v2。</p><p>提醒只在页面打开且可见时提示；系统通知须用户点击申请，拒绝仍保留页面提示。后台节流恢复最多一次，不补刷；重新打开页面或保存设置后重新等待，关闭立即停止且不影响待办提醒。无关闭页面推送，多标签页各自计时。智慧笑联仅文字说明、未接入；本功能不安装、不联网，不提供实时水机状态、订单或余额，不收集宿舍房号和商户信息。</p><h3>v0.2.1 校历更新</h3><p>${escape(schoolCalendar.source)}。新增右侧校历小窗口与2026年8月至2027年1月完整月历，校历教学周按8月31日独立计算。新种子默认开学日为8月31日，已有设置保持不变，需确认后应用；不修改各课开课范围。节假日、补课及停课仅提示，不自动改写个人课表。</p><h3>v0.2 变更记录</h3><p>课程仅支持编辑，暂不支持删除；待办、本机登记失物和手工电费记录可确认删除，只读条目不可删除。新增学期开学日期与起止/单双周过滤、四组任务全文检索、ICS 导出、用户主动授权的页面内提醒；番茄钟支持暂停、刷新恢复与专注历史；生活圈筛选及本机失物编辑；独立手工电费账本与阈值。JSON v2 同步设置、专注及手工账本，兼容导入 v1。修复跨午夜刷新，严格校验导入与本地存储错误提示。</p><p>适配层负责种子初始化、版本迁移、业务白名单校验、快照与持久化；可信校园配置与只读栏目不接受导入覆盖。接真实接口还需要凭证、正式授权和服务端实现，不能只换网址。没有后台推送、真实交易或地理地图。</p><h3>v0.1 变更记录</h3><p>新增响应式多文件工作台、六时段景观、课表/任务本地保存、跨源时间线、独立占用查询、失物问答、只读生活圈、电费占位与手动天气回退。未实现真实系统、交易链路或自动认领。</p>`);
  }
  // 新联动操作先写盘再替换内存；失败时保留原任务、原计时和可重试状态。
  let timerSaveFailed=false;
  function commitLocal(next,message='',repaint=true){
    try{persistReplacement(next);timer=state.focus.timer;timerSaveFailed=false;if($('#focus-save-warning'))$('#focus-save-warning').hidden=true;if(repaint)render();if(message)toast(message+'已保存到本机。');return true;}
    catch(error){toast('保存失败：'+error.message+' 原状态保留，请重试或导出备份。');return false;}
  }
  function remainingOf(t,now=Date.now()){return t.deadline===null?t.remaining:Math.max(0,Math.min(t.remaining,t.deadline-now));}
  function timerRemaining() {return remainingOf(timer);}
  function elapsedOf(t,now=Date.now()){return Math.max(0,Math.min(t.duration*60000,t.duration*60000-remainingOf(t,now)));}
  function advanceDraft(f){const p=f.plan,t=f.timer,round=t.phase==='short'?Math.min(t.round+1,p.rounds):t.phase==='long'?1:t.round,phase=t.phase==='focus'?(t.round>=p.rounds?'long':'short'):'focus';f.timer={...freshTimer(p[phase],phase==='focus'?'focus':'break'),round,phase,taskId:t.taskId,taskTitle:t.taskTitle};}
  function recordFocus(next,elapsedMs,stamp,outcome){
    const f=next.focus,t=f.timer;if(t.mode!=='focus'||elapsedMs<1000)return null;
    const recordId=t.sessionId||`focus-legacy-${stamp}-${t.round}`;
    if(!Number.isSafeInteger(elapsedMs)||elapsedMs>t.duration*60000)throw Error('投入时长必须是有效的整数毫秒。');
    if(f.records.some(r=>r.id===recordId))throw Error('当前会话已有投入记录，请核对会话状态后重试。');
    if(f.records.length>=10000)throw Error('专注记录已达10000条，请先导出备份。');
    const record={id:recordId,date:localDate(new Date(stamp)),minutes:elapsedMs/60000,completedAt:stamp,elapsedMs,taskId:t.taskId,taskTitle:t.taskTitle,outcome,decision:t.taskId?'pending':'kept'};
    f.records.push(record);return record;
  }
  function startTaskFocus(taskId){
    if(!renderTimer())return false;
    const task=state.tasks.find(t=>t.id===taskId);if(!task||task.done){toast('请先选择尚未完成的待办。');return false;}
    if(timer.taskId===taskId&&!timer.finished&&timer.mode==='focus'){if(timer.deadline===null&&!toggleTimer())return false;location.hash='focus';navigate('focus');return true;}
    const elapsed=elapsedOf(timer);
    if(!timer.finished&&(timer.deadline!==null||elapsed>0)&&!confirm('切换任务会结束当前阶段；已投入的专注时间会保留，任务不会自动完成。继续？'))return false;
    if(!renderTimer())return false;
    const next=clone(state),previous=next.focus.timer;
    try{if(!previous.finished)recordFocus(next,elapsedOf(previous),new Date().toISOString(),'partial');}catch(error){toast(error.message);return false;}
    next.focus.plan.target=task.title;
    next.focus.timer={...freshTimer(next.focus.plan.focus),sessionId:id('session'),taskId:task.id,taskTitle:task.title,deadline:Date.now()+next.focus.plan.focus*60000};
    if(!commitLocal(next,'已从待办开始专注。',false))return false;
    if($('#modal').open)$('#modal').close();location.hash='focus';navigate('focus');render();return true;
  }
  function toggleTimer(){
    timerSaveFailed=false;if(!renderTimer())return false;
    const next=clone(state),f=next.focus;
    if(f.timer.deadline!==null){f.timer.remaining=remainingOf(f.timer);f.timer.deadline=null;}
    else {if(f.timer.finished)advanceDraft(f);if(!f.timer.sessionId)f.timer.sessionId=id('session');f.timer.deadline=Date.now()+f.timer.remaining;}
    return commitLocal(next,f.timer.deadline===null?'计时已暂停，暂停不计投入。':'计时已开始。');
  }
  function finishFocusEarly(){
    if(!renderTimer())return false;
    if(timer.mode!=='focus'||timer.finished)return false;
    const elapsed=elapsedOf(timer);if(elapsed<1000){toast('至少专注1秒后才能记录投入。');return false;}
    const next=clone(state);
    try{recordFocus(next,elapsed,new Date().toISOString(),'partial');}catch(error){toast(error.message);return false;}
    next.focus.timer={...next.focus.timer,deadline:null,remaining:0,finished:true};
    return commitLocal(next,'本次实际投入已记录；任务完成状态由你确认。');
  }
  function decideFocusRecord(recordId,completed){
    const next=clone(state),record=next.focus.records.find(r=>r.id===recordId);
    if(!record||record.decision!=='pending'||typeof completed!=='boolean')return false;
    const task=next.tasks.find(t=>t.id===record.taskId);
    if(completed&&!task){toast('原待办已删除，投入仍保留；不能完成其他任务，请选择保留记录。');return false;}
    record.decision=completed?'completed':'kept';if(completed)task.done=true;
    return commitLocal(next,completed?'已确认任务完成，投入记录保留。':'投入已记录，待办继续保留。');
  }
  function settleTimer(next,now){
    let changed=false;
    while(next.focus.timer.deadline!==null&&remainingOf(next.focus.timer,now)===0){
      const f=next.focus,t=f.timer;if(f.phases.length>=10000)throw Error('阶段记录已达10000条，请导出备份。');
      const deadline=t.deadline,stamp=new Date(deadline).toISOString();
      recordFocus(next,t.duration*60000,stamp,'complete');
      const phaseId=`phase-${t.sessionId||deadline+'-'+t.round+'-'+t.phase}`;
      if(!f.phases.some(r=>r.id===phaseId))f.phases.push({id:phaseId,phase:t.phase,round:t.round,minutes:t.duration,completedAt:stamp,target:t.taskId?t.taskTitle:f.plan.target});
      t.deadline=null;t.remaining=0;t.finished=true;changed=true;
      // 关联待办的专注结束必须先让用户决定，不在后台连续制造投入记录。
      if(f.plan.autoNext&&!t.taskId&&t.phase!=='long'){advanceDraft(f);f.timer.sessionId=id('session');f.timer.deadline=deadline+f.timer.remaining;}else break;
    }
    return changed;
  }
  function showFocusSaveWarning(){if($('#focus-save-warning'))$('#focus-save-warning').hidden=false;}
  function retryFocusSave(){
    timerSaveFailed=false;if(!renderTimer())return false;
    if(focusMemoryDirty&&!commitLocal(clone(state),'本轮投入已补存。',false)){timerSaveFailed=true;showFocusSaveWarning();return false;}
    if($('#focus-save-warning'))$('#focus-save-warning').hidden=true;return true;
  }
  function renderTimer(persist=true) {
    if(timer.deadline!==null&&timerRemaining()===0){
      if(timerSaveFailed&&persist)return false;
      const next=clone(state);let changed=false;
      try{changed=settleTimer(next,Date.now());}catch(error){timerSaveFailed=true;showFocusSaveWarning();toast('结算未保存：'+error.message);return false;}
      if(changed){
        if(persist){if(!commitLocal(next,'',false)){timerSaveFailed=true;showFocusSaveWarning();return false;}}
        else {state=next;timer=state.focus.timer;focusMemoryDirty=true;showFocusSaveWarning();}
        if(view==='focus'&&$('#focus-records'))$('#focus-records').innerHTML=focusRecordsView();
        if(view==='focus'&&$('#focus-task-link'))$('#focus-task-link').innerHTML=focusTaskLinkView();
        if(persist&&state.focus.plan.endNotice)toast(timer.taskId?'投入已保存。请在记录中确认任务完成，或继续保留待办。':'阶段已完成，记录已保存。');
      }
    }
    const remaining=timerRemaining();
    if(view==='profile'&&$('#mine-focus-stats'))$('#mine-focus-stats').textContent=focusStatsText();
    if(view==='home'){
      if($('#focus-summary'))$('#focus-summary').textContent=focusSummary();
      if($('#home-focus-stats'))$('#home-focus-stats').textContent=focusStatsText();
    }
    if(view!=='focus'||!$('#timer-time'))return true;
    const seconds=Math.ceil(remaining/1000);
    $('#timer-time').textContent=`${pad(Math.floor(seconds/60))}:${pad(seconds%60)}`;
    const progress=$('#focus-progress');if(progress)progress.value=Math.min(100,Math.max(0,(1-timerRemaining()/(timer.duration*60000))*100));
    document.querySelectorAll('.focus-round-dots span').forEach((dot,i)=>dot.classList.toggle('is-reached',i<timer.round));
    $('#focus-stats').textContent=focusStatsText();
    $('#timer-state').textContent=`${timer.mode==='focus'?'专注':'休息'} ${timer.duration} 分钟 · ${timer.finished?'已完成':timer.deadline!==null?'进行中':'未开始 / 已暂停'}`;
    $('#timer-start').textContent=timer.deadline!==null?'暂停':timer.finished?'继续下一阶段':'开始 / 继续';
    $('#focus-round').textContent=`第 ${timer.round} / ${state.focus.plan.rounds} 轮 · ${{focus:'专注',short:'短休',long:'长休'}[timer.phase]}`;
    const finish=$('[data-action="focus-finish"]');if(finish)finish.disabled=timer.mode!=='focus'||timer.finished;
    return true;
  }
  async function requestWeather() {
    if(weatherBusy)return;
    if(Date.now()-lastWeatherAttempt<30000){toast('请间隔至少 30 秒再手动请求，避免频繁访问。');return;}
    lastWeatherAttempt=Date.now();weatherBusy=true;if(view==='home')render();
    const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),8000);
    try {
      const loc=config.weatherLocation;
      const url=new URL('https://api.open-meteo.com/v1/forecast');
      url.search=new URLSearchParams({latitude:loc.latitude,longitude:loc.longitude,current:'temperature_2m,weather_code',timezone:'auto'}).toString();
      const response=await fetch(url,{signal:controller.signal,referrerPolicy:'no-referrer'});
      if(!response.ok)throw Error('服务响应失败');
      const result=await response.json(), current=result.current;
      if(!current||!Number.isFinite(current.temperature_2m)||!Number.isInteger(current.weather_code)||!dateValid(current.time?.slice(0,10)))throw Error('天气字段无效');
      weather={temperature:current.temperature_2m,code:current.weather_code,mode:'live',observedAt:current.time,collectedAt:new Date().toISOString()};
      write(config.weatherKey,JSON.stringify(weather));toast('天气已获取；其他校园数据仍是演示。');
    } catch {
      if(weather.mode!=='demo')weather.mode='cache';
      toast(weather.mode==='demo'?'天气请求失败或超时，保留固定虚构样本。':'天气请求失败或超时，保留历史缓存（非实时）。');
    } finally {clearTimeout(timeout);weatherBusy=false;if(view==='home')render();}
  }
  function changeFocusTimer(makeTimer,plan){
    timerSaveFailed=false;if(!renderTimer())return false;
    if(!timer.finished&&(timer.deadline!==null||elapsedOf(timer)>0)&&!confirm('更改将结束当前阶段；已投入的专注时间会记录，任务不会自动完成。继续？'))return false;
    if(!renderTimer())return false;
    const next=clone(state),old=next.focus.timer;
    try{if(!old.finished)recordFocus(next,elapsedOf(old),new Date().toISOString(),'partial');}catch(error){toast(error.message);return false;}
    if(plan)next.focus.plan={...plan};
    next.focus.timer={...makeTimer(),taskId:old.taskId,taskTitle:old.taskTitle};
    return commitLocal(next,'计时设置已应用，历史投入保留。');
  }
  function applyFocusPlan(p){if(!planValid(p)){toast('方案无效：分钟1–180，轮数1–12，目标最多120字。');return false;}return changeFocusTimer(()=>freshTimer(p.focus),p);}
  function setTimer(duration,mode){if(!Number.isInteger(duration)||duration<1||duration>180||!['focus','break'].includes(mode))return false;return changeFocusTimer(()=>freshTimer(duration,mode));}
  function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportICS(){
    const stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const text=s=>String(s).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Campus Workspace//v0.2//ZH','CALSCALE:GREGORIAN'];
    state.tasks.forEach(t=>{const start=new Date(`${t.date}T${taskStart(t)}:00`),end=t.type==='block'?new Date(`${t.date}T${t.endTime}:00`):new Date(start.getTime()+60000);lines.push('BEGIN:VEVENT',`UID:${text(t.id)}@campus.local`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(end)}`,`SUMMARY:${text(t.title)}`,`DESCRIPTION:${text((t.type==='block'?'时段安排':'截止待办')+' · '+t.source+' · '+(t.origin==='manual'?'手动录入':'虚构种子')+' · '+(t.done?'已完成':'未完成'))}`,'END:VEVENT');});lines.push('END:VCALENDAR');
    const fold=line=>{let rows=[],part='',bytes=0;for(const char of line){const n=new TextEncoder().encode(char).length;if(bytes+n>75){rows.push(part);part=' ';bytes=1;}part+=char;bytes+=n;}rows.push(part);return rows.join('\r\n');};
    download(lines.map(fold).join('\r\n')+'\r\n','text/calendar;charset=utf-8',`campus-tasks-${dateAt()}.ics`);toast('已导出全部任务；以设备时区转换为 UTC 日期。');
  }
  const scheduleICSMax = 5000;
  const utcDay = value => {
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('请输入有效的学期首日。');
    const ms=Date.parse(`${value}T00:00:00Z`);
    if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value||value<'2000-01-01'||value>'2100-12-31')throw Error('日期须为 2000–2100 年内的真实日期。');
    return ms;
  };
  function scheduleICSEvents(options,courses=state.classes) {
    const base=utcDay(options.base),first=Number(options.first),last=Number(options.last);
    if(!['term','monday'].includes(options.mode)||!Number.isInteger(first)||!Number.isInteger(last)||first<1||last>60||first>last)throw Error('起止周须为 1–60 的整数，且起始周不晚于结束周。');
    if(options.mode==='monday'&&new Date(base).getUTCDay()!==1)throw Error('选择周一基准时，基准日期必须是周一。');
    if(new Date(base+last*604800000-86400000).toISOString().slice(0,10)>'2100-12-31')throw Error('导出日期范围超出 2100 年。');
    if(!Array.isArray(courses)||!courses.length)throw Error('课程数据为空，请先添加或导入课程。');
    const events=[];
    for(const c of courses)if(!weekValid(c)||!Number.isInteger(c.day)||c.day<1||c.day>7||!rangeValid(c.start,c.end))throw Error('课程日期、周次或实际起止时间无效，请先修正课程。');
    const ids=new Set(courses.map(c=>c.id)),rules={days:state.scheduleRules.days,exceptions:state.scheduleRules.exceptions.filter(r=>ids.has(r.courseId))};
    for(let day=base+(first-1)*604800000;day<base+last*604800000;day+=86400000){
      const date=new Date(day).toISOString().slice(0,10);
      for(const c of coursesOn(date,courses,options.base,rules)){
        events.push({course:c,date,start:day+(minutes(c.start)-480)*60000,end:day+(minutes(c.end)-480)*60000});
        if(events.length>scheduleICSMax)throw Error(`最多导出 ${scheduleICSMax} 个事件，请缩小周次范围。`);
      }
    }
    return events.sort((a,b)=>a.start-b.start||a.course.occurrenceId.localeCompare(b.course.occurrenceId));
  }
  function scheduleICSText(events) {
    const stamp=ms=>new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const text=s=>String(s).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Campus Workspace//Schedule//ZH','CALSCALE:GREGORIAN'];
    const now=stamp(Date.now());
    for(const e of events)lines.push('BEGIN:VEVENT',`UID:course-${Array.from(e.course.occurrenceId||e.course.id,c=>c.codePointAt(0).toString(16)).join('-')}-${e.date.replace(/-/g,'')}@campus.local`,`DTSTAMP:${now}`,`DTSTART:${stamp(e.start)}`,`DTEND:${stamp(e.end)}`,`SUMMARY:${text(e.course.title)}`,`LOCATION:${text(roomName(e.course.roomId,e.course.location))}`,`DESCRIPTION:${text('个人课表 · Asia/Shanghai（UTC+08:00），已转换为 UTC；已应用本机确认的停课、调课和补课规则。'+(e.course.ruleLabel?' · '+e.course.ruleLabel:''))}`,'END:VEVENT');
    lines.push('END:VCALENDAR');
    const encoder=new TextEncoder();
    return lines.map(line=>{const rows=[];let part='',bytes=0;for(const ch of line){const n=encoder.encode(ch).length;if(bytes+n>75){rows.push(part);part=' ';bytes=1;}part+=ch;bytes+=n;}rows.push(part);return rows.join('\r\n');}).join('\r\n')+'\r\n';
  }
  let scheduleICSPreview=null;
  function scheduleICSModal() {
    if(!state.classes.length){toast('课程数据为空，请先添加或导入课程。');return;}
    scheduleICSPreview=null;
    openModal('导出个人课表 ICS',`<form id="schedule-ics-form"><p>当前 settings.termStart 为 <strong>${escape(state.settings.termStart)}</strong>。现有定义从该日开始每七天为一周，不自动对齐周一。以下选择仅用于本次导出，不修改学期设置。</p><label>周次基准<select name="mode"><option value="term">学期首日起每七天（与现有设置一致）</option><option value="monday">第一教学周的周一（请手动确认日期）</option></select></label><label>学期首日 / 第一周周一<input type="date" name="base" value="${escape(state.settings.termStart)}" min="2000-01-01" max="2100-12-31" required></label><div class="toolbar"><label>起始周<input type="number" name="first" min="1" max="60" step="1" value="1" required></label><label>结束周<input type="number" name="last" min="1" max="60" step="1" value="30" required></label></div><p class="subtle">警告：现有 1–30 周可能只是未经确认的演示范围，并非实际教学安排。按各课程星期、起止周、单双周及实际时刻展开；已应用本机确认的停课、调课、补课规则；未确认的校历事件不自动应用。实际日期在所选范围内的临时课程才纳入。最多 ${scheduleICSMax} 个事件。</p><label><input type="checkbox" name="ack" required> 我已核对基准日期和各课周次，理解 1–30 周演示范围未经确认</label><p>按 Asia/Shanghai（UTC+08:00）准确转换为 UTC，与设备时区无关。仅生成下载，不包含任务、二维码，不申请通知或自动同步。</p><p class="form-error" role="alert"></p><div id="schedule-ics-preview" aria-live="polite"></div><div class="toolbar"><button type="button" data-action="close">取消</button><button type="submit">预览事件数</button><button type="button" class="primary" data-action="schedule-ics-download" disabled>确认下载</button></div></form>`);
  }
  function invalidateScheduleICS() {
    scheduleICSPreview=null;
    const button=$('[data-action="schedule-ics-download"]');if(button)button.disabled=true;
    const preview=$('#schedule-ics-preview');if(preview)preview.textContent='参数已修改，请重新预览。';
  }
  async function toggleNotifications(){
    if(state.settings.notifications){state.settings.notifications=false;const persisted=save();render();savedFeedback(persisted,'待办通知已关闭。');return;}
    if(!('Notification' in window)){toast('当前浏览器不支持通知，请使用页面内任务列表。');return;}
    try{const permission=await Notification.requestPermission();if(permission!=='granted'){toast(permission==='denied'?'通知被拒绝，请到浏览器站点设置手动允许；页面内任务仍可用。':'没有授予通知权限，提醒未开启。');return;}state.settings.notifications=true;const persisted=save();render();savedFeedback(persisted,'待办通知已开启；仅页面打开时检查提醒。');checkReminders();}catch{toast('无法申请通知；file:// 或当前浏览器可能不支持，请检查站点权限。');}
  }
  function checkReminders(){
    if(!state.settings.notifications||!('Notification' in window)||Notification.permission!=='granted')return;
    let changed=false;state.tasks.filter(t=>!t.done).forEach(t=>{const diff=new Date(`${t.date}T${taskStart(t)}:00`).getTime()-Date.now(),kind=diff<=0?'due':diff<=600000?'early':null;if(!kind||t.reminded.includes(kind))return;try{const notification=new Notification(t.type==='block'?(kind==='due'?'安排已开始':'安排将在 10 分钟内开始'):(kind==='due'?'任务已到期':'任务将在 10 分钟内到期'),{body:t.title,tag:`campus-${t.id}-${kind}`});notification.onclick=()=>{window.focus();location.hash='notices';notification.close();};t.reminded.push(kind);if(kind==='due'&&!t.reminded.includes('early'))t.reminded.push('early');changed=true;}catch{state.settings.notifications=false;changed=true;toast('浏览器通知发送失败，已关闭提醒；可检查权限后重新申请。');}});if(changed){const persisted=save();if(!persisted)savedFeedback(false,'待办通知状态已更新。');}
  }
  function exportData() {
    try {
      // 导出前仅结算内存，不依赖写盘成功，也不触发保存提示。
      renderTimer(false);
      const snapshot=adapter.snapshot();
      adapter.load(snapshot);
      const text=JSON.stringify(snapshot,null,2);checkBackupSize(text);
      const blob=new Blob([text],{type:'application/json'}), url=URL.createObjectURL(blob), a=document.createElement('a');
      try{a.href=url;a.download=`campus-workspace-${dateAt()}.json`;document.body.append(a);a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
      toast('已触发 JSON 导出（16 MiB 上限）；请确认下载文件，包含明文演示答案。');
      return true;
    } catch(error){toast('导出失败：'+error.message);return false;}
  }
  function previewFocusPalette(input){
    if(input.id!=='focus-palette'||!['iris','lagoon','apricot','rose'].includes(input.value))return;
    $('.focus-layout[data-focus-palette]').dataset.focusPalette=input.value;
    document.querySelectorAll('.focus-palette-buttons button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.palette===input.value)));
  }
  document.addEventListener('input',event=>previewFocusPalette(event.target));
  document.addEventListener('change',event=>previewFocusPalette(event.target));
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#sidebar-toggle')){
      const collapsed=document.body.classList.toggle('sidebar-collapsed');
      const toggle=$('#sidebar-toggle');
      toggle.setAttribute('aria-expanded',String(!collapsed));
      toggle.setAttribute('aria-label',collapsed?'展开左侧栏目':'收起左侧栏目');
      toggle.textContent=collapsed?'›':'‹';
      return;
    }
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-campus-electricity')){setServicesSection('electricity',button);return;}
    if(button.dataset.marketEdit){const item=state.market_items.find(m=>m.id===button.dataset.marketEdit);if(item?.local)marketModal(item);return;}
    if(button.dataset.marketDetail){const item=circleList().find(m=>m.id===button.dataset.marketDetail);if(item&&circleFilter==='market')openModal('闲置详情',`<h3>${escape(item.title)}</h3><p>${escape(item.description)}</p><p>${escape(circleItemCategory(item,'market'))} · ${item.local?`${escape(item.condition)} · ¥${(item.price/100).toFixed(2)}（人民币记录价） · ${escape(item.status)}`:'虚构演示 · 只读'}</p><p>仅本机记录，不公开发布、不联系或支付。</p>`);return;}
    if(button.dataset.marketState){const item=state.market_items.find(m=>m.id===button.dataset.marketState);if(!item?.local||!marketStatuses.includes(button.dataset.status))return;if(button.dataset.status==='已转出'&&!confirm('确认仅将本机记录标为已转出？不会发起交易。'))return;item.status=button.dataset.status;const persisted=save();render();toast(persisted?'闲置状态已保存到本机。':'仅更新当前页面；本地保存失败，请导出备份。');return;}
    if(button.dataset.resourceEdit){const item=state.resources.find(r=>r.id===button.dataset.resourceEdit);if(item)resourceModal(item);return;}
    if(button.dataset.resourceDelete){const item=state.resources.find(r=>r.id===button.dataset.resourceDelete);if(item&&confirm(`删除本机链接索引「${item.title}」？不会删除来源网站文件。`)){state.resources=state.resources.filter(r=>r.id!==item.id);const persisted=save();renderResources();savedFeedback(persisted,'本机链接索引已删除，不影响来源网站文件。');}return;}
    if(button.dataset.profilePreset){
      if(!profileDraft||!$('#modal').open||!profilePresets.some(([key])=>key===button.dataset.profilePreset))return;
      const draft=profileDraft;clearProfileDraft();profileDraft=draft;draft.busy=false;draft.avatar={kind:'preset',value:button.dataset.profilePreset};
      updateProfilePreview();$('#profile-file-status').textContent='预设头像待保存。';const submit=draft.form.querySelector('[type="submit"]')||draft.form.querySelector('button.primary');if(submit)submit.disabled=false;return;
    }
    if(button.dataset.servicesSection){setServicesSection(button.dataset.servicesSection,button);return;}
    if(button.dataset.action==='official-electricity-guide'){officialElectricityGuide();return;}
    if(button.dataset.action==='copy-electricity-account'){
      const name='江西师范大学后勤服务',status=$('#electricity-guide-status');
      const fallback=()=>{if(!status?.isConnected)return;status.textContent='请在微信搜索：'+name+'。';const range=document.createRange();range.selectNodeContents(status);getSelection().removeAllRanges();getSelection().addRange(range);};
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(name).then(()=>{if(status?.isConnected)status.textContent='已复制公众号名称，请在微信搜索。';}).catch(fallback);else fallback();return;
    }
    if((button.dataset.electricityMode||button.dataset.electricityRange||button.dataset.electricityPoint)&&!button.closest?.('.electricity-panel'))return;
    if(button.dataset.palette){const input=$('#focus-palette');if(!input||!['iris','lagoon','apricot','rose'].includes(button.dataset.palette))return;input.value=button.dataset.palette;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return;}
    if(button.dataset.electricityMode){const mode=button.dataset.electricityMode;if(!['personal','demo'].includes(mode))return;electricityMode=mode;electricitySelected='';button.closest('.electricity-panel').outerHTML=electricityView();$(`[data-electricity-mode="${mode}"]`)?.focus?.();return;}
    if(button.dataset.electricityRange){const n=Number(button.dataset.electricityRange);if(![7,30].includes(n))return;electricityDays=n;electricitySelected='';button.closest('.electricity-panel').outerHTML=electricityView();$(`[data-electricity-range="${n}"]`)?.focus?.();return;}
    if(button.dataset.electricityPoint){if(!electricityModel().points.some(r=>r.id===button.dataset.electricityPoint))return;electricitySelected=button.dataset.electricityPoint;const inChart=!!button.closest?.('.electricity-plot');button.closest('.electricity-panel').outerHTML=electricityView();Array.from(document.querySelectorAll(`${inChart?'.electricity-plot':'.electricity-day-list'} [data-electricity-point]`)).find(b=>b.dataset.electricityPoint===electricitySelected)?.focus();return;}
    if(button.dataset.campusScene!==undefined){const scene=button.dataset.campusScene;if(!campusScenes.some(([id])=>id===scene))return;state.appearance.background=scene;const persisted=save();applyAppearance();savedFeedback(persisted,'校园画面已更新。');return;}
    if(button.dataset.focusTask){startTaskFocus(button.dataset.focusTask);return;}
    if(button.dataset.focusKeep){decideFocusRecord(button.dataset.focusKeep,false);return;}
    if(button.dataset.focusComplete){decideFocusRecord(button.dataset.focusComplete,true);return;}
    if(button.dataset.ruleDelete){deleteScheduleRule(button.dataset.ruleDelete);return;}
    if(button.dataset.calendarRule!==undefined){const e=schoolCalendar.events[Number(button.dataset.calendarRule)];if(!e)return;if(e.type==='holiday')dayRuleModal(e.start,e.end);else dayRuleModal(e.start);return;}
    if(button.dataset.action==='new-course-exception'){courseExceptionModal($('#exception-course').value);return;}
    if(button.dataset.courseException){courseExceptionModal(button.dataset.courseException,button.dataset.date||scheduleDate);return;}
    if(button.dataset.courseDetail){const course=button.dataset.date?coursesOn(button.dataset.date).find(c=>c.occurrenceId===button.dataset.occurrence):null;const fallback=state.classes.find(c=>c.id===button.dataset.courseDetail);if(course||fallback)courseDetailModal(course||fallback);return;}
    if(button.dataset.courseMap){const course=button.dataset.date?coursesOn(button.dataset.date).find(c=>c.occurrenceId===button.dataset.occurrence):null;const fallback=state.classes.find(c=>c.id===button.dataset.courseMap);if(course||fallback)campusMapModal(course||fallback);return;}
    if(button.dataset.periodIndex!==undefined){if(!['auto','0','1','2','3','4','5'].includes(button.dataset.periodIndex))return;state.appearance.period=button.dataset.periodIndex;syncPeriodKey();const persisted=save();applyAppearance();savedFeedback(persisted,'显示时段已更新。');return;}
    if(button.dataset.dashboardMove){updateDashboard(button.dataset.dashboardMove,Number(button.dataset.direction));return;}
    if(button.dataset.serviceStatus){serviceStatusModal(button.dataset.serviceStatus);return;}
    if(button.dataset.nav){if($('#modal').open)$('#modal').close();location.hash=button.dataset.nav;return;}
    if(button.dataset.notice){noticeFilter=button.dataset.notice;render();return;}
    if(button.dataset.circle){circleFilter=button.dataset.circle;circleQuery='';circleCategory=lostStatus=lostType=circleSource='全部';render();return;}
    if(button.dataset.action==='circle-clear'){circleQuery='';circleCategory=lostStatus=lostType=circleSource='全部';render();return;}
    if(button.dataset.focusPreset){const focus=Number(button.dataset.focusPreset),short=Number(button.dataset.short);if([[50,10],[90,20],[25,5],[15,3]].some(([f,b])=>f===focus&&b===short))applyFocusPlan({...state.focus.plan,focus,short});return;}
    if(button.dataset.duration){setTimer(Number(button.dataset.duration),button.dataset.mode);return;}
    if(button.dataset.edit){const kind=button.dataset.edit,item=state[kind]?.find(x=>x.id===button.dataset.id);if(!item||kind==='lost_items'&&!item.local)return;({classes:addClassModal,tasks:addTaskModal,lost_items:addLostModal,electricityRecords:editElectricityModal})[kind]?.(item);return;}
    if(button.dataset.delete){const kind=button.dataset.delete;if(!['tasks','lost_items','electricityRecords'].includes(kind))return;const item=state[kind].find(x=>x.id===button.dataset.id);if(!item||kind==='lost_items'&&!item.local)return;if(confirm(`确定删除「${item.title||item.date+' 的手工余额'}」？此操作不可撤销。${kind==='tasks'?'历史专注投入保留，进行中的关联不转给其他任务。':''}`)){const next=clone(state);next[kind]=next[kind].filter(x=>x.id!==item.id);if(commitLocal(next,'已删除本机条目。')&&kind==='electricityRecords')electricityMode='personal';}return;}
    if(button.dataset.claim){claimModal(button.dataset.claim);return;}
    switch(button.dataset.action){
      case 'electricity-preview':previewElectricitySnapshot();break;
      case 'electricity-confirm':confirmElectricitySnapshot();break;
      case 'electricity-clear':if(state.electricitySnapshot&&confirm('只清除已载入的截图快照？手工余额和本机待载入素材保留。')){state.electricitySnapshot=null;electricityPreview=null;electricityMode='personal';const persisted=save();render();savedFeedback(persisted,'已清除截图快照，手工余额保留。');}break;
      case 'schedule-share':scheduleShareModal();break;
      case 'schedule-share-generate':generateScheduleShare();break;
      case 'schedule-share-download':downloadScheduleShare();break;
      case 'schedule-share-copy':copyScheduleShare();break;
      case 'schedule-mode':scheduleMode=scheduleMode==='compact'?'readable':'compact';render();break;
      case 'schedule-days':scheduleDays=scheduleDays===5?7:5;render();break;
      case 'schedule-prev':
      case 'schedule-next':{const d=new Date(`${scheduleDate}T12:00:00`);d.setDate(d.getDate()+(button.dataset.action==='schedule-prev'?-7:7));scheduleDate=localDate(d);render();break;}
      case 'schedule-today':scheduleDate=dateAt();render();break;
      case 'profile-settings':profileModal();break;
      case 'appearance':appearanceModal();break;
      case 'wallpaper-default':if(wallpaperDraft){wallpaperRequest++;wallpaperDraft.image='';wallpaperDraft.busy=false;wallpaperPreview();$('#wallpaper-status').textContent='已恢复默认草稿，保存后生效。';}break;
      case 'add-market':marketModal();break;
      case 'resources':resourcesModal();break;
      case 'add-resource':resourceModal();break;
      case 'sports-guide':openModal('闪动校园 · 官方打开指引',`<p><a class="schedule-official-link" href="https://www.huachenjie.com" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">打开闪动校园官方产品网站 ↗</a></p><p>此入口为站外产品网页，不是跑步打卡入口，也不保证自动唤起 App。尚未核实可用的一键唤起协议，不会尝试非官方协议或收集账号密码。</p><p>校园跑请从手机已安装的闪动校园 App 打开；尚未安装时，可从官方产品页了解下载方式，或在系统应用商店搜索“闪动校园”，自行核对开发者与学校通知。学校跑步要求以正式通知为准，本应用不读取、代跑或修改跑步记录。</p>`);break;
      case 'navigation-settings':navigationSettingsModal();break;
      case 'navigation-reset':if(confirm('恢复全部导航页面？仅恢复入口，不改首页卡片或任何记录。')){state.navigation=freshNavigation();saveNavigation();navigationSettingsModal();}break;
      case 'dashboard-settings':dashboardSettingsModal();break;
      case 'campus-code-guide':campusCodeGuideModal();break;
      case 'campus-map':campusMapModal();break;
      case 'service-status':serviceStatusModal();break;
      case 'dashboard-reset':if(confirm('恢复默认首页布局？仅恢复卡片显隐与顺序，不改课程、喝水或其他设置。')){state.dashboard=freshDashboard();const persisted=save();render();dashboardSettingsModal();savedFeedback(persisted,'已恢复默认首页布局。');}break;
      case 'hydration-settings':hydrationSettingsModal();break;
      case 'hydration-record':recordHydration();break;
      case 'hydration-undo':undoHydration();break;
      case 'hydration-notifications':toggleHydrationNotifications();break;
      case 'school-calendar':schoolCalendarModal();break;
      case 'apply-calendar-start':applyCalendarStart();break;
      case 'calendar-prev':
      case 'calendar-next':{
        const next=calendarMonths.indexOf(calendarMonth)+(button.dataset.action==='calendar-prev'?-1:1);
        if(calendarMonths[next]){calendarMonth=calendarMonths[next];renderSchoolCalendar();}
        break;
      }
      case 'close':clearCampusMap();clearScheduleShare();clearWallpaperDraft();clearProfileDraft();electricityPreview=null;$('#modal').close();break;
      case 'add-class':addClassModal();break;
      case 'load-demo-schedule':loadDemoSchedule();break;
      case 'import-classes':importClassesModal();break;
      case 'import-html-classes':importHTMLClassesModal();break;
      case 'schedule-sample':scheduleFileRequest++;$('#schedule-import-text').value=scheduleSample;invalidateSchedulePreview();break;
      case 'preview-classes':previewClasses();break;
      case 'confirm-classes':confirmClasses();break;
      case 'add-electricity':openModal('新增个人余额记录',`<p>仅添加你手工填写的人民币余额，不会复制演示样例；保存成功后切到个人模式。</p>${electricityForm()}`);break;
      case 'add-exam':addExamModal();break;
      case 'add-task':addTaskModal();break;
      case 'add-lost':addLostModal();break;
      case 'data':dataModal();break;
      case 'about':aboutModal();break;
      case 'weather':requestWeather();break;
      case 'freshman-guide':freshmanGuideModal();break;
      case 'service-pins-settings':servicePinsModal();break;
      case 'service-pins-default':document.querySelectorAll('#service-pins-form [name="pin"]').forEach(input=>{input.checked=false;});break;
      case 'schedule-ics':scheduleICSModal();break;
      case 'schedule-ics-download':{
        if(!$('#schedule-ics-form')||!scheduleICSPreview)break;
        download(scheduleICSPreview.text,'text/calendar;charset=utf-8','campus-schedule.ics');
        scheduleICSPreview=null;$('#modal').close();toast('已生成课表 ICS 下载；未开启通知或自动同步。');break;
      }
      case 'ics':exportICS();break;
      case 'notifications':toggleNotifications();break;
      case 'timer-start':toggleTimer();break;
      case 'focus-finish':finishFocusEarly();break;
      case 'focus-retry-save':retryFocusSave();break;
      case 'timer-reset':{const {duration,mode,round,phase}=timer;changeFocusTimer(()=>({...freshTimer(duration,mode),round,phase}));break;}
      case 'schedule-rules':scheduleRulesModal();break;
      case 'schedule-day-rule':dayRuleModal(button.dataset.date||scheduleDate);break;
      case 'export':exportData();break;
      case 'export-original':if(protectedArchive)download(saved,'application/json',`campus-original-${dateAt()}.json`);break;
      case 'import':$('#import-file').click();break;
      case 'reset':if(protectedArchive){toast('原存档保护中，不能重置；请先导出原始存档和当前临时数据。');break;}if(confirm('第一次确认：重置将覆盖本机课程、待办、失物、完成状态、学期与阈值设置、番茄钟与专注历史、手工电费和喝水设置及记录。这不是注销账号。建议先导出备份。继续？')&&confirm('第二次确认：确定清空本机业务记录、恢复空白初始数据，并重置时段和天气缓存？')){
        try{persistReplacement(initialState());}catch(error){toast('重置失败：'+error.message);break;}
        resetHydrationSchedule();syncPeriodKey();weather=clone(seed.weather);try{localStorage.removeItem(config.weatherKey);}catch{storageWarning();}electricityMode=null;electricityDays=null;electricitySelected='';timer=state.focus.timer;$('#modal').close();render();renderLost();toast('已重置为空白初始数据，固定天气仍明确标记为演示。');
      }break;
    }
  });
  document.addEventListener('change',event=>{
    const input=event.target;
    if(input.id==='schedule-wallpaper-file'){selectWallpaper(input);return;}
    if(input.name==='resource-kind'){resourceKind=input.value;renderResources();return;}
    if(input.name==='resource-subject'){resourceSubject=input.value;renderResources();return;}
    if(input.id==='task-type'){syncTaskType();return;}
    if(input.dataset.pageVisible){updateNavigation(input.dataset.pageVisible,input.checked);return;}
    if(input.dataset.dashboardVisible){updateDashboard(input.dataset.dashboardVisible,input.checked);return;}
    if(input.id==='calendar-month'){if(calendarMonths.includes(input.value)){calendarMonth=input.value;renderSchoolCalendar();}return;}
    if(input.id==='schedule-week'){const w=Number(input.value);if(Number.isInteger(w)&&w>=1&&w<=60){const d=new Date(`${state.settings.termStart}T12:00:00`);d.setDate(d.getDate()+(w-1)*7);scheduleDate=localDate(d);render();}return;}
    if(input.id==='schedule-date'){if(dateValid(input.value)){scheduleDate=input.value;render();}else toast('请选择有效日期。');return;}
    if(input.closest('#lost-form')&&input.name==='type'){syncLostForm();return;}
    if(input.dataset.circleSelect){if(input.dataset.circleSelect==='category')circleCategory=input.value;if(input.dataset.circleSelect==='status')lostStatus=input.value;if(input.dataset.circleSelect==='source')circleSource=input.value;if(input.dataset.circleSelect==='type'){lostType=input.value;lostStatus='全部';render();return;}renderLost();return;}
    if(!input.dataset.task)return;
    const next=clone(state),task=next.tasks.find(t=>t.id===input.dataset.task);if(!task)return;
    task.done=input.checked;
    if(!commitLocal(next,task.done?'任务已标为完成。':'任务已恢复为未完成。')){input.checked=!input.checked;}
  });
  document.addEventListener('input',event=>{if(event.target.id==='resource-search'){resourceQuery=event.target.value;renderResources();}if(event.target.id==='resource-college'){resourceCollege=event.target.value;renderResources();}if(['lost-search','circle-search'].includes(event.target.id)){circleQuery=event.target.value;renderLost();}if(event.target.id==='task-search'){taskQuery=event.target.value;renderTasks();}});
  document.addEventListener('input',event=>{if(event.target.closest('#schedule-ics-form'))invalidateScheduleICS();});
  document.addEventListener('change',event=>{if(event.target.id==='schedule-share-location')generateScheduleShare();if(event.target.closest('#schedule-ics-form'))invalidateScheduleICS();});
  document.addEventListener('submit',event=>{
    if(['day-rule-form','course-exception-form'].includes(event.target.id)){
      event.preventDefault();const form=event.target,data=Object.fromEntries(new FormData(form)),next=clone(state);
      try{
        let affected=[];
        if(form.id==='day-rule-form'){
          const from=utcDay(data.date),to=utcDay(data.endDate);if(to<from||(to-from)/86400000>30)throw Error('结束不能早于开始，一次最多31天。');
          const source=data.kind==='follow'?utcDay(data.sourceDate):0;
          for(let ms=from;ms<=to;ms+=86400000){
            const date=new Date(ms).toISOString().slice(0,10),sourceDate=data.kind==='follow'?new Date(source+ms-from).toISOString().slice(0,10):'';
            const rule={id:next.scheduleRules.days.find(r=>r.date===date)?.id||id('day-rule'),date,kind:data.kind,sourceDate,reason:data.reason.trim()};
            next.scheduleRules.days=next.scheduleRules.days.filter(r=>r.date!==date);next.scheduleRules.days.push(rule);affected.push(date);
          }
        }else{
          const kind=data.kind,cancel=kind==='cancel',move=kind==='move';
          const rule={id:id('course-rule'),courseId:form.dataset.course,kind,date:data.date,toDate:move?data.toDate:'',start:cancel?'':data.start,end:cancel?'':data.end,location:cancel?'':data.location.trim(),reason:data.reason.trim()};
          const oldList=coursesOn(rule.date);
          if((cancel||move)&&!oldList.some(c=>c.id===rule.courseId&&!c.exceptionId))throw Error('原日期没有这门常规课程；请选实际原日期，或使用“额外补课”。');
          next.scheduleRules.exceptions.push(rule);affected=[rule.date,...(move?[rule.toDate]:[])];
        }
        next.scheduleRules=scheduleRules.validate(next.scheduleRules,next.classes);
        const lines=[...new Set(affected)].map(date=>{
          const list=coursesOn(date,next.classes,next.settings.termStart,next.scheduleRules);
          const conflicts=list.some((c,i)=>list.slice(i+1).some(d=>c.start<d.end&&c.end>d.start))||list.some(c=>next.tasks.some(t=>t.type==='block'&&t.date===date&&c.start<t.endTime&&c.end>t.startTime));
          return date+'：'+list.length+'门课程'+(conflicts?'（有时间重叠）':'');
        });
        if(!confirm('确认应用以下日期规则？不会改动常规课程模板。\n'+lines.join('\n')))return;
        if(commitLocal(next,'日期规则已保存，课表与摘要已统一更新。'))scheduleRulesModal();
      }catch(error){$('#form-error').textContent=error.message;}
      return;
    }
    if(['market-form','resource-form'].includes(event.target.id)){
      event.preventDefault();const form=event.target,data=Object.fromEntries(new FormData(form)),market=form.id==='market-form',key=market?'market_items':'resources',existing=state[key].find(r=>r.id===form.dataset.record);
      try{
        if(form.dataset.record&&!existing)throw Error('原记录已不存在，请重新打开。');
        if(market&&existing&&!existing.local)throw Error('示例为只读。');
        if(state[key].length>=1000&&!existing)throw Error('本机记录已达 1000 条上限。');
        let record;
        if(market){if(!/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(data.price))throw Error('人民币价格须为 0–100000 元，最多两位小数。');record=validateMarketItem({id:existing?.id||id('market'),local:true,title:data.title.trim(),category:data.category,condition:data.condition,price:Math.round(Number(data.price)*100),description:data.description.trim(),status:data.status});}
        else{if(data.kind==='培养方案'&&!data.major.trim())throw Error('培养方案请填写专业。');record=validateResource({id:existing?.id||id('resource'),title:data.title.trim(),kind:data.kind,subject:data.subject,college:data.college.trim(),year:data.year.trim(),major:data.major.trim(),source:data.source.trim(),url:data.url.trim(),license:data.license.trim(),shareable:data.shareable==='on'});}
        if(existing)state[key][state[key].indexOf(existing)]=record;else state[key].push(record);
        const persisted=save();$('#modal').close();if(market)render();else resourcesModal();toast(persisted?'记录已保存到本机；未发布或上传。':'仅更新当前页面，未写入本地存档；请导出备份。');
      }catch(e){$('#form-error').textContent=e.message;}
      return;
    }
    if(event.target.id==='service-pins-form'){
      event.preventDefault();const form=event.target;
      try{
        const pins=validateServicePins(new FormData(form).getAll('pin'));
        state.servicePins=pins;const persisted=save();$('#modal').close();render();
        toast(persisted?'常用服务已保存到本机。':'常用服务仅更新当前页面，未写入存档；请导出备份。');
      }catch(e){form.querySelector('.form-error').textContent=e.message;}
      return;
    }
    if(event.target.id==='schedule-ics-form'){
      event.preventDefault();const form=event.target,data=Object.fromEntries(new FormData(form));invalidateScheduleICS();
      try{
        if(data.ack!=='on')throw Error('请先确认学期基准和演示周次风险。');
        const events=scheduleICSEvents(data);
        if(!events.length)throw Error('所选周次没有课程事件，请调整范围或检查单双周。');
        scheduleICSPreview={text:scheduleICSText(events)};
        $('#schedule-ics-preview').textContent=`预览：${events.length} 个课程事件，中国日期 ${events[0].date} 至 ${events[events.length-1].date}。请确认后下载。`;
        form.querySelector('.form-error').textContent='';$('[data-action="schedule-ics-download"]').disabled=false;
      }catch(e){form.querySelector('.form-error').textContent=e.message;$('#schedule-ics-preview').textContent='未生成可下载文件。';}
      return;
    }
    const form=event.target;if(!['class-form','task-form','lost-form','claim-form','term-form','timer-form','electricity-form','threshold-form','hydration-form','appearance-form','focus-plan-form','profile-form'].includes(form.id))return;
    event.preventDefault();const data=Object.fromEntries(new FormData(form));
    const error=message=>{const el=$('#form-error');el.textContent=message;};
    const upsert=(key,item)=>{const i=state[key].findIndex(x=>x.id===form.dataset.edit);if(i>=0)state[key][i]=item;else state[key].push(item);};
    if(form.id==='profile-form'){
      if(!profileDraft||profileDraft.form!==form||!$('#modal').open)return;
      if(profileDraft.busy){error('图片仍在处理中，请稍候或选择预设头像。');return;}
      let profile;try{profile=validateProfile({nickname:typeof data.nickname==='string'?data.nickname.trim():data.nickname,customId:data.customId,avatar:profileDraft.avatar});}catch(e){error(e.message);return;}
      state.profile=profile;const persisted=save();clearProfileDraft();$('#modal').close();render();toast(persisted?'本机资料已保存；昵称、ID 和头像不参与云备份。':'资料仅更新当前页面，未写入存档；请导出备份。');return;
    }
    if(form.id==='appearance-form'){
      if(wallpaperDraft?.busy){error('壁纸仍在处理中，请稍候或恢复默认。');return;}
      const next={...freshAppearance(),...data,scheduleImage:wallpaperDraft?.image??state.appearance.scheduleImage};
      if(!appearanceValid(next)){error('请选择有效外观选项。');return;}
      state.appearance=next;clearWallpaperDraft();syncPeriodKey();const persisted=save();$('#modal').close();applyAppearance();savedFeedback(persisted,'外观设置已应用。');return;
    }
    if(form.id==='hydration-form'){
      const interval=Number(data.interval),volume=Number(data.volume);
      if(!hydrationIntervals.includes(interval)||!hydrationVolumes.includes(volume)||!rangeValid(data.start,data.end)){error('请选择有效间隔与杯量；同日结束时间须晚于开始，分钟须为00–59。');return;}
      Object.assign(state.hydration,{enabled:data.enabled==='on',interval,start:data.start,end:data.end,volume});
      resetHydrationSchedule();const persisted=save();$('#modal').close();render();savedFeedback(persisted,state.hydration.enabled?'喝水提醒已开启，重新等待所选间隔。':'喝水提醒已关闭，记录保留；待办提醒不受影响。');return;
    }
    if(form.id==='focus-plan-form'){if(Object.keys(data).some(k=>!['focus','short','long','rounds','target','palette','autoNext','endNotice'].includes(k))){toast('方案包含未知字段。');return;}applyFocusPlan({focus:Number(data.focus),short:Number(data.short),long:Number(data.long),rounds:Number(data.rounds),target:data.target,palette:data.palette,autoNext:data.autoNext==='on',endNotice:data.endNotice==='on'});return;}
    if(form.id==='timer-form'){const n=Number(data.duration);if(!Number.isInteger(n)||n<1||n>180||!['focus','break'].includes(data.mode)){toast('分钟必须是 1–180 的整数。');return;}setTimer(n,data.mode);return;}
    if(form.id==='term-form'){if(!dateValid(data.termStart)||data.termStart<'2000-01-01'||data.termStart>'2100-12-31'){toast('开学日期须为2000–2100年有效日期。');return;}const next=clone(state);next.settings.termStart=data.termStart;commitLocal(next,'学期设置已应用，课程日期统一重算。');return;}
    if(form.id==='threshold-form'){const n=Number(data.threshold);if(data.threshold===''||!Number.isFinite(n)||n<0||n>100000){toast('阈值须为 0–100000 元。');return;}state.settings.lowBalance=n;const persisted=save();render();savedFeedback(persisted,'低余额阈值已更新。');return;}
    if(form.id==='electricity-form'){const n=Number(data.balance),edit=form.dataset?.edit;if(!dateValid(data.date)||typeof data.balance!=='string'||!data.balance.trim()||!Number.isFinite(n)||n< -100000||n>100000){toast('请检查手工日期与余额（-100000–100000 元）。');return;}if(edit&&!state.electricityRecords.some(r=>r.id===edit)){toast('该记录已不存在，请重新打开。');return;}if(!edit&&state.electricityRecords.length>=5000){toast('最多保存 5000 条，请先备份清理。');return;}const record={id:edit||id('e'),date:data.date,balance:n};if(edit)state.electricityRecords[state.electricityRecords.findIndex(r=>r.id===edit)]=record;else state.electricityRecords.push(record);electricityMode='personal';electricitySelected=record.id;const persisted=save();$('#modal').close();render();savedFeedback(persisted,'手工余额已更新，非实时数据。');return;}
    if(form.id==='class-form'){
      if(!textValid(data.title)||!rangeValid(data.start,data.end)){error('请输入有效课程名称，且结束时间必须晚于开始时间（不跨午夜）。');return;}
      data.location=data.location.trim();
      if((data.location?!textValid(data.location,100):!seed.rooms.some(r=>r.id===data.roomId))||![1,2,3,4,5,6,7].includes(Number(data.day))){error('请选择有效星期，并选择教室或填写 1–100 字符的地点。');return;}
      if(!form.dataset.edit&&state.classes.length>=1000){error('最多保存 1000 条课程，请先导出备份。');return;}
      const wf={startWeek:Number(data.startWeek),endWeek:Number(data.endWeek),parity:data.parity};if(!weekValid(wf)){error('周次须为 1–60，结束周不早于起始周。');return;}
      const overlap=state.classes.some(c=>c.id!==form.dataset.edit&&c.day===Number(data.day)&&minutes(data.start)<minutes(c.end)&&minutes(data.end)>minutes(c.start)&&Array.from({length:60},(_,i)=>i+1).some(w=>w>=c.startWeek&&w<=c.endWeek&&w>=wf.startWeek&&w<=wf.endWeek&&(c.parity==='all'||w%2===(c.parity==='odd'?1:0))&&(wf.parity==='all'||w%2===(wf.parity==='odd'?1:0))));
      if(overlap&&!confirm('该课程与个人课表已有课程时间重叠，仍要保存吗？'))return;
      const next=clone(state),course={...wf,id:form.dataset.edit||id('c'),title:data.title.trim(),day:Number(data.day),start:data.start,end:data.end,roomId:data.location?'':data.roomId,...(data.location?{location:data.location}:{}),color:state.classes.find(c=>c.id===form.dataset.edit)?.color||'purple'};
      const index=next.classes.findIndex(c=>c.id===course.id);if(index>=0)next.classes[index]=course;else next.classes.push(course);
      if(commitLocal(next,'常规课程已更新，单次规则保留。'))$('#modal').close();return;
    }
    if(form.id==='task-form'){
      const type=data.type===undefined?'deadline':data.type,block=type==='block',time=block?data.endTime:data.time;
      if(!['deadline','block'].includes(type)||!textValid(data.title)||!dateValid(data.date)||!timeValid(time)||!['个人','学习通','考试','学业'].includes(data.source)){error('请检查任务类型、标题、日期、时间及来源。');return;}
      if(block&&!rangeValid(data.startTime,data.endTime)){error('时段安排只支持同日，结束时间必须晚于开始时间，不支持跨午夜。');return;}
      const previous=state.tasks.find(t=>t.id===form.dataset.edit);
      if(!previous&&state.tasks.length>=1000){error('最多保存 1000 条任务，请先导出备份。');return;}
      const task={id:form.dataset.edit||id('t'),title:data.title.trim(),type,date:data.date,time,...(block?{startTime:data.startTime,endTime:data.endTime}:{}),source:data.source,done:previous?.done||false,origin:'manual',reminded:previous&&(previous.type||'deadline')===type&&previous.date===data.date&&previous.time===time&&previous.startTime===(block?data.startTime:undefined)?previous.reminded:[]};
      if(block){const conflicts=blockConflicts(task);if(conflicts.length){error('时间重叠提示：'+conflicts.join('；')+'。可自行确认保存，不会覆盖课表。');if(!confirm('该安排与以下内容时间重叠：\n'+conflicts.join('\n')+'\n仍要保存吗？仅保留本机安排，不覆盖已有课表。'))return;}}
      const next=clone(state),index=next.tasks.findIndex(t=>t.id===task.id);if(index>=0)next.tasks[index]=task;else next.tasks.push(task);
      if(commitLocal(next,'任务已更新。'))$('#modal').close();return;
    }
    if(form.id==='lost-form'){
      if(form.dataset.edit&&!state.lost_items.some(l=>l.id===form.dataset.edit&&l.local)){error('只可编辑已有本机登记，虚构示例只读。');return;}
      if(!form.dataset.edit&&state.lost_items.length>=1000){error('最多保存 1000 条失物，请先导出备份。');return;}
      if(!textValid(data.title,80)||!textValid(data.description,500)||!textValid(data.question,160)||!textValid(data.answer,80)||!textValid(data.hint,160)||data.consent!=='on'){error('请填写所有字段并确认仅使用虚构信息。');return;}
      if(data.category==='证件卡片'&&!/^\d{4}$/.test(data.answer.trim())){error('证件类仅允许虚构四位数字作为演示答案，不要填完整证件号码。');return;}
      if(!['lost','found'].includes(data.type)||!lostStatuses(data.type).includes(data.status)||!lostCategories.includes(data.category)||!textValid(data.place,100)){error('类型、状态或分类无效。');return;}
      upsert('lost_items',{id:form.dataset.edit||id('l'),title:data.title.trim(),category:data.category,place:data.place,description:data.description.trim(),question:data.question.trim(),answer:data.answer.trim(),hint:data.hint.trim(),status:data.status,type:data.type,local:true});
    }
    if(form.id==='claim-form'){
      const item=state.lost_items.find(l=>l.id===form.dataset.item);if(!item||!item.local||item.type!=='found'||item.status!=='待认领'){error('只可演示核验本机待认领记录，示例只读。');return;}
      if(data.answer.trim()!==item.answer.trim()){error('回答不匹配。条目状态未改变，请勿猜测真实信息。');return;}
      item.status='待人工核验';
    }
    const persisted=save();$('#modal').close();render();renderLost();savedFeedback(persisted,form.id==='claim-form'?'已进入待人工核验演示；没有自动交付，也无真实审核后台。':form.id==='class-form'?'课程已更新。':form.id==='task-form'?'任务已更新。':'失物登记已更新。');
  });
  $('#import-file').addEventListener('change',async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try {
      if(protectedArchive)throw Error('原存档受保护，不能导入覆盖；请先导出原始存档和当前临时数据。');
      if(file.size>backupMaxBytes)throw Error('JSON 备份超过 16 MiB（UTF-8 字节）安全上限，未导入。');
      const text=await file.text();checkBackupSize(text);
      const incoming=adapter.load(parseArchive(text.replace(/^\uFEFF/,'')));
      if(!confirm(`数据校验通过：${incoming.classes.length} 门课程、${incoming.tasks.length} 个待办、${incoming.lost_items.length} 条失物，含本机资料（旧档缺省则恢复本机访客）。将覆盖当前本机业务数据，继续？`))return;
      persistReplacement(incoming);
      electricityMode=null;electricityDays=null;electricitySelected='';timer=state.focus.timer;resetHydrationSchedule();syncPeriodKey();$('#modal').close();if(state.navigation.hidden.includes(view)){location.hash='home';navigate('home');}renderTimer();render();toast('JSON 已导入并写入本机存档；配置和天气未替换。');
    } catch(error){toast('导入失败：'+error.message);}
  });
  window.addEventListener('hashchange',()=>{navigate(location.hash.slice(1));});
  window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);
  let today=dateAt(),minuteKey='';
  function refreshClock(){renderTimer();checkReminders();checkHydration();const current=dateAt(),key=Math.floor(Date.now()/60000);if(current!==today){if(scheduleDate===today)scheduleDate=current;today=current;render();}if(key!==minuteKey){minuteKey=key;syncSidebarSummary();renderPeriod();if(view==='home'&&$('#today-timeline')&&!$('#today-timeline').contains(document.activeElement))$('#today-timeline').innerHTML=deadlineOverview()+timelineView();if(!$('#modal').open){if(view==='home'&&!$('#content').contains(document.activeElement))render();if(view==='services'&&servicesSection==='overview'&&!$('#content').contains(document.activeElement))render();if(view==='notices')renderTasks();if(view==='schedule'&&!$('#content').contains(document.activeElement))render();}}}
  setInterval(refreshClock,1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshClock();});
  navigate(location.hash.slice(1)||'home');renderLost();
  // 仅扩展内部页面读取一次性候选，不接受网站 postMessage 或 URL 课程数据。
  if(location.protocol==='chrome-extension:' && window.chrome?.storage?.session){
    const token=new URLSearchParams(location.search).get('courseImport');
    if(token && /^[a-f0-9-]{36}$/.test(token)){
      const key='course-import:'+token;
      chrome.storage.session.get(key).then(async result=>{
        await chrome.storage.session.remove(key);
        const packet=result[key];
        if(!packet||Date.now()-packet.createdAt>120000||!Array.isArray(packet.candidates)||packet.candidates.length>200)throw Error('导入候选已过期，请回到教务页面再点一次扩展。');
        history.replaceState(null,'',location.pathname+'#schedule');navigate('schedule');
        importHTMLClassesModal(packet.candidates);
      }).catch(()=>toast('一次性课表候选不存在或已过期，请回教务页面重试。'));
    }
  }
})();
