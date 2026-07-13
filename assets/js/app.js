import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, linkWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = { apiKey:"AIzaSyB5jUo6VmTNTRtCfwWhkwwXLYv1dcTSSi4", authDomain:"fire-dashboard-86bb9.firebaseapp.com", projectId:"fire-dashboard-86bb9", storageBucket:"fire-dashboard-86bb9.firebasestorage.app", messagingSenderId:"153073679515", appId:"1:153073679515:web:f49de492d1e79109fd1a3e", measurementId:"G-T34VDEFP7J" };
const app = initializeApp(firebaseConfig); const auth = getAuth(app); const db = getFirestore(app); const provider = new GoogleAuthProvider(); const lineProvider = new OAuthProvider("oidc.oidc.line");
let deferredInstallPrompt = null, user = null, state = null, charts = {}, editing = { kind:null, id:null }, authMode = "firebase", onboardingStep = 0, onboardingDraft = { goal: 30000000, assets: 0, debt: 0, age: 50 };
const assetCenterTextPlugin = {
  id: "assetCenterText",
  afterDraw(chart, args, options) {
    if (!options || !options.lines || chart.config.type !== "doughnut") return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(234,242,255,.55)";
    ctx.font = "700 13px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(options.lines[0] || "總資產", x, y - 18);
    ctx.fillStyle = "#fff";
    ctx.font = "900 22px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(options.lines[1] || "", x, y + 8);
    ctx.fillStyle = "rgba(39,229,143,.72)";
    ctx.font = "800 15px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(options.lines[2] || "100%", x, y + 35);
    ctx.restore();
  }
};
if (window.Chart) Chart.register(assetCenterTextPlugin);
const LIFF_ID = "2010658416-sSuwKltu";
const $ = id => document.getElementById(id);
const fmt = n => "NT$" + Math.round(Number(n)||0).toLocaleString("zh-TW");
const nf = n => Math.round(Number(n)||0).toLocaleString("zh-TW");
const raw = v => Number(String(v||0).replace(/,/g,"").replace(/[^\d.-]/g,"")) || 0;
const today = () => new Date().toISOString().slice(0,10);
const monthKey = () => new Date().toISOString().slice(0,7);
const uid = () => crypto.randomUUID();
const clone = obj => JSON.parse(JSON.stringify(obj));
const collectionMap = { asset:"assets", liability:"liabilities", investment:"investments", income:"income", expense:"expenses", journal:"journal", history:"history" };
const pageTitles = { dashboard:"首頁", assets:"Assets", investments:"投資", cashflow:"現金流", fire:"FIRE", journal:"旅程", ai:"AI Coach", settings:"設定" };

const fireQuotes = [
  "財務的累積，需要時間。",
  "今天的小累積，成就明天的自由。",
  "真正的財富，是時間的複利。",
  "持續前進，比快速前進更重要。",
  "每一次投資，都是未來的自己。",
  "離 FIRE，又近了一點。",
  "今天，也為未來的自己努力。",
  "市場會波動，紀律不該波動。",
  "每一筆投資，都在替未來工作。",
  "你不是在存錢，而是在購買未來的自由。",
  "時間，是最強大的投資工具。",
  "今天的選擇，決定十年後的生活。"
];
function setDailyQuote(){
  const el = $("greeting");
  if(!el) return;
  const idx = Math.floor(Date.now() / 86400000) % fireQuotes.length;
  el.textContent = fireQuotes[idx];
}

const fieldConfigs = {
  asset:[["name","名稱","text"],["type","類型","text"],["amount","金額","money"]],
  liability:[["name","名稱","text"],["amount","金額","money"]],
  investment:[["symbol","代號","text"],["name","名稱","text"],["cost","成本","money"],["value","現值","money"],["dividend","年度股息","money"]],
  income:[["name","收入項目","text"],["amount","每月金額","money"]],
  expense:[["name","支出項目","text"],["amount","每月金額","money"]],
  journal:[["date","日期","date"],["title","標題","text"],["amount","金額","money"],["note","備註","textarea"]]
};
const defaultData = {
  version:"3.0.6", onboardingCompleted:false, settings:{displayName:"", emergencyMonths:6, retirementAge:50}, fire:{goal:30000000, monthlyInvestment:60000, annualReturn:8},
  assets:[{id:uid(),name:"現金 / 存款",type:"現金",amount:800000},{id:uid(),name:"房地產",type:"房產",amount:3000000},{id:uid(),name:"其他資產",type:"其他",amount:200000}],
  liabilities:[{id:uid(),name:"房貸",amount:2300000},{id:uid(),name:"信用卡",amount:0}],
  investments:[{id:uid(),symbol:"0050",name:"元大台灣50",cost:2300000,value:2850000,dividend:68000},{id:uid(),symbol:"VOO",name:"Vanguard S&P 500",cost:1200000,value:1560000,dividend:32000}],
  income:[{id:uid(),name:"薪水",amount:95000},{id:uid(),name:"租金",amount:18000},{id:uid(),name:"股息 / 利息",amount:12000}],
  expenses:[{id:uid(),name:"生活費",amount:30000},{id:uid(),name:"房貸",amount:25800},{id:uid(),name:"保險",amount:5000}],
  journal:[{id:uid(),date:today(),title:"建立 FIRE OS 3.0.6",amount:0,note:"First Time Experience：建立 FIRE 初始資料。"}],
  history:[{id:uid(),month:"2025-04",netWorth:5900000},{id:uid(),month:"2025-05",netWorth:6150000},{id:uid(),month:"2025-06",netWorth:6420000},{id:uid(),month:"2025-07",netWorth:6810000},{id:uid(),month:"2025-08",netWorth:7200000}]
};
function isLiffMode(){return authMode === "liff"}
function isGuestMode(){return authMode === "guest"}
function isLocalMode(){return authMode === "liff" || authMode === "guest"}
function liffStorageKey(){return `fireos_liff_demo_${user?.uid || "guest"}`}
function localStorageKey(){return `fireos_local_${user?.uid || "guest"}`}
function userRef(){return doc(db,"users",user.uid)}
function normalizeState(data){const base=clone(defaultData);const merged={...base,...(data||{})};["assets","liabilities","investments","income","expenses","journal","history"].forEach(k=>{if(!Array.isArray(merged[k]))merged[k]=[];merged[k]=merged[k].map(item=>({id:item.id||uid(),...item}))});merged.settings={...base.settings,...(merged.settings||{})};merged.fire={...base.fire,...(merged.fire||{})};merged.version="3.0.6";return merged}
async function loadData(){
  let isNewUser = false;
  if (isLocalMode()) {
    const cached = isGuestMode() ? sessionStorage.getItem(localStorageKey()) : localStorage.getItem(localStorageKey());
    if (cached) {
      state = normalizeState(JSON.parse(cached));
    } else {
      isNewUser = true;
      state = clone(defaultData);
    }
    state.profile = {uid:user.uid,email:user.email || "",name:user.displayName,photo:user.photoURL,provider:isLiffMode()?"line-liff-demo":"guest-demo"};
    renderAll();
    if (isNewUser || state.onboardingCompleted !== true) showOnboarding();
    else await saveData();
    return;
  }
  const snap=await getDoc(userRef());
  if(snap.exists()){
    state=normalizeState(snap.data());
    if (state.onboardingCompleted === undefined) state.onboardingCompleted = true;
  }
  else{
    isNewUser = true;
    state=clone(defaultData);
    state.profile={uid:user.uid,email:user.email,name:user.displayName,photo:user.photoURL};
  }
  renderAll();
  if (isNewUser || state.onboardingCompleted !== true) showOnboarding();
  else await saveData();
}
async function saveData(){
  if(!user||!state)return;
  if (isLocalMode()) {
    state.updatedAt = new Date().toISOString();
    const payload = JSON.stringify(state);
    if (isGuestMode()) sessionStorage.setItem(localStorageKey(), payload);
    else localStorage.setItem(localStorageKey(), payload);
    return;
  }
  state.updatedAt=serverTimestamp();
  await setDoc(userRef(),state,{merge:true})
}
async function saveAndRender(){await saveData();renderAll()}
function totals(){const directAssets=state.assets.reduce((s,x)=>s+raw(x.amount),0);const investmentValue=state.investments.reduce((s,x)=>s+raw(x.value),0);const investmentCost=state.investments.reduce((s,x)=>s+raw(x.cost),0);const debt=state.liabilities.reduce((s,x)=>s+raw(x.amount),0);const income=state.income.reduce((s,x)=>s+raw(x.amount),0);const expenses=state.expenses.reduce((s,x)=>s+raw(x.amount),0);const passive=state.income.filter(x=>/租|股息|利息|被動|dividend|interest|rent/i.test(x.name)).reduce((s,x)=>s+raw(x.amount),0);const assets=directAssets+investmentValue;return{directAssets,investmentValue,investmentCost,assets,debt,netWorth:assets-debt,income,expenses,cashflow:income-expenses,passive,savingRate:income?((income-expenses)/income)*100:0,debtRatio:assets?(debt/assets)*100:0}}
function calcFire(){const t=totals();const goal=raw(state.fire.goal);const percent=goal?Math.min(Math.max((t.netWorth/goal)*100,0),100):0;let balance=t.netWorth, months=0;const monthlyRate=raw(state.fire.annualReturn)/100/12, monthlyInvestment=raw(state.fire.monthlyInvestment);if(balance>=goal)return{percent,months:0};if(monthlyInvestment<=0&&monthlyRate<=0)return{percent,months:null};while(balance<goal&&months<1200){balance=balance*(1+monthlyRate)+monthlyInvestment;months++}return{percent,months:months>=1200?null:months}}
function renderAll(){if(!state)return;renderUser();renderDashboard();renderLists();renderFire();renderAI();renderCharts()}

function getLinkedProviderIds(){
  if (isLiffMode()) return ["line-liff-demo"];
  return (auth.currentUser?.providerData || []).map(p => p.providerId);
}
function hasGoogleLinked(){
  return getLinkedProviderIds().includes("google.com");
}
function hasLineLinked(){
  return getLinkedProviderIds().includes("oidc.oidc.line");
}
function renderAuthLinks(){
  const box = $("providerStatus");
  if (!box) return;
  if (isLiffMode()) {
    box.innerHTML = `<div class="provider-pill linked"><div><b>LINE LIFF</b><span>已啟用</span></div><strong>✅</strong></div><div class="provider-pill"><div><b>資料模式</b><span>Local mode：此裝置保存</span></div></div>`;
    const lineBtn = $("linkLineBtn"); const googleBtn = $("linkGoogleBtn");
    if(lineBtn) lineBtn.disabled = true; if(googleBtn) googleBtn.disabled = true;
    return;
  }
  if (!auth.currentUser) return;
  const providers = getLinkedProviderIds();
  const googleLinked = hasGoogleLinked();
  const lineLinked = hasLineLinked();
  box.innerHTML = `
    <div class="provider-pill ${lineLinked ? "linked" : ""}">
      <div><b>LINE</b><span>${lineLinked ? "已連結" : "尚未連結"}</span></div><strong>${lineLinked ? "✅" : "—"}</strong>
    </div>
    <div class="provider-pill ${googleLinked ? "linked" : ""}">
      <div><b>Google</b><span>${googleLinked ? "已連結" : "尚未連結"}</span></div><strong>${googleLinked ? "✅" : "—"}</strong>
    </div>
    <div class="provider-pill"><div><b>目前 Provider</b><span>${providers.join(", ") || "未知"}</span></div></div>`;
  const lineBtn = $("linkLineBtn");
  const googleBtn = $("linkGoogleBtn");
  if (lineBtn) lineBtn.disabled = lineLinked;
  if (googleBtn) googleBtn.disabled = googleLinked;
}
async function linkProvider(provider, label){
  if (!auth.currentUser) return alert("請先登入");
  try {
    await linkWithPopup(auth.currentUser, provider);
    await auth.currentUser.reload();
    user = auth.currentUser;
    state.profile = {
      ...(state.profile || {}),
      uid: user.uid,
      email: user.email || state.profile?.email || "",
      name: user.displayName || state.profile?.name || "",
      photo: user.photoURL || state.profile?.photo || "",
      providers: getLinkedProviderIds()
    };
    await saveData();
    renderAuthLinks();
    alert(`${label} 連結成功！之後可以用 Google 或 LINE 登入同一份資料。`);
  } catch (error) {
    console.error(error);
    if (error.code === "auth/provider-already-linked") {
      alert(`${label} 已經連結過了。`);
    } else if (error.code === "auth/credential-already-in-use" || error.code === "auth/email-already-in-use") {
      alert(`${label} 已經被另一個 Firebase 帳號使用。\n\n請先登出，改用你想保留資料的主帳號登入，再按連結。若你已經分別建立兩份資料，下一步需要做資料合併。`);
    } else if (error.code === "auth/popup-closed-by-user") {
      alert("你關閉了登入視窗，尚未完成連結。");
    } else {
      alert(`連結失敗：${error.message}`);
    }
  }
}

function renderUser(){$("userName").textContent=state.settings.displayName||user.displayName||"User";$("userEmail").textContent=user.email || (isLiffMode()?"LINE":"");$("userPhoto").src=user.photoURL||"";$("displayNameInput").value=state.settings.displayName||"";$("emergencyMonthsInput").value=state.settings.emergencyMonths||6;renderAuthLinks()}
function renderDashboard(){const t=totals(), f=calcFire();$("netWorthHero").textContent=fmt(t.netWorth);$("kpiAssets").textContent=fmt(t.assets);$("kpiDebt").textContent=fmt(t.debt);$("kpiCashflow").textContent=fmt(t.cashflow);$("kpiCashflow").className=t.cashflow>=0?"positive":"negative";$("kpiPassive").textContent=(t.expenses?Math.min((t.passive/t.expenses)*100,999):0).toFixed(1)+"%";$("fireRing").textContent=f.percent.toFixed(0)+"%";document.querySelector(".ring").style.setProperty("--p",f.percent+"%");$("heroDelta").textContent=`Cloud synced · 儲蓄率 ${t.savingRate.toFixed(1)}% · 負債比 ${t.debtRatio.toFixed(1)}%`;renderFireJourney(t,f)}
function renderFireJourney(t,f){const goal=raw(state?.fire?.goal)||0;const current=t.netWorth;const remaining=Math.max(goal-current,0);const pct=Math.min(Math.max(f.percent||0,0),100);if($("journeyGoal"))$("journeyGoal").textContent=fmt(goal);if($("journeyCurrent"))$("journeyCurrent").textContent=fmt(current);if($("journeyRemain"))$("journeyRemain").textContent=fmt(remaining);if($("journeyPercent"))$("journeyPercent").textContent=pct.toFixed(0)+"%";if($("journeyRing"))$("journeyRing").style.setProperty("--p",pct+"%");if($("journeyEta")){if(f.months===null)$("journeyEta").textContent="100 年以上";else{const d=new Date();d.setMonth(d.getMonth()+f.months);$("journeyEta").textContent=`${d.getFullYear()} / ${String(d.getMonth()+1).padStart(2,"0")}`}}if($("journeyYears"))$("journeyYears").textContent=f.months===null?"--":`${(f.months/12).toFixed(1)} 年`}
function simpleItemHTML(item,kind,options={}){const title=item.name||item.symbol||"未命名";const sub=options.sub||item.type||"";const amount=options.amount??raw(item.amount);return`<div class="item"><div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(sub)}</span></div><div class="amount">${fmt(amount)}</div><button class="ghost-btn" data-edit="${kind}" data-id="${item.id}">編輯</button></div>`}
function renderLists(){$("assetList").innerHTML=state.assets.map(x=>simpleItemHTML(x,"asset")).join("")||emptyText("尚無資產資料");$("liabilityList").innerHTML=state.liabilities.map(x=>simpleItemHTML(x,"liability",{sub:"負債"})).join("")||emptyText("尚無負債資料");$("investmentList").innerHTML=state.investments.map(x=>{const pnl=raw(x.value)-raw(x.cost), pct=raw(x.cost)?(pnl/raw(x.cost))*100:0;return`<div class="item"><div><strong>${escapeHTML(x.symbol||"投資")}</strong><span>${escapeHTML(x.name||"")} · 成本 ${fmt(x.cost)} · 股息 ${fmt(x.dividend)} · 報酬 ${pct.toFixed(1)}%</span></div><div class="amount ${pnl>=0?"positive":"negative"}">${fmt(x.value)}</div><button class="ghost-btn" data-edit="investment" data-id="${x.id}">編輯</button></div>`}).join("")||emptyText("尚無投資資料");$("incomeList").innerHTML=state.income.map(x=>simpleItemHTML(x,"income")).join("")||emptyText("尚無收入資料");$("expenseList").innerHTML=state.expenses.map(x=>simpleItemHTML(x,"expense")).join("")||emptyText("尚無支出資料");$("journalList").innerHTML=[...state.journal].sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(x=>`<div class="timeline-item"><strong>${escapeHTML(x.date||"未填日期")} · ${escapeHTML(x.title||"未命名")}</strong><p>${fmt(x.amount)}</p><span>${escapeHTML(x.note||"")}</span><button class="ghost-btn small" data-edit="journal" data-id="${x.id}">編輯</button></div>`).join("")||emptyText("尚無財務日誌");document.querySelectorAll("[data-edit]").forEach(button=>{button.onclick=()=>openEdit(button.dataset.edit,button.dataset.id)})}
function emptyText(text){return`<div class="empty">${text}</div>`}
function renderFire(){const f=calcFire();$("fireGoalInput").value=nf(state.fire.goal);$("monthlyInvestInput").value=nf(state.fire.monthlyInvestment);$("returnInput").value=state.fire.annualReturn;$("fireProgress").style.width=f.percent+"%";if(f.months===null)$("fireEta").textContent="超過 100 年";else{const d=new Date();d.setMonth(d.getMonth()+f.months);$("fireEta").textContent=`${Math.floor(f.months/12)} 年 ${f.months%12} 個月 · ${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}`}}
function renderAI(){const t=totals(), f=calcFire();const cash=state.assets.find(x=>/現金|存款/i.test(x.name))?.amount||0;const emergency=t.expenses*(state.settings.emergencyMonths||6);const topExpense=[...state.expenses].sort((a,b)=>raw(b.amount)-raw(a.amount))[0];const insights=[`你的目前淨資產為 ${fmt(t.netWorth)}，FIRE 進度 ${f.percent.toFixed(1)}%。`,`本月收入 ${fmt(t.income)}、支出 ${fmt(t.expenses)}，儲蓄率約 ${t.savingRate.toFixed(1)}%。`,topExpense?`目前最大支出是「${topExpense.name}」${fmt(topExpense.amount)}，可以優先檢查是否有優化空間。`:"尚無支出資料，可以先建立每月支出。",raw(cash)<emergency?`現金預備金低於 ${state.settings.emergencyMonths} 個月支出目標，建議逐步提高到 ${fmt(emergency)}。`:`現金預備金看起來充足，已達 ${state.settings.emergencyMonths} 個月支出目標。`,`若每月投資維持 ${fmt(state.fire.monthlyInvestment)}，預估約 ${$("fireEta").textContent} 達成 FIRE。`];$("aiInsights").innerHTML=insights.map(x=>`<div class="insight">${escapeHTML(x)}</div>`).join("")}
function chart(key,el,type,data,options={}){if(!$(el))return;if(charts[key])charts[key].destroy();charts[key]=new Chart($(el),{type,data,options})}
function renderCharts(){
  if(!$("assetChart")||!state)return;
  const t=totals();
  const palette=["#cf7e8e","#98a3af","#72a9df","#67c49a","#e0c36f","#a97bd4","#e76f3c","#5cc9d6","#f59eb1","#8bd17c"];
  const items=[
    ...state.assets.map(x=>({name:x.name,value:raw(x.amount)})),
    ...state.investments.map(x=>({name:x.symbol||x.name,value:raw(x.value)}))
  ].filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
  const total=items.reduce((sum,x)=>sum+x.value,0)||1;
  const labels=items.map(x=>x.name);
  const data=items.map(x=>x.value);
  chart("asset","assetChart","doughnut",{
    labels,
    datasets:[{
      data,
      backgroundColor:palette.slice(0,data.length),
      borderColor:"rgba(8,17,31,.82)",
      borderWidth:3,
      borderRadius:10,
      spacing:3,
      hoverOffset:8
    }]
  },{
    responsive:true,
    maintainAspectRatio:false,
    cutout:"58%",
    plugins:{
      legend:{display:false},
      tooltip:{
        backgroundColor:"rgba(8,17,31,.92)",
        titleColor:"#fff",
        bodyColor:"#eaf2ff",
        borderColor:"rgba(255,255,255,.14)",
        borderWidth:1,
        callbacks:{label:(ctx)=>` ${ctx.label}: ${fmt(ctx.raw)} (${((ctx.raw/total)*100).toFixed(1)}%)`}
      },
      assetCenterText:{lines:["總資產",fmt(t.assets),"100%"]}
    }
  });
  const legend=$("assetLegend");
  if(legend){
    const top=items.slice(0,8);
    legend.innerHTML=top.map((x,i)=>`<div class="asset-legend-row"><i class="asset-legend-swatch" style="color:${palette[i%palette.length]}"></i><span class="asset-legend-name">${escapeHTML(x.name)}</span><strong class="asset-legend-pct">${((x.value/total)*100).toFixed(1)}%</strong><span class="asset-legend-arrow">›</span></div>`).join("") || emptyText("尚無資產配置資料");
  }
  const updated=$("assetUpdatedAt");
  if(updated) updated.textContent="最後更新："+new Date().toLocaleString("zh-TW",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
}
function getCollection(kind){const key=collectionMap[kind];return key?state[key]:null}
function openEdit(kind,id){const dialog=$("editDialog"), fields=$("dialogFields"), arr=getCollection(kind);if(!arr)return alert("未知資料類型："+kind);const config=fieldConfigs[kind];editing={kind,id};const item=id?arr.find(x=>x.id===id):{id:uid(),date:kind==="journal"?today():undefined};if(!item)return alert("找不到這筆資料");$("dialogTitle").textContent=(id?"編輯":"新增")+" "+labelOf(kind);fields.innerHTML=config.map(([key,label,type])=>{const value=type==="money"?nf(item[key]):(item[key]??"");if(type==="textarea")return`<label>${label}</label><textarea name="${key}">${escapeHTML(value)}</textarea>`;return`<label>${label}</label><input name="${key}" type="${type==="date"?"date":"text"}" value="${escapeHTML(value)}">`}).join("");$("deleteDialogBtn").classList.toggle("hidden",!id);dialog.showModal()}
async function submitEdit(event){event.preventDefault();const{kind,id}=editing, arr=getCollection(kind), config=fieldConfigs[kind];if(!arr||!config)return;let item=id?arr.find(x=>x.id===id):{id:uid()};if(!item)return;const formData=new FormData(event.target);config.forEach(([key,,type])=>{const value=formData.get(key);item[key]=type==="money"?raw(value):value});if(!id)arr.unshift(item);await saveData();$("editDialog").close();renderAll()}
async function deleteEditingItem(){const{kind,id}=editing;if(!id)return;if(!confirm("確定要刪除這筆資料？"))return;const key=collectionMap[kind];state[key]=state[key].filter(x=>x.id!==id);await saveData();$("editDialog").close();renderAll()}
function add(kind){openEdit(kind,null)}
function labelOf(kind){return({asset:"資產",liability:"負債",investment:"投資",income:"收入",expense:"支出",journal:"日誌"})[kind]||kind}
function escapeHTML(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
async function recordMonthlySnapshot(){const t=totals(), key=monthKey();const existing=state.history.find(x=>x.month===key);if(existing)existing.netWorth=t.netWorth;else state.history.push({id:uid(),month:key,netWorth:t.netWorth});state.journal.unshift({id:uid(),date:today(),title:"月度淨資產快照",amount:t.netWorth,note:`已記錄 ${key} 淨資產。`});await saveAndRender();alert("已建立本月快照")}
function exportData(){const payload=clone(state);payload.exportedAt=new Date().toISOString();const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=`fire-os-backup-${today()}.json`;link.click();URL.revokeObjectURL(link.href)}
function importData(event){const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=async()=>{try{const imported=JSON.parse(reader.result);if(!confirm("匯入會覆蓋目前雲端資料，確定繼續？"))return;state=normalizeState(imported);state.profile={uid:user.uid,email:user.email,name:user.displayName,photo:user.photoURL};await saveAndRender();alert("匯入完成")}catch(error){alert("匯入失敗：JSON 格式不正確")}finally{event.target.value=""}};reader.readAsText(file)}

function showOnboarding(){
  onboardingStep = 0;
  onboardingDraft = { goal: raw(state?.fire?.goal) || 30000000, assets: 0, debt: 0, age: state?.settings?.retirementAge || 50 };
  const view = $("onboardingView");
  if (view) view.classList.remove("hidden");
  renderOnboardingStep();
}
function hideOnboarding(){
  const view = $("onboardingView");
  if (view) view.classList.add("hidden");
}
function onboardingInputValue(id){ return raw($(id)?.value); }
function renderOnboardingStep(){
  const content = $("onboardingContent");
  const progress = $("onboardingProgress");
  const backBtn = $("onboardingBackBtn");
  const nextBtn = $("onboardingNextBtn");
  if (!content || !progress || !backBtn || !nextBtn) return;
  const pct = ((onboardingStep + 1) / 5) * 100;
  progress.style.width = pct + "%";
  backBtn.classList.toggle("hidden", onboardingStep === 0);
  nextBtn.textContent = onboardingStep === 4 ? "建立 FIRE OS" : "下一步";
  const screens = [
    `<div class="onboarding-hero"><div class="onboarding-flame">🔥</div><h2>歡迎來到 FIRE OS</h2><p>打造屬於你的 Personal Wealth OS。</p><p class="onboarding-muted">第一次使用，只需要 30 秒建立初始資料。</p></div>`,
    `<div class="onboarding-hero"><span class="onboarding-kicker">FIRE</span><h2>Financial Independence,<br>Retire Early</h2><p>真正的目標不是退休，而是提早擁有選擇人生的自由。</p></div>`,
    `<div class="onboarding-form"><h2>你的 FIRE 目標是多少？</h2><label>FIRE 目標金額</label><div class="onboarding-money"><span>NT$</span><input id="onboardGoal" inputmode="numeric" value="${nf(onboardingDraft.goal)}"></div><p class="onboarding-muted">不知道也沒關係，之後都可以修改。</p></div>`,
    `<div class="onboarding-form"><h2>目前財務現況</h2><label>目前總資產</label><div class="onboarding-money"><span>NT$</span><input id="onboardAssets" inputmode="numeric" value="${onboardingDraft.assets ? nf(onboardingDraft.assets) : ""}" placeholder="7,200,000"></div><label>目前總負債</label><div class="onboarding-money"><span>NT$</span><input id="onboardDebt" inputmode="numeric" value="${onboardingDraft.debt ? nf(onboardingDraft.debt) : ""}" placeholder="2,300,000"></div></div>`,
    `<div class="onboarding-form"><h2>希望幾歲擁有財務自由？</h2><div class="age-display"><strong id="onboardAgeText">${onboardingDraft.age}</strong><span>歲</span></div><input id="onboardAge" class="age-slider" type="range" min="30" max="65" value="${onboardingDraft.age}"><p class="onboarding-muted">這不是限制，而是給未來的自己一個方向。</p></div>`
  ];
  content.innerHTML = screens[onboardingStep];
  ["onboardGoal","onboardAssets","onboardDebt"].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("input", () => { el.value = nf(raw(el.value)); });
  });
  const age = $("onboardAge");
  if (age) age.addEventListener("input", () => { onboardingDraft.age = raw(age.value); $("onboardAgeText").textContent = onboardingDraft.age; });
}
function captureOnboardingStep(){
  if (onboardingStep === 2) onboardingDraft.goal = onboardingInputValue("onboardGoal") || 30000000;
  if (onboardingStep === 3) {
    onboardingDraft.assets = onboardingInputValue("onboardAssets");
    onboardingDraft.debt = onboardingInputValue("onboardDebt");
  }
  if (onboardingStep === 4) onboardingDraft.age = onboardingInputValue("onboardAge") || 50;
}
async function completeOnboarding(){
  captureOnboardingStep();
  const assets = raw(onboardingDraft.assets);
  const debt = raw(onboardingDraft.debt);
  const netWorth = assets - debt;
  state.fire.goal = raw(onboardingDraft.goal) || 30000000;
  state.settings.retirementAge = raw(onboardingDraft.age) || 50;
  state.assets = assets > 0 ? [{id:uid(), name:"目前總資產", type:"初始資產", amount:assets}] : [];
  state.liabilities = debt > 0 ? [{id:uid(), name:"目前總負債", amount:debt}] : [];
  state.history = [{id:uid(), month:monthKey(), netWorth:netWorth}];
  state.journal = [{id:uid(), date:today(), title:"FIRE Day 1", amount:netWorth, note:"你的 FIRE 旅程從今天開始。"}];
  state.onboardingCompleted = true;
  state.onboarding = {createdAt:new Date().toISOString(), retirementAge:state.settings.retirementAge};
  await saveAndRender();
  hideOnboarding();
  switchPage("dashboard");
}
function nextOnboarding(){
  captureOnboardingStep();
  if (onboardingStep < 4) { onboardingStep++; renderOnboardingStep(); return; }
  completeOnboarding();
}
function prevOnboarding(){
  captureOnboardingStep();
  if (onboardingStep > 0) { onboardingStep--; renderOnboardingStep(); }
}
async function startGuestExperience(){
  authMode = "guest";
  user = { uid:"guest", displayName:"體驗模式", email:"", photoURL:"" };
  // 訪客模式每次都重新開始，不沿用之前的 demo 資料。
  localStorage.removeItem(localStorageKey());
  sessionStorage.removeItem(localStorageKey());
  state = clone(defaultData);
  state.profile = {uid:user.uid,email:"",name:user.displayName,photo:"",provider:"guest-demo"};
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  renderAll();
  showOnboarding();
}

function setupPWA(){if("serviceWorker" in navigator)navigator.serviceWorker.register("./service-worker.js").catch(console.warn);window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstallPrompt=event;const btn=$("installBtn");if(btn)btn.classList.remove("hidden")});const installBtn=$("installBtn");if(installBtn)installBtn.onclick=async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;installBtn.classList.add("hidden")}}

function isMobileLike(){
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.matchMedia("(max-width: 768px)").matches;
}
async function handleLiffLogin(){
  if (!window.liff) return alert("LIFF SDK 尚未載入，請重新整理後再試一次。");
  try {
    await window.liff.init({ liffId: LIFF_ID });
    if (!window.liff.isLoggedIn()) {
      window.liff.login({ redirectUri: window.location.href.split("#")[0] });
      return;
    }
    const profile = await window.liff.getProfile();
    authMode = "liff";
    user = {
      uid: `line:${profile.userId}`,
      displayName: profile.displayName || "LINE User",
      email: "",
      photoURL: profile.pictureUrl || ""
    };
    $("loginView").classList.add("hidden");
    $("appView").classList.remove("hidden");
    await loadData();
  } catch (error) {
    console.error(error);
    alert(`LINE LIFF 登入失敗：${error.message || error}`);
  }
}
function blockMobileLineLogin(){
  return handleLiffLogin();
}
function applyMobileLineSafety(){
  const isMobile = isMobileLike();
  const lineLoginBtn = $("lineLoginBtn");
  const notice = $("mobileLineNotice");
  if (lineLoginBtn && isMobile) {
    lineLoginBtn.textContent = "使用 LINE 登入";
    lineLoginBtn.classList.remove("disabled-line");
    lineLoginBtn.removeAttribute("aria-disabled");
  }
  if (notice && isMobile) notice.classList.remove("hidden");
}

async function logout(){
  if (isLocalMode()) {
    try { if (isLiffMode() && window.liff && window.liff.isLoggedIn()) window.liff.logout(); } catch(e) {}
    if (isGuestMode()) sessionStorage.removeItem(localStorageKey());
    authMode = "firebase"; user = null; state = null;
    $("appView").classList.add("hidden"); $("loginView").classList.remove("hidden");
    return;
  }
  await signOut(auth);
}
function switchPage(page){document.querySelectorAll(".nav,.mobile-nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===page));document.querySelectorAll(".page").forEach(x=>x.classList.remove("active-page"));$(page).classList.add("active-page");$("pageTitle").textContent=pageTitles[page]||page;if($("sidebarPageTitle"))$("sidebarPageTitle").textContent=(page==="dashboard"?"🏠 ":"")+(pageTitles[page]||page);renderCharts();document.querySelector(".content")?.scrollTo?.({top:0,behavior:"smooth"});window.scrollTo({top:0,behavior:"smooth"})}
function bind(){document.querySelectorAll(".nav,.mobile-nav-item").forEach(button=>{button.onclick=()=>switchPage(button.dataset.page)});$("lineLoginBtn").onclick=()=>{ if(isMobileLike()) return handleLiffLogin(); return signInWithPopup(auth,lineProvider); };$("googleLoginBtn").onclick=()=>signInWithPopup(auth,provider);if($("guestExperienceBtn"))$("guestExperienceBtn").onclick=()=>startGuestExperience();if($("onboardingNextBtn"))$("onboardingNextBtn").onclick=()=>nextOnboarding();if($("onboardingBackBtn"))$("onboardingBackBtn").onclick=()=>prevOnboarding();$("linkLineBtn").onclick=()=>{ if(isMobileLike()) return alert("手機版目前使用 LINE 登入，帳號連結請先在桌機版操作。"); return linkProvider(lineProvider,"LINE"); };$("linkGoogleBtn").onclick=()=>linkProvider(provider,"Google");$("logoutBtn").onclick=()=>logout();if($("mobileLogoutBtn"))$("mobileLogoutBtn").onclick=()=>logout();$("saveBtn").onclick=async()=>{await saveData();alert("已同步到 Firestore")};$("addAssetBtn").onclick=()=>add("asset");$("addLiabilityBtn").onclick=()=>add("liability");$("addInvestmentBtn").onclick=()=>add("investment");$("addIncomeBtn").onclick=()=>add("income");$("addExpenseBtn").onclick=()=>add("expense");$("addJournalBtn").onclick=()=>add("journal");$("snapshotBtn").onclick=recordMonthlySnapshot;$("exportBtn").onclick=exportData;$("importBtn").onclick=()=>$("importFile").click();$("importFile").onchange=importData;$("editForm").onsubmit=submitEdit;$("deleteDialogBtn").onclick=deleteEditingItem;$("fireGoalInput").oninput=e=>{state.fire.goal=raw(e.target.value);e.target.value=nf(state.fire.goal);renderAll();saveData()};$("monthlyInvestInput").oninput=e=>{state.fire.monthlyInvestment=raw(e.target.value);e.target.value=nf(state.fire.monthlyInvestment);renderAll();saveData()};$("returnInput").oninput=e=>{state.fire.annualReturn=raw(e.target.value);renderAll();saveData()};$("displayNameInput").oninput=e=>{state.settings.displayName=e.target.value;renderUser();saveData()};$("emergencyMonthsInput").oninput=e=>{state.settings.emergencyMonths=raw(e.target.value);renderAI();saveData()};$("resetDemoBtn").onclick=async()=>{if(confirm("確定重置成示範資料？目前資料會被覆蓋。")){state=clone(defaultData);state.profile={uid:user.uid,email:user.email,name:user.displayName,photo:user.photoURL};await saveAndRender()}}}
setDailyQuote();bind();setupPWA();applyMobileLineSafety();
onAuthStateChanged(auth,async currentUser=>{if(isLocalMode())return;user=currentUser;if(currentUser){authMode="firebase";$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");await loadData()}else{$("loginView").classList.remove("hidden");$("appView").classList.add("hidden")}});
