/* 云备份只处理显式选择的课程、待办与学期基准，不接管本地工具。 */
(() => {
  'use strict';
  window.CampusCloudSync = { attach(bridge) {
    // 公开副本不连接原作者的云资源；下面的实验实现暂不开放。
    const publicConfig = {resourceId:'YOUR_RESOURCE_ID',endpoint:'https://example.invalid',oauthRelayBaseUrl:'https://example.invalid/oauth',publishableKey:'YOUR_PUBLISHABLE_KEY'};
    const cloudEnabled = false;
    if (!cloudEnabled) {
      const paint = () => {
        const el = document.getElementById('cloud-account');
        if (el) el.innerHTML = '<h2>我的账号与云备份</h2><p>本源码版未启用云同步，不连接原作者的云服务，也不读取登录会话。本地课表、待办和专注可直接使用。</p><p class="subtle">请通过“数据管理”手动导出 JSON 备份。实验云代码尚未完成恢复可靠性与权限验收，不要仅填写占位配置就启用。</p>';
      };
      return {paint, ready:Promise.resolve(), enabled:false};
    }
    let cloud, user = null, generation = 0, busy = false, pending = null, resendAt = 0;
    let status = '正在读取登录会话…', version = null, linked = false;
    const uid = s => s?.user?.id || s?.user?.uid || null;
    const unwrap = r => { if (r.error) throw r.error; return r.data; };
    function accept(session) {
      const next = uid(session);
      if (next !== user) {
        generation++; user = next; version = null; linked = false; pending = null;
        status = user ? '账号已变化，请明确选择上传本地或载入云端；本机数据未自动上传。' : '已退出或会话失效，本机数据保留。';
        paint();
      }
    }
    function explain(e) {
      const kind = e?.kind, code = String(e?.code || ''), http = e?.status || e?.statusCode;
      if (kind === 'unauthenticated' || kind === 'invalid_grant' || http === 401) return '登录已失效，请重新登录；本机数据未删除。';
      if (kind === 'network' || kind === 'backend-unavailable' || e instanceof TypeError) return '网络或云服务暂不可用，请检查网络后手动重试；不自动覆盖数据。';
      if (code === '42501' || http === 403) return '没有云数据访问权限，请管理员检查账号、RLS 与登录开关。';
      if (http === 429 || /quota|credits|limit/i.test(code)) return '请求过于频繁或云服务额度不足，请稍后重试或检查额度。';
      if (e?.localMessage) return e.localMessage;
      return '云操作失败，请检查网络、验证码、登录方式开关及服务额度。登录开关需在云服务管理页开启。';
    }
    const fail = text => { throw {localMessage:text}; };
    function paint() {
      const el = document.getElementById('cloud-account'); if (!el) return;
      el.innerHTML = `<h2>我的账号与云备份</h2><p role="note"><strong>共享浏览器警告：</strong>本机记录不随云账号切换隔离，退出账号也不会清除本机记录；上传前请核对本机数据归属及当前账号，避免将他人记录上传到自己的账号。</p><p>${user ? '已登录真实云账号（与本机昵称独立）' : '未登录 / 可选登录，不影响本地工具'}</p><p class="subtle">非学校认证，不需要学校密码。仅备份课程、待办和学期开始日期；不上传计时器、电费、二维码、头像或其他本机资料。当前为手动云备份/恢复，不是自动同步。</p><p class="subtle">手机号与微信登录开关状态尚未由管理工具核实，需管理员在云服务管理页开启对应 switch；微信授权须在正式 HTTPS 域名验证。</p>${user ? `<p>${linked ? '已选择本账号的数据方向' : '首次连接或重新登录：请明确选择“上传本地”或“载入云端”，不会自动上传。切换账号后本机仍保留原数据，请勿误传。'}</p><div class="toolbar"><button data-cloud="upload">${linked?'云备份':'上传本地'}</button><button data-cloud="restore">${linked?'云恢复':'载入云端'}</button><button data-cloud="logout">退出账号</button></div>` : `<div class="toolbar"><label>手机号<input id="cloud-phone" inputmode="numeric" autocomplete="tel" maxlength="11" aria-describedby="cloud-phone-error"></label><button data-cloud="send">获取验证码</button><label>验证码<input id="cloud-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="12"></label><button data-cloud="verify">验证码登录 / 注册</button><button data-cloud="wechat">微信登录（快捷 / 扫码）</button></div><p id="cloud-phone-error" role="alert"></p>`}<p id="cloud-status" role="status" aria-live="polite"></p>`;
      el.querySelector('#cloud-status').textContent = status;
      el.querySelectorAll('button').forEach(b => b.disabled = busy || !cloud);
    }
    function message(text) { status = text; const el=document.getElementById('cloud-status'); if(el)el.textContent=text; }
    async function gate(g) {
      const session = unwrap(await cloud.auth.getSession());
      if (g !== generation) fail('账号已变化，本次操作已取消，请重新选择数据方向。');
      if (!uid(session) || uid(session) !== user) { accept(session); fail('会话已变化，请重新登录并选择数据方向。'); }
    }
    async function row(g) {
      await gate(g);
      const data = unwrap(await cloud.database.from('campus_sync_documents').select('payload,version,updated_at').maybeSingle());
      await gate(g);
      if(data && (!Number.isSafeInteger(data.version) || data.version < 1)) fail('云版本无效，未覆盖任何数据。');
      return data;
    }
    async function transfer(action, g) {
      if (bridge.protected()) fail('原本机存档损坏或不可写，已禁止云上传/恢复；请先在数据管理导出原始存档并解决存储问题。');
      const before = bridge.fingerprint();
      const remote = await row(g);
      if (bridge.fingerprint() !== before) fail('读取云端期间本机课程或待办已编辑，请重新操作。');
      if (action === 'upload') {
        const payload = bridge.validate(bridge.payload());
        if (version !== null && (remote?.version || 0) !== version) {
          version = null; linked = false;
          fail('发现另一设备更新：本次没有上传。请先载入云端，或再次明确选择上传本地覆盖最新云版本。');
        }
        if (!confirm(remote ? '上传将替换当前账号的云端课程、待办及学期基准。确认将当前本机数据上传到此账号？' : '确认把当前本机课程、待办及学期基准首次上传到此账号？切换账号不会自动隔离本机记录，请核对。')) return;
        await gate(g);
        if (bridge.fingerprint() !== before) fail('本机已编辑，上传取消，请重试。');
        const expected = remote?.version || 0;
        const result = unwrap(await cloud.database.rpc('campus_sync_cas', {expected_version:expected,document:payload}));
        await gate(g);
        if (!result || result.conflict || result.version !== expected + 1) { version=null; linked=false; fail('云端版本冲突，未执行覆盖。请重新载入并选择方向。'); }
        version=result.version; linked=true;
        message(bridge.fingerprint() === before ? '云备份成功；本机后续修改需再次点击云备份。' : '该次快照已备份；上传期间的新编辑仍在本机，尚未上传。');
      } else {
        if (!remote) fail('当前账号还没有云备份，请选择上传本地。');
        const payload = bridge.validate(remote.payload);
        if (!confirm('恢复将覆盖本机课程、待办和学期基准，其他本机资料不变。下一步先下载本机完整备份，确认继续？')) return;
        bridge.backup();
        if (!confirm('已触发本机备份下载。请确认备份文件已保存并可用，再确定覆盖；取消则不更改。')) return;
        await gate(g);
        if (bridge.fingerprint() !== before) fail('备份期间本机课程或待办发生编辑，恢复已取消。');
        bridge.apply(payload); version=remote.version; linked=true;
        message('云恢复完成；仅课程、待办与学期基准被替换。');
      }
    }
    document.addEventListener('input', e => { if(e.target.id==='cloud-phone') {pending=null;const el=document.getElementById('cloud-phone-error');if(el)el.textContent='';} });
    document.addEventListener('click', async e => {
      const button=e.target.closest('[data-cloud]'); if(!button || busy || !cloud)return;
      const action=button.dataset.cloud, g=generation;
      const phone=document.getElementById('cloud-phone')?.value.trim(), token=document.getElementById('cloud-otp')?.value.trim();
      if(action==='send' && !/^1\d{10}$/.test(phone)) {document.getElementById('cloud-phone-error').textContent='请输入正确的 11 位手机号';return;}
      busy=true;
      document.querySelectorAll('#cloud-account button').forEach(b=>b.disabled=true);
      try {
        if(action==='send') {
          if(Date.now()<resendAt)fail('请等待 60 秒后再获取验证码。');
          const data=unwrap(await cloud.auth.sendOtp({phone}));
          if(g!==generation)return;
          if(document.getElementById('cloud-phone')?.value.trim()!==phone)fail('手机号已修改，请为当前手机号重新获取验证码。');
          pending={phone,verificationId:data.verificationId,isExistingUser:data.isExistingUser};resendAt=Date.now()+60000;message('验证码已发送，请输入后登录；60 秒内请勿重复发送。');
        } else if(action==='verify') {
          if(!pending || pending.phone!==phone)fail('请先为当前手机号获取验证码。');
          if(!token)fail('请输入收到的验证码。');
          const session=unwrap(await cloud.auth.verifyOtp({...pending,token}));
          if(!uid(session))fail('未获得真实登录会话，请重新登录。');
          accept(session);pending=null;message('登录成功，请明确选择上传本地或载入云端。');paint();
        } else if(action==='wechat') {
          const data=unwrap(await cloud.auth.signInWithOAuth({provider:'wechat',redirectTo:publicConfig.endpoint+'/'}));
          if(g===generation)location.assign(data.url);
        } else if(action==='logout') {
          unwrap(await cloud.auth.signOut());accept(null);message('已退出；本机数据保留，不会自动上传至其他账号。');paint();
        } else await transfer(action,g);
      } catch(error) { if(g===generation || action==='verify' || action==='logout') message(explain(error)); }
      finally {busy=false;if(action==='upload'||action==='restore')paint();document.querySelectorAll('#cloud-account button').forEach(b=>b.disabled=!cloud);}
    });
    const ready=(async()=>{
      try {
        if(!window.WorkBuddyCloud)fail('云 SDK 未加载，请检查网络并刷新；本地工具仍可使用。');
        cloud=WorkBuddyCloud.createWorkBuddyCloud({endpoint:publicConfig.endpoint,oauthRelayBaseUrl:publicConfig.oauthRelayBaseUrl,publishableKey:publicConfig.publishableKey});
        cloud.auth.onAuthStateChange((_event,session)=>accept(session));
        const url=new URL(location.href);
        if(url.searchParams.has('code') || url.searchParams.has('error')) {
          if(url.searchParams.get('provider')!=='wechat')fail('授权回调方式无效，请重新发起微信登录。');
          if(typeof cloud.auth.handleWechatWebCallback!=='function')fail('云 SDK 缺少微信回调能力，请联系管理员。');
          const session=unwrap(await cloud.auth.handleWechatWebCallback());
          if(!uid(session))fail('授权未产生真实会话，请重新登录。');
          for(const key of ['code','state','provider','error','error_description'])url.searchParams.delete(key);
          history.replaceState(null,'',url.pathname+url.search+url.hash);
          accept(session);
        } else accept(unwrap(await cloud.auth.getSession()));
        message(user?'会话已恢复，请明确选择数据方向。':'可选登录后使用手动云备份。');
      } catch(e) {message(explain(e));}
      paint();
    })();
    return {paint,ready};
  }};
})();
