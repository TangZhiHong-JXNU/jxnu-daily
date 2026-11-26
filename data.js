// SPDX-License-Identifier: AGPL-3.0-or-later
// 从零构造的公开空白种子；不读取、不复制个人课表或浏览器存档。
// 学期日期和作息仅用于首次运行，使用前请在界面中按实际情况设置。
window.CAMPUS_DATA = {
  campus: {
    config: {
      name: '师大 · 日常',
      version: '0.2.7-source.20261126',
      storageKey: 'jxnu-daily.public-source.v1.state',
      periodKey: 'jxnu-daily.public-source.v1.period',
      weatherKey: 'jxnu-daily.public-source.v1.weather',
      periods: [
        {id:'dawn',label:'清晨',hour:7,start:5,end:10,greeting:'晨光翻过书页，从容开始今天。'},
        {id:'noon',label:'中午',hour:12,start:10,end:14,greeting:'看清今天的安排，也留一点空白。'},
        {id:'afternoon',label:'下午',hour:15,start:14,end:17,greeting:'给眼前这一件事，留一段专注。'},
        {id:'dusk',label:'傍晚',hour:18,start:17,end:19,greeting:'收好课本，让晚风接住日常。'},
        {id:'evening',label:'晚上',hour:21,start:19,end:23,greeting:'晚自习的灯亮着，按自己的节奏走。'},
        {id:'midnight',label:'深夜',hour:1,start:23,end:5,greeting:'翻过今天这一页，明天再继续。'}
      ],
      slots: [
        {label:'上午一（示例）',start:'08:00',end:'09:35'},
        {label:'上午二（示例）',start:'10:00',end:'11:35'},
        {label:'下午一（示例）',start:'14:00',end:'15:35'},
        {label:'下午二（示例）',start:'15:50',end:'17:25'},
        {label:'晚间（示例）',start:'19:00',end:'21:20'}
      ],
      schoolCalendar: {
        title:'空白示例学期（请自行设置）',
        termStart:'2026-09-07',
        termEnd:'2027-01-31',
        firstMonth:'2026-09',
        lastMonth:'2027-01',
        source:'源码首次运行示例，不是学校官方校历',
        events:[],
        notes:['使用前请设置实际第一教学周的星期一；这里没有预设节假日、考试或补课。']
      },
      weatherLocation: {label:'瑶湖公开区域参考（非定位、非实测）',latitude:28.6783,longitude:116.0304}
    }
  },
  rooms: [],
  occupancy: [],
  classes: [],
  tasks: [],
  weather: {temperature:22,code:0,mode:'demo'},
  lost_items: [],
  market_items: [],
  campus_jobs: [],
  electricitySnapshot: null
};
