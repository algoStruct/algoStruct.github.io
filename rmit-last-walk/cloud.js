(() => {
'use strict';
const STORE='rmit-last-walk-2026-v1';
const REPO_KEY='rmit-last-walk-github-repo';
const TOKEN_KEY='rmit-last-walk-gh-session';
const LAST_KEY='rmit-last-walk-last-cloud-sync';
const FILE='.rmit-last-walk/progress.json';
let busy=false,debounce;
const c=document.createElement('style');
c.textContent='.cloud-fab{position:fixed;right:14px;bottom:86px;z-index:90;border:0;border-radius:99px;background:#244b39;color:#fff;box-shadow:0 5px 22px #14271942;font-size:12px;font-weight:800;padding:12px 15px;cursor:pointer}.cloud-backdrop{position:fixed;inset:0;background:#0a1b13a8;z-index:200;display:none;place-items:end center;padding:8px}.cloud-backdrop.open{display:grid}.cloud-panel{background:#fffefa;border-radius:22px 22px 15px 15px;max-width:540px;width:100%;max-height:min(92dvh,820px);overflow-y:auto;padding:20px;box-shadow:0 12px 30px #1115}.cloud-panel h2{font-size:21px;line-height:1.2;margin:0 0 8px}.cloud-panel p{font-size:12px;color:#586960;line-height:1.65;margin:9px 0}.cloud-panel label{display:block;font-size:12px;font-weight:750;margin-top:13px}.cloud-panel input{display:block;width:100%;background:#fff;border:1px solid #bacbbd;padding:12px;border-radius:11px;font-size:14px;margin-top:5px;min-height:44px}.cloud-actions{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 8px}.cloud-actions button{border:1px solid #cbd9ce;border-radius:10px;background:#fff;padding:11px 13px;font-size:13px;font-weight:800;min-height:43px}.cloud-actions button.primary{background:#244b39;color:#fff;border-color:#244b39}.cloud-actions button:disabled{opacity:.5}.cloud-help{font-size:11px!important}.cloud-status{border-radius:10px;background:#edf5eb;padding:10px 12px;min-height:39px;font-size:12px;white-space:pre-wrap}.cloud-close{float:right;border:0;background:#e9eee9;border-radius:100px;width:36px;height:36px;font-size:20px}.cloud-tip{padding:11px 12px;background:#f5f2e7;border-radius:11px;border:1px solid #eae2c5;font-size:12px;line-height:1.65}.cloud-tip a{color:#265d43;text-decoration:underline}.cloud-note{font-size:11px!important;color:#7f564e!important}.cloud-badge{font-size:10px;background:#fff1d1;border-radius:7px;padding:5px 7px;display:inline-block}@media(min-width:650px){.cloud-backdrop{place-items:center}}';
document.head.appendChild(c);
const fab=document.createElement('button');fab.className='cloud-fab';fab.type='button';fab.textContent='☁ 云同步';fab.setAttribute('aria-label','GitHub 私有云同步');document.body.appendChild(fab);
const backdrop=document.createElement('div');backdrop.className='cloud-backdrop';backdrop.setAttribute('role','dialog');backdrop.setAttribute('aria-modal','true');backdrop.setAttribute('aria-label','云同步设置');
backdrop.innerHTML='<section class="cloud-panel"><button type="button" class="cloud-close" aria-label="关闭">×</button><span class="cloud-badge">跨手机 / 电脑</span><h2>☁ 私有云同步</h2><p>把打卡、收藏、备注同步到<strong>你自己 GitHub 的私有仓库</strong>。这是 GitHub API 的真正云端数据，不是浏览器本地缓存。</p><div class="cloud-tip">首次准备：① 在 GitHub 建一个<strong> Private 仓库</strong>（或选择自己的现有私有仓库）。② 打开 <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Fine-grained token 创建页 ↗</a>，只授权该仓库的 <strong>Contents: Read and write</strong>。③ 把仓库名和令牌填在下方。另一台设备同样填写即可合并进度。</div><label for="cloudRepo">私有仓库（GitHub 用户名/仓库名）</label><input id="cloudRepo" placeholder="myname/my-private-repo" autocapitalize="none" autocomplete="off"/><label for="cloudToken">Fine-grained Personal Access Token</label><input id="cloudToken" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…（只保存在当前浏览器会话）"/><p class="cloud-note">⚠ 不要把令牌发送给任何人，也不要使用公开仓库储存进度。令牌只在本设备的本次浏览器会话保留；关闭后可能需要重新输入。</p><div class="cloud-actions"><button type="button" class="primary" id="cloudNow">连接并立即同步</button><button type="button" id="cloudLogout">本设备断开授权</button></div><div class="cloud-status" id="cloudStatus" aria-live="polite">当前：尚未连接云端。离线打卡仍会保存到本机。</div><p class="cloud-help">成功连接后会在你打卡、收藏或写备注时自动同步（需要网络）。每次同步前会先合并其他设备的数据，再保存；同一地点发生冲突时，以最后修改的版本为准。<br>建议继续使用工具页的 JSON 导出功能作额外备份。</p></section>';
document.body.appendChild(backdrop);
const repoEl=backdrop.querySelector('#cloudRepo'),tokEl=backdrop.querySelector('#cloudToken'),statusEl=backdrop.querySelector('#cloudStatus'),syncEl=backdrop.querySelector('#cloudNow');
function safeRead(key,store=localStorage){try{return store.getItem(key)||''}catch{return ''}}
repoEl.value=safeRead(REPO_KEY);
tokEl.value=safeRead(TOKEN_KEY,sessionStorage);
function connected(){return !!(safeRead(REPO_KEY)&&safeRead(TOKEN_KEY,sessionStorage))}
function refresh(){fab.textContent=connected()?'☁ 已连接':'☁ 云同步';const last=safeRead(LAST_KEY);if(last&&!busy)statusEl.textContent='上次成功同步：'+new Date(Number(last)).toLocaleString()+'。'+(connected()?' 自动同步已启用。':' 此会话未授权。')}
function show(msg,bad){statusEl.textContent=msg;statusEl.style.background=bad?'#fcebe6':'#edf5eb'}
function open(){backdrop.classList.add('open');repoEl.value=safeRead(REPO_KEY);tokEl.value=safeRead(TOKEN_KEY,sessionStorage);refresh();repoEl.focus()}
function close(){backdrop.classList.remove('open')}
fab.addEventListener('click',open);backdrop.querySelector('.cloud-close').addEventListener('click',close);backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
backdrop.querySelector('#cloudLogout').addEventListener('click',()=>{sessionStorage.removeItem(TOKEN_KEY);tokEl.value='';refresh();show('已从此浏览器会话断开 GitHub 授权。已有本地打卡数据不会删除。')});
function loadLocal(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}}
const normal=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
function uploadPayload(s){return {items:normal(s.items),notes:normal(s.notes),noteTimes:normal(s.noteTimes),dayTimes:normal(s.dayTimes),date1:s.date1||'',date2:s.date2||''}}
function merge(local,remote){
  const l=uploadPayload(local),r=uploadPayload(remote),out={...local,items:{},notes:{},noteTimes:{},dayTimes:{}};
  for(const id of new Set([...Object.keys(l.items),...Object.keys(r.items)])){
    const a=l.items[id],b=r.items[id];const ta=Number(a?.modifiedAt||0),tb=Number(b?.modifiedAt||0);
    out.items[id]=(a&&(!b||ta>=tb))?a:b;
  }
  for(const id of new Set([...Object.keys(l.notes),...Object.keys(r.notes)])){
    const ta=Number(l.noteTimes[id]||0),tb=Number(r.noteTimes[id]||0);
    if(Object.hasOwn(l.notes,id)&&(!Object.hasOwn(r.notes,id)||ta>=tb)){out.notes[id]=l.notes[id];out.noteTimes[id]=ta}
    else{out.notes[id]=r.notes[id];out.noteTimes[id]=tb}
  }
  for(const day of [1,2]){
    const a=Number(l.dayTimes[day]||0),b=Number(r.dayTimes[day]||0);
    if(l['date'+day]&&(!r['date'+day]||a>=b)){out['date'+day]=l['date'+day];out.dayTimes[day]=a}
    else{out['date'+day]=r['date'+day]||'';out.dayTimes[day]=b}
  }
  return out;
}
function parseContent(x){if(!x?.content)return null;const b64=x.content.replace(/\s/g,'');const data=Uint8Array.from(atob(b64),ch=>ch.charCodeAt(0));return JSON.parse(new TextDecoder().decode(data))}
function toBase64(s){const data=new TextEncoder().encode(s);let bin='';for(let i=0;i<data.length;i+=8192)bin+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(bin)}
async function gh(path,opts={}){
 const token=safeRead(TOKEN_KEY,sessionStorage);if(!token)throw Error('请先填写 GitHub token。');
 const response=await fetch('https://api.github.com'+path,{...opts,headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...(opts.body?{'Content-Type':'application/json'}:{})}});
 if(response.status===404)return {missing:true};
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error('GitHub '+response.status+'：'+String(data.message||'请求失败'));
 return data;
}
async function syncNow(auto=false){
 if(busy)return;
 const repo=auto?safeRead(REPO_KEY):repoEl.value.trim();
 const token=auto?safeRead(TOKEN_KEY,sessionStorage):tokEl.value.trim()||safeRead(TOKEN_KEY,sessionStorage);
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)){if(!auto)show('请填写正确格式的私有仓库名，例如 myname/myrepo。',true);return}
 if(!token){if(!auto)show('请填写 GitHub 的 Fine-grained PAT。',true);return}
 if(!auto){localStorage.setItem(REPO_KEY,repo);sessionStorage.setItem(TOKEN_KEY,token)}
 busy=true;syncEl.disabled=true;if(!auto)show('正在检查私有仓库并合并数据…');
 let updated=false;
 try{
  const meta=await gh('/repos/'+repo);
  if(meta.missing)throw Error('仓库不存在，或这个 token 无权访问。');
  if(!meta.private)throw Error('出于隐私保护，只允许同步到 GitHub 私有仓库。');
  const path='/repos/'+repo+'/contents/'+FILE;
  let success=false;
  for(let attempt=0;attempt<3;attempt++){
    const remoteFile=await gh(path);
    const local=loadLocal();
    const cloud=remoteFile.missing?null:parseContent(remoteFile);
    if(cloud && (cloud.app!=='RMIT Last Walk'||!cloud.saved))throw Error('远程文件格式不符合 RMIT Last Walk。');
    const joined=merge(local,cloud?.saved||{});
    const content=JSON.stringify({app:'RMIT Last Walk',version:2,saved:uploadPayload(joined),syncedAt:new Date().toISOString()});
    const body={message:'Sync RMIT Last Walk exploration progress',content:toBase64(content)};
    if(!remoteFile.missing)body.sha=remoteFile.sha;
    try{await gh(path,{method:'PUT',body:JSON.stringify(body)});success=true;
        updated=JSON.stringify(uploadPayload(local))!==JSON.stringify(uploadPayload(joined));
        localStorage.setItem(STORE,JSON.stringify(joined));break
    }catch(e){if((String(e).includes('409')||String(e).includes('422'))&&attempt<2)continue;throw e}
  }
  if(!success)throw Error('多次重试后仍有同步冲突。');
  localStorage.setItem(LAST_KEY,String(Date.now()));
  show('✓ 云同步成功！数据已保存到 '+repo+' 的私有文件。之后修改会自动同步。');
  refresh();
  if(updated){show('✓ 已合并另一台设备的进度，正在刷新显示。');setTimeout(()=>location.reload(),450)}
 }catch(e){if(!auto)show('同步失败：'+e.message,true);else{fab.textContent='☁ 同步受阻';fab.title=e.message}}
 finally{busy=false;syncEl.disabled=false}
}
syncEl.addEventListener('click',()=>syncNow(false));
window.addEventListener('rmit-saved',()=>{if(!connected()||busy)return;clearTimeout(debounce);debounce=setTimeout(()=>syncNow(true),1800)});
window.addEventListener('online',()=>{if(connected())syncNow(true)});
refresh();
})();