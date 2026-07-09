import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB5jUo6VmTNTRtCfwWhkwwXLYv1dcTSSi4",
  authDomain: "fire-dashboard-86bb9.firebaseapp.com",
  projectId: "fire-dashboard-86bb9",
  storageBucket: "fire-dashboard-86bb9.firebasestorage.app",
  messagingSenderId: "153073679515",
  appId: "1:153073679515:web:f49de492d1e79109fd1a3e"
};

let firebaseApp, auth, db;
try {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
} catch (e) {
  console.warn("Firebase init failed", e);
}

const $ = id => document.getElementById(id);
const $$ = q => [...document.querySelectorAll(q)];
const fmt = n => "NT$" + Math.round(Number(n) || 0).toLocaleString("zh-TW");
const raw = v => Number(String(v || "").replace(/,/g, "").replace(/[^\d.-]/g, "")) || 0;
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());

let user = null;
let mode = "demo";
let editing = null;
let addingDebt = false;
let state = {
  language: "zh",
  cashflow: { income: 6000000, expense: 3600000 },
  assets: [
    { id: uid(), name: "TWD", type: "現金", value: 23000000 },
    { id: uid(), name: "VOO", type: "ETF", value: 2300000 },
    { id: uid(), name: "0050", type: "ETF", value: 1500000 },
    { id: uid(), name: "房地產", type: "不動產", value: 146000000 },
    { id: uid(), name: "台股", type: "股票", value: 9612844 }
  ],
  debts: [ { id: uid(), name: "房屋貸款", type: "房貸", value: 2300000 } ]
};

function totals(){
  const assets = state.assets.reduce((s,x)=>s+Number(x.value||0),0);
  const debt = state.debts.reduce((s,x)=>s+Number(x.value||0),0);
  const net = assets - debt;
  const cf = (state.cashflow?.income||0) - (state.cashflow?.expense||0);
  const saving = state.cashflow?.income ? cf / state.cashflow.income * 100 : 0;
  const leverage = debt ? assets / Math.max(debt,1) : 0;
  return { assets, debt, net, cf, saving, leverage };
}

function render(){
  const t = totals();
  $("homeNetWorth").textContent = fmt(t.net);
  $("homeAssets").textContent = fmt(t.assets);
  $("homeDebt").textContent = fmt(t.debt);
  $("homeLeverage").textContent = t.leverage ? t.leverage.toFixed(2) + "x" : "0.00x";
  $("incomeText").textContent = fmt(state.cashflow.income);
  $("expenseText").textContent = fmt(state.cashflow.expense);
  $("savingRateText").textContent = t.saving.toFixed(0) + "%";
  $("cashflowSummary").textContent = "年度自由現金流 " + fmt(t.cf);
  $("assetHeroTotal").textContent = fmt(t.assets);
  $("assetCount").textContent = state.assets.length + " 筆資產";
  $("dashNetWorth").textContent = fmt(t.net);
  $("dashAssets").textContent = fmt(t.assets);
  $("dashDebt").textContent = fmt(t.debt);
  $("dashLev").textContent = t.leverage ? t.leverage.toFixed(2) + "x" : "0.00x";
  $("debtHeroTotal").textContent = fmt(t.debt);
  $("debtDesc").textContent = state.debts.map(d=>d.name).join("、") || "尚無負債";
  $("syncBadge").textContent = mode === "cloud" ? "Cloud Synced" : "Demo Mode";
  $("syncStatusText").textContent = mode === "cloud" ? "Cloud Synced" : "Demo Mode";

  const colors = ["#83bfff", "#67d99a", "#f0a06a", "#9b7bd7", "#ef7e87", "#748079"];
  const total = Math.max(t.assets, 1);
  $("assetSplit").innerHTML = state.assets.slice(0,6).map((a,i)=>`<i style="background:${colors[i%colors.length]};flex:${Math.max(a.value/total*100,2)}"></i>`).join("");
  $("assetList").innerHTML = state.assets.map((a,i)=>assetHTML(a, colors[i%colors.length], false)).join("");
  $("debtList").innerHTML = state.debts.map(a=>assetHTML(a, "#ef7e87", true)).join("");
  $("portfolioLegend").innerHTML = state.assets.slice().sort((a,b)=>b.value-a.value).slice(0,5).map((a,i)=>`<span><b style="color:${colors[i%colors.length]}">${a.name}</b><strong>${(a.value/total*100).toFixed(1)}%</strong></span>`).join("");
  saveLocal();
}

function assetHTML(a,color,isDebt){
  return `<article class="asset-item" data-id="${a.id}" data-kind="${isDebt?'debt':'asset'}"><div class="badge" style="color:${color}">${isDebt?'▰':'●'}</div><div><h3>${a.name}</h3><p>${a.type}</p></div><strong class="${isDebt?'red':''}">${isDebt?'- ':''}${fmt(a.value)}</strong></article>`;
}

function show(page){
  $$(".page").forEach(p=>p.classList.toggle("active", p.id === page));
  $$(".bottom-nav button").forEach(b=>b.classList.toggle("active", b.dataset.page === page));
}

function openSheet(item=null, debt=false){
  editing = item;
  addingDebt = debt;
  $("sheetTitle").textContent = item ? "編輯" : (debt ? "新增負債" : "新增資產");
  $("itemName").value = item?.name || "";
  $("itemType").value = item?.type || (debt ? "負債" : "現金");
  $("itemValue").value = item?.value || "";
  $("assetDialog").showModal();
}

async function persist(){
  render();
  if(mode !== "cloud" || !user || !db) return;
  try {
    await setDoc(doc(db, "users", user.uid, "app", "fireos-233"), state, { merge:true });
  } catch(e) {
    console.warn("Firestore save failed", e);
    mode = "demo";
    render();
  }
}

function saveLocal(){ localStorage.setItem("fireos_233_demo", JSON.stringify(state)); }
function loadLocal(){ try { const d = JSON.parse(localStorage.getItem("fireos_233_demo")); if(d?.assets) state = d; } catch{} }

async function enterApp(u=null){
  user = u;
  mode = u ? "cloud" : "demo";
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  loadLocal();
  if(u && db){
    try{
      const snap = await getDoc(doc(db, "users", u.uid, "app", "fireos-233"));
      if(snap.exists()) state = snap.data();
      else await setDoc(doc(db, "users", u.uid, "app", "fireos-233"), state);
      mode = "cloud";
    }catch(e){
      console.warn("Firestore load failed, entering demo mode", e);
      mode = "demo";
    }
  }
  render();
}

$("googleLoginBtn").onclick = async () => {
  if(!auth) return enterApp(null);
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch(e){ alert("Google 登入失敗，先進入 Demo Mode。\n" + (e.message || e)); enterApp(null); }
};
$("demoBtn").onclick = () => enterApp(null);
$("logoutBtn").onclick = async () => { if(auth) await signOut(auth); location.reload(); };
$("fabBtn").onclick = () => openSheet(null, $("debtPage").classList.contains("active"));
$("addAssetBtn").onclick = () => openSheet(null, false);
$("addDebtBtn").onclick = () => openSheet(null, true);
$("resetDemoBtn").onclick = () => { localStorage.removeItem("fireos_233_demo"); location.reload(); };
$("refreshBtn").onclick = render;
$("languageSelect").onchange = e => state.language = e.target.value;

$$("[data-page]").forEach(btn => btn.onclick = () => show(btn.dataset.page));
$$("[data-go]").forEach(row => row.onclick = () => show(row.dataset.go));
$("assetList").onclick = e => { const card = e.target.closest(".asset-item"); if(!card) return; openSheet(state.assets.find(a=>a.id===card.dataset.id), false); };
$("debtList").onclick = e => { const card = e.target.closest(".asset-item"); if(!card) return; openSheet(state.debts.find(a=>a.id===card.dataset.id), true); };

$("assetForm").onsubmit = async e => {
  e.preventDefault();
  const item = editing || { id: uid() };
  item.name = $("itemName").value.trim();
  item.type = $("itemType").value;
  item.value = raw($("itemValue").value);
  const arr = addingDebt ? state.debts : state.assets;
  if(!editing) arr.unshift(item);
  await persist();
  $("assetDialog").close();
};

if(auth){ onAuthStateChanged(auth, u => { if(u) enterApp(u); }); }
if("serviceWorker" in navigator){ navigator.serviceWorker.register("./service-worker.js").catch(()=>{}); }
