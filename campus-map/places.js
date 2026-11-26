/* SPDX-License-Identifier: AGPL-3.0-or-later
 * 瑶湖首期公共地点索引；不含课程、宿舍身份或用户定位。
 * 坐标来自腾讯地点服务公开POI，GCJ-02；首次核对2026-11-20，双楼复核2026-11-24。
 * POI不等于入口；名称简称仅用于文本匹配，不推断楼层和教室。
 */
(function () {
  'use strict';
  const places = [
    {id:'weiyi',name:'惟义楼',aliases:['惟义楼','惟义'],kind:'教学楼',focus:true,verifiedAt:'2026-11-24',lat:28.679229,lng:116.029736,poi:'10339621805967011973',note:'先找到建筑，再按现场楼牌确认单元与教室。'},
    {id:'shiyan',name:'实验大楼',aliases:['实验大楼'],kind:'实验教学',focus:true,verifiedAt:'2026-11-24',lat:28.676099,lng:116.028059,poi:'13582933300586266255',note:'按课程通知确认实验室与出入口；这里不提供进入权限判断。'},
    {id:'library',name:'图书馆',aliases:['图书馆'],kind:'学习场所',focus:false,lat:28.681352,lng:116.031997,poi:'7228788782932196724',note:'开放时间、入馆及预约规则，以图书馆官方通知为准。'},
    {id:'qinglan',name:'青蓝门',aliases:['青蓝门'],kind:'校门',focus:false,lat:28.674757,lng:116.026768,poi:'9916511586362235589',note:'这是公开校门地点；实时开放与访客通行请在现场确认。'},
    {id:'xiansu',name:'先骕楼',aliases:['先骕楼','先骕'],kind:'校园建筑',focus:false,lat:28.679669,lng:116.034344,poi:'7170322059863642371',note:'此处先提供建筑定位，不推断学院、楼层或具体办公室。'}
  ];
  const normalize = text => String(text || '').toLowerCase().replace(/[\s·•、，,（）()\-]/g,'');
  function match(text) {
    const q=normalize(text);
    if(!q)return null;
    return places.find(place=>place.aliases.some(alias=>q.includes(normalize(alias))))||null;
  }
  function search(text, category='all') {
    const q=normalize(text);
    return places.filter(place=>(category!=='focus'||place.focus)&&(!q||[place.name,place.kind,...place.aliases].some(value=>normalize(value).includes(q))||place.aliases.some(alias=>q.includes(normalize(alias)))));
  }
  window.CampusPlaces=Object.freeze({
    places:Object.freeze(places.map(place=>Object.freeze({...place,aliases:Object.freeze(place.aliases)}))),
    center:Object.freeze({lat:28.6783,lng:116.0304}),
    coordinateSystem:'GCJ-02',verifiedAt:'2026-11-20',
    source:'腾讯位置服务公开地点信息',
    officialMap:'https://www.jxnu.edu.cn/2025/0929/c13362a281344/page.htm',
    // 留存的查询样本只供核对与阅读；没有路线几何，不绘制为导航路线。
    referenceRoutes:Object.freeze([
      Object.freeze({from:'weiyi',to:'shiyan',distance:442,minutes:7,road:'中环西大道',queriedAt:'2026-11-24'}),
      Object.freeze({from:'qinglan',to:'weiyi',distance:756,minutes:11,road:'',queriedAt:'2026-11-20'}),
      Object.freeze({from:'weiyi',to:'library',distance:316,minutes:5,road:'',queriedAt:'2026-11-20'})
    ]),
    match,search
  });
})();
