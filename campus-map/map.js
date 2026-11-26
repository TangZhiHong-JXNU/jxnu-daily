/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * 师大·日常 瑶湖双楼同屏原型，2026-11-24。
 * 方位球调用改编自 NJUPT-CS-StuDev/studev 的 ball.ts，固定提交
 * cf85eec1182583a030b57d09073c27e67c9298b9；保留完整上游许可及原源码。
 * 腾讯原生地图统一承载公开地点、相机、方向球和真实步行路线。
 * 不含个人存档，不主动定位；POI不是入口，不提供自制测绘楼体。
 */
(function () {
  'use strict';
  const scriptBase=new URL('.',document.currentScript.src);
  const asset=name=>new URL(name,scriptBase).href;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const catalog=window.CampusPlaces;
  let sdkPromise=null,sdkReady=null,instanceId=0,sdkAttempt=0;
  const initialPitch=45;
  const clampPitch=value=>Math.max(0,Math.min(70,value));
  const wrapRotation=value=>((value%360)+360)%360;
  // 诊断仅输出固定枚举；不显示异常正文、请求地址或任何凭据。
  const failures=Object.freeze({
    'sdk-network':['地图组件未下载','未能下载腾讯地图组件，请检查网络后重试。'],
    'sdk-timeout':['地图组件加载超时','腾讯地图组件未在等待时间内完成下载，可以重试。'],
    'sdk-incomplete':['地图组件未就绪','脚本已返回，但地图或步行服务组件尚未就绪，可以重试。'],
    'map-create':['地图画面未创建','地图组件已就绪，但浏览器未能创建地图画面。可重试，或换用支持 WebGL 的浏览器。'],
    'map-events':['地图事件未就绪','地图画面已创建，但初始化尚未完成，可以重试。'],
    'map-markers':['校园标记未就绪','地图组件已连接，但校园地点标记未完成初始化，可以重试。'],
    'map-view':['地图视野未就绪','底图已返回，但初始视野未完成调整，可以重试。'],
    'tiles-timeout':['底图加载超时','地图画面已创建，但底图未在等待时间内显示。地点列表仍可用。'],
    'context-lost':['地图渲染中断','浏览器暂时回收了地图渲染资源，点击重试即可；地点列表仍可用。']
  });
  const diagnosticError=code=>Object.assign(new Error('Campus map unavailable'),{campusMapCode:code});
  // 不写完整占位符名称，避免文件预览整体替换时误改判定式。
  const needsProxy=value=>typeof value!=='string'||!value.trim()||/__WB_[A-Z_]+__/.test(value);
  const icon=(name,size=19)=>{
    const paths={search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',reset:'<path d="M4 8a8 8 0 1 1-1 8M4 3v5h5"/>',plus:'<path d="M5 12h14M12 5v14"/>',minus:'<path d="M5 12h14"/>',building:'<path d="M3 21h18M6 21V7l6-4 6 4v14M9 10h1m4 0h1m-6 4h1m4 0h1m-5 7v-4h4v4"/>'};
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.building}</svg>`;
  };
  const sketch='<svg class="cm-fallback-art" viewBox="0 0 160 110" fill="none" aria-hidden="true"><path d="M12 90h136M21 87V43l24-12 23 12v44M68 87V23l30-14 30 14v64M128 44l16 8v35M73 26h50M29 48h30M78 36h9m14 0h10M78 49h9m14 0h10M78 62h9m14 0h10M30 58h8m10 0h8M30 70h8m10 0h8M88 87V73h17v14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10 97c37-5 63 5 99 0 17-2 29-1 41 1M8 101c15-1 25 2 39 1" stroke="currentColor" stroke-width="1" opacity=".35"/></svg>';
  function shell(options={}) {
    if(!catalog)return '<p>地点模块未加载，请刷新后重试。</p>';
    const context=String(options.locationText||'').slice(0,160),matched=catalog.match(context);
    const focusDefault=!matched||matched.focus;
    const focusPlaces=catalog.places.filter(place=>place.focus);
    return `<section class="cm-app cm-dual" aria-label="瑶湖双楼校园地图">
      <div class="cm-mast"><div><span class="cm-kicker">TWO BUILDINGS · ONE CAMPUS</span><h2>从这一栋，到下一栋</h2><p>惟义楼 · 实验大楼，在同一张真实地图里找路。</p></div><div class="cm-mast-actions">${options.canGoBack?'<button type="button" class="cm-text" data-cm-back>‹ 返回课程</button>':''}<a class="cm-text cm-link" href="${esc(asset('source.html'))}" target="_blank" rel="noopener noreferrer">来源 / 源码 ↗</a></div></div>
      ${context?`<p class="cm-context">课程地点：${esc(context)}${matched?' · 已匹配建筑，未定位具体教室。':' · 暂无可靠匹配，请手动选建筑。'}</p>`:''}
      <div class="cm-focus-strip" aria-label="双楼快捷选择">${focusPlaces.map((place,index)=>`<button type="button" data-cm-place="${place.id}" data-cm-quick aria-pressed="false"><span class="cm-focus-number">0${index+1}</span>${esc(place.name)}<span aria-hidden="true">↗</span></button>`).join('')}<span class="cm-focus-caption">真实地点 · 不猜入口</span></div>
      <div class="cm-searchbar"><label class="cm-search">${icon('search')}<span class="cm-sr">搜索已收录地点</span><input type="search" maxlength="100" placeholder="找建筑：惟义楼、实验大楼…" data-cm-search autocomplete="off"></label><div class="cm-filter" aria-label="地点范围"><button type="button" data-cm-filter="focus" aria-pressed="${focusDefault}">双楼重点</button><button type="button" data-cm-filter="all" aria-pressed="${!focusDefault}">全部 ${catalog.places.length} 处</button></div></div>
      <div class="cm-layout"><div class="cm-visual"><div class="cm-canvas" data-cm-canvas aria-label="腾讯地图：瑶湖公开地点与原生建筑"></div><div class="cm-map-status" data-cm-status role="status">正在连接腾讯底图</div>
        <div class="cm-fallback" data-cm-fallback>${sketch}<h3 data-cm-fallback-title>正在展开校园</h3><p data-cm-fallback-message>地点列表可以先用，底图需要联网。</p><div class="cm-fallback-actions"><button type="button" data-cm-retry>重试底图</button><a class="cm-link" href="${esc(catalog.officialMap)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">学校官方平面图 ↗</a></div></div>
        <div class="cm-tools" aria-label="地图镜头控制"><button type="button" data-cm-camera data-cm-north disabled aria-label="方向球：拖动旋转与倾斜；单击北向归位" aria-describedby="cm-orbit-help" title="拖动方向球；单击朝北"><svg viewBox="-23 -23 46 46" aria-hidden="true"><circle cx="0" cy="0" r="15" fill="none" stroke="currentColor" stroke-opacity=".3" stroke-width="1"/><path class="cm-orbit-ring" data-cm-ring d=""/><path class="cm-orbit-north" data-cm-north-path d=""/><text x="0" y="-17" text-anchor="middle" fill="currentColor" font-size="7">N</text></svg></button><button type="button" data-cm-camera data-cm-zoom="1" disabled aria-label="放大地图" title="放大">${icon('plus')}</button><button type="button" data-cm-camera data-cm-zoom="-1" disabled aria-label="缩小地图" title="缩小">${icon('minus')}</button><button type="button" data-cm-camera data-cm-reset disabled aria-label="恢复双楼初始视角" title="双楼总览">${icon('reset')}</button></div>
        <div class="cm-viewbar" aria-label="视角预设"><button type="button" data-cm-camera data-cm-view="perspective" disabled aria-pressed="true">倾斜</button><button type="button" data-cm-camera data-cm-view="overhead" disabled aria-pressed="false">俯视</button><output data-cm-view-label>北向 · 倾斜 45°</output></div>
        </div>
        <aside class="cm-panel" aria-label="目的地与路线"><div class="cm-list-head"><span>已收录的公开地点</span><span data-cm-count></span></div><div class="cm-place-list" data-cm-list></div><div class="cm-detail" data-cm-detail></div></aside></div>
      <div class="cm-bottom"><span>本地双楼原型 · 非官方校园工具</span><span>腾讯原生道路与建筑 · 建筑覆盖以底图为准</span><span id="cm-orbit-help">方向球：左右转向，上下倾斜；方向键可操作，Home 朝北。</span></div>
      <details class="cm-privacy"><summary>地图、建筑与隐私说明</summary><p>地图使用腾讯公开地点、道路及原生建筑显示，不是自制建筑复原。两楼尚缺可信轮廓、朝向与高度；没有把示意楼体放在地图里。POI不等于入口，不提供楼层或教室定位。本页不申请定位、不读取原应用存档，查询只发送所选公开地点坐标。手机当前位置需在腾讯地图单独授权；历史留样不是本次路线。</p></details>
    </section>`;
  }
  // 失败后短暂保留无副作用回调，承接已在路上的通知；不永久保留加载闭包。
  function retireSDKCallback(name){
    const timer=setTimeout(()=>{if(window[name]===late)delete window[name];},60000);
    const late=()=>{clearTimeout(timer);if(window[name]===late)delete window[name];};
    window[name]=late;
  }
  function loadSDK() {
    const serviceHost=window._TMapSecurityConfig?.serviceHost;
    if(needsProxy(serviceHost))return Promise.reject(diagnosticError('proxy-unavailable'));
    if(sdkReady===window.TMap&&sdkReady?.Map&&sdkReady?.service?.Walking)return Promise.resolve(sdkReady);
    if(sdkPromise)return sdkPromise;
    sdkPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script'),callbackName='__campusMapSDKReady'+(++sdkAttempt);
      // 按官方callback协议等待附加库，不能把script.onload视为就绪。
      script.src='https://map.qq.com/api/gljs?v=1.exp&libraries=service&callback='+callbackName;
      script.async=true;script.dataset.campusMapSdk='true';
      let finished=false,downloaded=false;
      const cleanup=()=>{clearTimeout(timer);script.onload=null;script.onerror=null;};
      const fail=code=>{if(finished)return;finished=true;cleanup();script.remove();retireSDKCallback(callbackName);reject(diagnosticError(code));};
      const ready=()=>{
        if(finished)return;
        if(!window.TMap?.Map||!window.TMap?.service?.Walking){fail('sdk-incomplete');return;}
        finished=true;cleanup();sdkReady=window.TMap;delete window[callbackName];resolve(sdkReady);
      };
      const timer=setTimeout(()=>fail(downloaded?'sdk-incomplete':'sdk-timeout'),14000);
      window[callbackName]=ready;
      script.onerror=()=>fail('sdk-network');script.onload=()=>{downloaded=true;};
      try{document.head.append(script);}catch{fail('sdk-network');}
    }).catch(error=>{sdkPromise=null;throw error;});
    return sdkPromise;
  }
  function routeLink(destination,origin=null) {
    const url=new URL('https://apis.map.qq.com/uri/v1/routeplan');
    const params={type:'walk',to:'江西师范大学瑶湖校区'+destination.name,tocoord:`${destination.lat},${destination.lng}`,coord_type:'2',referer:'师大日常校园地图'};
    if(origin){params.from='江西师范大学瑶湖校区'+origin.name;params.fromcoord=`${origin.lat},${origin.lng}`;}
    Object.entries(params).forEach(([key,value])=>url.searchParams.set(key,value));return url.href;
  }
  // 只接受服务实际返回的坐标点，不补两点直线，不猜数字点串是否已解压。
  function routePoints(polyline,TMap) {
    if(!Array.isArray(polyline)||polyline.length<2||polyline.length>50000)return [];
    const points=[];
    for(const point of polyline){
      if(!point||typeof point!=='object'||Array.isArray(point))return [];
      const lat=typeof point.getLat==='function'?point.getLat():point.lat;
      const lng=typeof point.getLng==='function'?point.getLng():point.lng;
      if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<28.60||lat>28.76||lng<115.96||lng>116.10)return [];
      points.push(new TMap.LatLng(lat,lng));
    }
    return points;
  }
  function routeFailure(error) {
    const stages={'upstream-business':'腾讯接口拒绝了本次请求','upstream-http':'腾讯接口返回HTTP错误','upstream-network':'服务器未能连接腾讯接口','upstream-timeout':'服务器等待腾讯接口超时','upstream-format':'腾讯接口响应未通过格式校验'};
    const marker=typeof error?.message==='string'?error.message.match(/^CMAP\/(upstream-business|upstream-http|upstream-network|upstream-timeout|upstream-format)\/(\d{1,4})\/(\d{1,3})$/):null;
    if(marker)error={stage:marker[1],upstreamStatus:Number(marker[2]),upstreamHttpStatus:Number(marker[3])};
    let stage=Object.prototype.hasOwnProperty.call(stages,error?.stage)?error.stage:'';
    let status=0,text='这次没有取得步行路线';
    if(stage){text=stages[stage];if(stage==='upstream-business'&&Number.isInteger(error.upstreamStatus)&&error.upstreamStatus>0&&error.upstreamStatus<=9999)status=error.upstreamStatus;if(stage==='upstream-http'&&Number.isInteger(error.upstreamHttpStatus)&&error.upstreamHttpStatus>=100&&error.upstreamHttpStatus<=599)status=error.upstreamHttpStatus;}
    else if(error?.campusMapCode==='route-timeout'){stage='route-timeout';text='页面等待步行路线超时';}
    else if(error?.campusMapCode==='route-format'){stage='route-format';text='路线结果缺少可用的距离数据';}
    else if(error?.status===2){stage='sdk-network';text='步行请求未能送达，或服务端拒绝了请求';}
    else stage='route-unavailable';
    return {diagnostic:stage+(status?'/'+status:''),error:text+(status?'（状态码 '+status+'）':'')+'。可以重试，或在腾讯地图继续；没有用直线代替路线。'};
  }
  function pin(number,selected) {
    const color=selected?'#386958':'#ae6553';
    return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="41" viewBox="0 0 32 41"><path d="M16 39S2 23 2 16a14 14 0 0 1 28 0c0 7-14 23-14 23Z" fill="${color}" stroke="#fcfef9" stroke-width="2"/><circle cx="16" cy="16" r="9" fill="#fcfef9"/><text x="16" y="20" fill="${color}" font-size="12" text-anchor="middle" font-family="sans-serif" font-weight="600">${number}</text></svg>`);
  }
  function mount(host,options={}) {
    const root=host.querySelector('.cm-app');
    if(!root||!catalog)return ()=>{};
    const $=selector=>root.querySelector(selector),listen=new AbortController(),timers=new Set();
    const places=catalog.places,focusPlaces=places.filter(place=>place.focus),matched=catalog.match(String(options.locationText||'').slice(0,160)),uid=++instanceId;
    let selected=(matched||focusPlaces[0]||places[0]).id,originId='',category=matched&&!matched.focus?'all':'focus',query='',disposed=false,session=0,request=0;
    let map=null,markers=null,routeLayer=null,mapReady=false,mapLoading=false,routeState=null,routeAbort=null;
    let hasSelected=!!matched,connectionState='loading',drag=null,suppressClick=false;
    const events=[];
    let tileTimer=null;
    const later=(fn,ms)=>{const timer=setTimeout(()=>{timers.delete(timer);fn();},ms);timers.add(timer);return timer;};
    const cancelTimer=timer=>{clearTimeout(timer);timers.delete(timer);};
    const active=()=>!disposed&&root.isConnected;
    const getPlace=id=>places.find(place=>place.id===id)||null;
    const setStatus=text=>{if(active())$('[data-cm-status]').textContent=text;};
    const cameraControls=()=>root.querySelectorAll('[data-cm-camera]');
    function syncRouteButton(){
      const button=$('[data-cm-route]');if(!button)return;
      const ready=connectionState==='ready';
      button.disabled=!ready||!originId||originId===selected||!!routeState?.pending;
      button.textContent=routeState?.pending?'正在查询…':ready?'查看步行路线':connectionState==='loading'?'正在连接地图…':'站内查路暂不可用';
      button.title=ready?'':connectionState==='missing'?'此预览没有取得地图连接配置，不是起点选择错误。':'地图连接成功后可查询步行路线。';
    }
    function orbit(){
      const rotation=map?.getRotation?.()||0,pitch=map?map.getPitch():initialPitch;
      const paths=window.CampusOrientationBall?.orientationBall(rotation,pitch);
      if(paths){$('[data-cm-ring]').setAttribute('d',paths.ring);$('[data-cm-north-path]').setAttribute('d',paths.north);}
      $('[data-cm-view-label]').textContent=`${Math.round(wrapRotation(rotation))%360===0?'北向':'转向 '+Math.round(wrapRotation(rotation))%360+'°'} · ${pitch<1?'俯视':'倾斜 '+Math.round(pitch)+'°'}`;
      root.querySelectorAll('[data-cm-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cmView===(pitch<1?'overhead':'perspective'))));
    }
    function setCamera(rotation,pitch){if(!map)return;map.setRotation(wrapRotation(rotation));map.setPitch(clampPitch(pitch));orbit();}
    function clearRoute(){request++;if(routeAbort){routeAbort();routeAbort=null;}routeState=null;delete root.dataset.cmRouteDiagnostic;if(routeLayer){try{routeLayer.setMap(null);}catch{}routeLayer=null;}}
    function fitPoints(points,maxZoom=17.5){
      if(!map||!window.TMap?.LatLngBounds||!points?.length)return;
      const rotation=map.getRotation(),pitch=map.getPitch();
      const bounds=new window.TMap.LatLngBounds(points[0],points[0]);points.forEach(point=>bounds.extend(point));
      map.fitBounds(bounds,{padding:{top:80,bottom:100,left:64,right:64},maxZoom,ease:{duration:0}});
      // 即使SDK适配视野时重置镜头，也恢复用户当前方向与倾角。
      setCamera(rotation,pitch);
    }
    function overview(){
      if(!map)return;
      setCamera(0,initialPitch);
      fitPoints((focusPlaces.length?focusPlaces:places).map(place=>new window.TMap.LatLng(place.lat,place.lng)),17.2);
      hasSelected=false;
    }
    function focusPlace(place){
      if(!map)return;
      map.setCenter(new window.TMap.LatLng(place.lat,place.lng));map.setZoom(17.8);orbit();
    }
    function releaseMap(){
      session++;mapReady=false;mapLoading=false;drag=null;suppressClick=false;
      if(tileTimer!==null){cancelTimer(tileTimer);tileTimer=null;}
      for(const [object,name,fn] of events.splice(0)){try{object.off(name,fn);}catch{}}
      if(markers){try{markers.setMap(null);}catch{}markers=null;}
      if(routeLayer){try{routeLayer.setMap(null);}catch{}routeLayer=null;}
      if(map){try{map.destroy();}catch{}map=null;}
      $('[data-cm-canvas]').replaceChildren();cameraControls().forEach(button=>button.disabled=true);
    }
    function fallback(title,message,state='failed'){
      if(!active())return;
      connectionState=state;$('[data-cm-fallback]').hidden=false;
      $('[data-cm-fallback-title]').textContent=title;$('[data-cm-fallback-message]').textContent=message;
      const retry=$('[data-cm-retry]');retry.hidden=state==='missing';retry.disabled=state==='missing';
      setStatus(state==='missing'?'预览未接通 · 地点可查':'地图连接失败 · 地点可查');renderDetail();
    }
    function diagnose(code){
      const fixed=Object.prototype.hasOwnProperty.call(failures,code)?code:'map-create';
      root.dataset.cmDiagnostic=fixed;fallback(failures[fixed][0],failures[fixed][1]);setStatus('地图连接失败 · 阶段 '+fixed+' · 地点可查');
    }
    function reference(origin,destination){return catalog.referenceRoutes.find(route=>route.from===origin?.id&&route.to===destination.id)||null;}
    function routeHTML(destination,origin){
      const sample=reference(origin,destination);let html='';
      if(routeState?.pending)html='<p>正在查询腾讯步行路线…</p>';
      else if(routeState?.result){
        const route=routeState.result;
        const distance=Number.isFinite(route.distance)?`${Math.round(route.distance)} 米`:'距离未返回';
        const minutes=Number.isFinite(route.duration)?` · 约 ${Math.max(1,Math.round(route.duration))} 分钟`:'';
        html=`<p><strong>${esc(distance+minutes)}</strong></p><small>刚刚查询 · 腾讯位置服务 · ${routeState.drawn?'已绘制服务返回路线':'仅获得路线文字，未绘制轨迹'}</small>`;
        if(route.steps?.length)html+=`<details><summary>展开路线步骤</summary><ol>${route.steps.slice(0,40).map(step=>`<li>${esc(step.instruction||step.road_name||'按现场指引继续步行')}</li>`).join('')}</ol></details>`;
      }else if(routeState?.error)html=`<p>${esc(routeState.error)}</p>`;
      else if(origin?.id===destination.id)html='<p>起点和目的地相同，无需查询路线。</p>';
      else if(connectionState==='missing')html='<p>此预览没有接通地图服务，站内查路暂不可用；不是你选错了地点。</p>';
      else if(connectionState==='failed')html='<p>地图连接失败，站内查路暂不可用。可重试地图，或在腾讯地图中查询。</p>';
      else if(connectionState==='loading')html='<p>正在连接地图，连接成功后才能在这里查路。</p>';
      else html=`<p>${origin?'起点已选好，点击“查看步行路线”。':'选一个起点，看看怎么走。'}</p>`;
      if(sample&&!routeState?.result)html+=`<details><summary>历史参考（不是本次查询）</summary><small>查询留样 · ${sample.queriedAt}<br>${esc(origin.name)} → ${esc(destination.name)}：${sample.distance} 米，约 ${sample.minutes} 分钟${sample.road?'，途经'+esc(sample.road):''}。不是实时路线，未附路线轨迹。</small></details>`;
      return html;
    }
    // 只在重建前焦点确实位于目标块内时恢复；异步返回不抢外部焦点。
    function focusSnapshot(container){
      const focused=document.activeElement;if(!focused||!container.contains(focused))return null;
      const names=['data-cm-place','data-cm-other','data-cm-origin','data-cm-swap','data-cm-route','data-cm-external','data-cm-current','data-cm-route-output'];
      for(const name of names)if(focused.hasAttribute(name))return {name,value:focused.getAttribute(name)};
      return {name:'data-cm-route-output',value:''};
    }
    function restoreFocus(container,snapshot){
      if(!snapshot||!active())return;
      const control=Array.from(container.querySelectorAll('['+snapshot.name+']')).find(item=>item.getAttribute(snapshot.name)===snapshot.value&&!item.disabled);
      const fallback=container.matches('[data-cm-list]')?$('[data-cm-search]'):container.querySelector('[data-cm-route-output]');
      (control||fallback)?.focus({preventScroll:true});
    }
    function renderDetail(){
      const container=$('[data-cm-detail]'),focused=focusSnapshot(container);
      const destination=getPlace(selected),origin=getPlace(originId);if(!destination)return;
      const same=originId===selected,other=destination.focus?focusPlaces.find(place=>place.id!==selected):null;
      $('[data-cm-detail]').innerHTML=`<div class="cm-detail-top"><h3>${esc(destination.name)}</h3><span class="cm-tag">${esc(destination.focus?'双楼重点':destination.kind)}</span></div><p class="cm-detail-note">${esc(destination.note)}</p>${other?`<button type="button" class="cm-pair-start" data-cm-other="${other.id}">从${esc(other.name)}出发 →</button>`:''}<label class="cm-start">从哪里出发<select data-cm-origin aria-label="选择公开地点作为起点"><option value="">手动选一个起点</option>${places.map(place=>`<option value="${place.id}" ${originId===place.id?'selected':''}>${esc(place.name)}</option>`).join('')}</select></label>${origin&&!same?'<button type="button" class="cm-text cm-swap" data-cm-swap>交换起点与目的地 ⇄</button>':''}<div class="cm-route-actions"><button class="cm-primary primary" type="button" data-cm-route ${!originId||same||routeState?.pending?'disabled':''}>${routeState?.pending?'正在查询…':'查看步行路线'}</button><a class="cm-link" data-cm-external href="${esc(routeLink(destination,origin))}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">腾讯地图继续 ↗</a><a class="cm-link cm-location-link" data-cm-current href="${esc(routeLink(destination))}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">用手机当前位置出发 ↗</a></div><div class="cm-route-output" data-cm-route-output role="status" tabindex="-1" aria-label="步行路线状态" aria-busy="${!!routeState?.pending}">${routeHTML(destination,origin)}</div><p class="cm-unverified">入口与楼层未核实；本页不申请定位，当前位置由腾讯地图单独授权。</p>`;
      syncRouteButton();restoreFocus(container,focused);
    }
    function renderList(){
      const container=$('[data-cm-list]'),focused=focusSnapshot(container),results=catalog.search(query,category);
      $('[data-cm-count]').textContent=`${results.length} / ${places.length} 处`;
      $('[data-cm-list]').innerHTML=results.length?results.map(place=>`<button type="button" class="cm-place" data-cm-place="${place.id}" aria-pressed="${selected===place.id}"><span class="cm-place-number">${places.findIndex(item=>item.id===place.id)+1}</span><span class="cm-place-copy"><strong>${esc(place.name)}</strong><small>${esc(place.kind)}${place.focus?' · 双楼重点':''}</small></span><span class="cm-place-arrow" aria-hidden="true">›</span></button>`).join(''):'<p class="cm-empty">当前范围未找到。可切换“全部”或清空搜索，不猜测地点位置。</p>';
      root.querySelectorAll('[data-cm-quick]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cmPlace===selected)));
      markersUpdate();restoreFocus(container,focused);
    }
    function markersUpdate(){
      if(!map||!markers)return;
      const visible=catalog.search(query,category);
      // 当前目的地与已选起点不因搜索或范围切换消失，避免路线失去端点。
      const displayed=places.filter(place=>visible.some(item=>item.id===place.id)||place.id===selected||place.id===originId);
      markers.setGeometries(displayed.map(place=>({id:place.id,styleId:place.id+(place.id===selected?'-selected':''),position:new window.TMap.LatLng(place.lat,place.lng),properties:{title:place.name}})));
    }
    function selectPlace(id){
      const place=getPlace(id);if(!place)return;
      selected=id;hasSelected=true;clearRoute();renderList();renderDetail();focusPlace(place);
    }
    function selectOrigin(id){originId=getPlace(id)?.id||'';clearRoute();markersUpdate();renderDetail();}
    const onMap=(object,name,fn)=>{object.on(name,fn);events.push([object,name,fn]);};
    async function connect(){
      if(!active()||mapLoading)return;
      clearRoute();releaseMap();const token=session;mapLoading=true;connectionState='loading';renderDetail();
      $('[data-cm-retry]').hidden=false;$('[data-cm-retry]').disabled=true;
      $('[data-cm-fallback]').hidden=false;$('[data-cm-fallback-title]').textContent='正在展开校园';$('[data-cm-fallback-message]').textContent='地点列表可以先用，正在连接腾讯底图。';setStatus('正在连接腾讯底图');
      let stage='sdk';root.dataset.cmDiagnostic='sdk-loading';
      try{
        const TMap=await loadSDK();if(!active()||token!==session)return;
        stage='map-create';root.dataset.cmDiagnostic=stage;setStatus('地图组件已就绪 · 正在创建画面');
        const canvas=$('[data-cm-canvas]');canvas.id='campus-map-canvas-'+uid+'-'+token;
        const place=getPlace(selected);
        map=new TMap.Map(canvas.id,{center:new TMap.LatLng(place.lat,place.lng),zoom:hasSelected?17.8:17,viewMode:'3D',pitch:initialPitch,rotation:0,baseMap:{type:'vector',features:['base','building3d','building2d','point','label','arrow'],buildingRange:[15.5,20]}});
        stage='map-events';
        // 仅移除重复的镜头控件；保留腾讯比例尺、署名和审图号。
        map.removeControl(TMap.constants.DEFAULT_CONTROL_ID.ZOOM);
        map.removeControl(TMap.constants.DEFAULT_CONTROL_ID.ROTATION);
        tileTimer=later(()=>{if(active()&&token===session&&!mapReady){releaseMap();diagnose('tiles-timeout');}},16000);
        onMap(map,'tilesloaded',()=>{
          if(!active()||token!==session||mapReady)return;
          if(tileTimer!==null){cancelTimer(tileTimer);tileTimer=null;}
          try{
            // 首批瓦片完成后再适配双楼；构造器返回时的视野尚未稳定。
            // 先设一次性标志，避免适配触发后续瓦片事件时反复复位。
            mapReady=true;if(!hasSelected)overview();
            mapLoading=false;connectionState='ready';root.dataset.cmDiagnostic='ready';
            $('[data-cm-fallback]').hidden=true;setStatus('腾讯地图 · 瑶湖双楼');renderDetail();cameraControls().forEach(button=>button.disabled=false);orbit();
          }catch{releaseMap();diagnose('map-view');}
        });
        onMap(map,'rotate',orbit);onMap(map,'pitch',orbit);
        // SDK自行适配画布；resize不再fitBounds，保持用户中心、缩放、方向与倾角。
        onMap(map,'resize',orbit);
        onMap(map,'context_lost',()=>{if(!active()||token!==session)return;clearRoute();releaseMap();diagnose('context-lost');});
        stage='map-markers';const styles={};
        places.forEach((item,index)=>{for(const isSelected of [false,true])styles[item.id+(isSelected?'-selected':'')]=new TMap.MarkerStyle({width:32,height:41,anchor:{x:16,y:40},src:pin(index+1,isSelected)});});
        markers=new TMap.MultiMarker({map,styles,geometries:[]});
        onMap(markers,'click',event=>{if(active()&&event.geometry?.id)selectPlace(event.geometry.id);});
        markersUpdate();orbit();root.dataset.cmDiagnostic='tiles-loading';setStatus('地图组件已连接 · 正在等待底图');
      }catch(error){
        if(!active()||token!==session)return;releaseMap();
        if(stage==='sdk'&&error?.campusMapCode==='proxy-unavailable'){
          root.dataset.cmDiagnostic='proxy-unavailable';const ownServer=window.CampusMapRuntime?.mode==='project-proxy';
          fallback(ownServer?'地图服务尚未配置':'此预览未接通地图',ownServer?'站内服务已启动，但服务器尚未安全配置地图凭据。地点可查，底图和步行查路暂不可用；更换起点或反复刷新不能补上配置。':'此预览没有取得地图连接配置。地点可查，但站内查路不可用；反复重试或更换起点不能补上配置。','missing');
        }else diagnose(stage==='sdk'?(Object.prototype.hasOwnProperty.call(failures,error?.campusMapCode)?error.campusMapCode:'sdk-incomplete'):stage);
      }
    }
    async function route(){
      const origin=getPlace(originId),destination=getPlace(selected);if(!origin||!destination||origin.id===destination.id)return;
      clearRoute();const token=request;if(!mapReady){renderDetail();return;}
      routeState={pending:true};renderDetail();let timer;
      try{
        const TMap=window.TMap;
        const response=await Promise.race([new TMap.service.Walking().search({from:new TMap.LatLng(origin.lat,origin.lng),to:new TMap.LatLng(destination.lat,destination.lng)}),new Promise((_,reject)=>{routeAbort=()=>reject(diagnosticError('route-cancelled'));timer=later(()=>reject(diagnosticError('route-timeout')),12000);})]);
        if(token===request)routeAbort=null;cancelTimer(timer);if(!active()||token!==request)return;
        if(response?.status!==undefined&&response.status!==0)throw response;
        const result=response?.result?.routes?.[0];if(!result)throw diagnosticError('route-unavailable');
        if(!Number.isFinite(result.distance)||result.distance<0)throw diagnosticError('route-format');
        const points=routePoints(result.polyline,TMap);let drawn=false;
        if(points.length){try{routeLayer=new TMap.MultiPolyline({map,styles:{walking:new TMap.PolylineStyle({color:'#386958',width:7,borderWidth:2,borderColor:'#ffffff',lineCap:'round'})},geometries:[{id:'walking-route',styleId:'walking',paths:points}]});drawn=true;}catch{if(routeLayer)routeLayer.setMap(null);routeLayer=null;}}
        routeState={result,drawn};
        if(drawn)fitPoints([...points,new TMap.LatLng(origin.lat,origin.lng),new TMap.LatLng(destination.lat,destination.lng)]);
        setStatus(drawn?'腾讯地图 · 已绘制步行路线':'腾讯地图 · 路线文字已返回');
      }catch(error){
        if(active()&&token===request){const failure=routeFailure(error);routeState={error:failure.error};root.dataset.cmRouteDiagnostic=failure.diagnostic;setStatus('腾讯地图 · 步行查询失败 · '+failure.diagnostic);}
      }finally{
        if(timer)cancelTimer(timer);if(token===request)routeAbort=null;if(active()&&token===request)renderDetail();
      }
    }
    root.addEventListener('input',event=>{if(event.target.matches('[data-cm-search]')){query=event.target.value;renderList();}},{signal:listen.signal});
    root.addEventListener('change',event=>{if(event.target.matches('[data-cm-origin]')){selectOrigin(event.target.value);$('[data-cm-origin]').focus({preventScroll:true});}},{signal:listen.signal});
    root.addEventListener('pointerdown',event=>{
      const button=event.target.closest('[data-cm-north]');
      if(!button||!root.contains(button)||!mapReady||(event.button!==undefined&&event.button!==0)||event.isPrimary===false)return;
      suppressClick=false;drag={id:event.pointerId,x:event.clientX,y:event.clientY,rotation:map.getRotation(),pitch:map.getPitch(),moved:false,button};
      button.setPointerCapture?.(event.pointerId);
    },{signal:listen.signal});
    root.addEventListener('pointermove',event=>{
      if(!drag||drag.id!==event.pointerId||!mapReady)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.moved&&Math.hypot(dx,dy)<4)return;
      drag.moved=true;event.preventDefault();setCamera(drag.rotation+dx*.7,drag.pitch-dy*.5);
    },{signal:listen.signal});
    const stopDrag=event=>{
      if(!drag||drag.id!==event.pointerId)return;
      const previous=drag;drag=null;suppressClick=event.type==='pointerup'&&previous.moved;
      if(previous.button.hasPointerCapture?.(event.pointerId))previous.button.releasePointerCapture(event.pointerId);
    };
    root.addEventListener('pointerup',stopDrag,{signal:listen.signal});
    root.addEventListener('pointercancel',stopDrag,{signal:listen.signal});
    root.addEventListener('lostpointercapture',stopDrag,{signal:listen.signal});
    root.addEventListener('keydown',event=>{
      if(!event.target.closest('[data-cm-north]')||!mapReady)return;
      const rotation=map.getRotation(),pitch=map.getPitch();
      const actions={ArrowLeft:()=>setCamera(rotation-15,pitch),ArrowRight:()=>setCamera(rotation+15,pitch),ArrowUp:()=>setCamera(rotation,pitch+10),ArrowDown:()=>setCamera(rotation,pitch-10),Home:()=>setCamera(0,pitch)};
      if(actions[event.key]){event.preventDefault();suppressClick=false;actions[event.key]();}
    },{signal:listen.signal});
    root.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button||!root.contains(button)||button.disabled)return;
      if(button.hasAttribute('data-cm-back')){options.onBack?.();return;}
      if(button.dataset.cmPlace){selectPlace(button.dataset.cmPlace);return;}
      if(button.dataset.cmFilter){category=button.dataset.cmFilter==='focus'?'focus':'all';root.querySelectorAll('[data-cm-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.cmFilter===category)));renderList();return;}
      if(button.dataset.cmOther){selectOrigin(button.dataset.cmOther);return;}
      if(button.hasAttribute('data-cm-swap')){const previous=selected,origin=getPlace(originId);if(origin&&origin.id!==selected){selected=origin.id;originId=previous;hasSelected=true;clearRoute();renderList();renderDetail();focusPlace(origin);}return;}
      if(button.hasAttribute('data-cm-route')){route();return;}
      if(button.hasAttribute('data-cm-retry')){connect();return;}
      if(!mapReady||!map)return;
      if(button.hasAttribute('data-cm-north')){if(suppressClick&&event.detail!==0){suppressClick=false;return;}suppressClick=false;setCamera(0,map.getPitch());return;}
      if(button.dataset.cmView){setCamera(map.getRotation(),button.dataset.cmView==='overhead'?0:initialPitch);return;}
      if(button.dataset.cmZoom){map.setZoom(Math.max(14.5,Math.min(20,map.getZoom()+Number(button.dataset.cmZoom))));return;}
      if(button.hasAttribute('data-cm-reset'))overview();
    },{signal:listen.signal});
    renderList();renderDetail();orbit();connect();
    return function dispose(){if(disposed)return;disposed=true;listen.abort();clearRoute();releaseMap();for(const timer of timers)clearTimeout(timer);timers.clear();};
  }
  window.CampusMap=Object.freeze({shell,mount});
})();
