import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB5jUo6VmTNTRtCfwWhkwwXLYv1dcTSSi4",
  authDomain: "fire-dashboard-86bb9.firebaseapp.com",
  projectId: "fire-dashboard-86bb9",
  storageBucket: "fire-dashboard-86bb9.firebasestorage.app",
  messagingSenderId: "153073679515",
  appId: "1:153073679515:web:f49de492d1e79109fd1a3e",
  measurementId: "G-T34VDEFP7J"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let deferredInstallPrompt = null;
let user = null;
let state = null;
let charts = {};
let editing = { kind: null, id: null };

const $ = id => document.getElementById(id);
const fmt = n => "NT$" + Math.round(Number(n) || 0).toLocaleString("zh-TW");
const nf = n => Math.round(Number(n) || 0).toLocaleString("zh-TW");
const raw = v => Number(String(v || 0).replace(/,/g, "").replace(/[^\d.-]/g, "")) || 0;
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = () => new Date().toISOString().slice(0, 7);
const uid = () => crypto.randomUUID();
const clone = obj => JSON.parse(JSON.stringify(obj));


const i18n = {
  zh: {
    "auth.google":"使用 Google 登入","auth.note":"登入後資料會同步到 Firebase Firestore。",
    "common.logout":"登出","common.install":"安裝 App","common.sync":"同步資料","common.save":"儲存","common.cancel":"取消","common.delete":"刪除","common.edit":"編輯","common.add":"新增","common.noName":"未命名","common.untitled":"未命名","common.synced":"已同步到 Firestore","common.confirmDelete":"確定要刪除這筆資料？","common.resetConfirm":"確定重置成示範資料？目前資料會被覆蓋。","common.unknownType":"未知資料類型：","common.notFound":"找不到這筆資料","common.importConfirm":"匯入會覆蓋目前雲端資料，確定繼續？","common.importDone":"匯入完成","common.importError":"匯入失敗：JSON 格式不正確",
    "nav.dashboard":"探索","nav.assets":"資產","nav.investments":"儀表板","nav.cashflow":"現金流","nav.fire":"FIRE","nav.journal":"日誌","nav.ai":"AI 教練","nav.settings":"設定",
    "page.dashboard":"Dashboard","page.assets":"我的資產","page.investments":"投資組合","page.cashflow":"現金流","page.fire":"FIRE","page.journal":"財務日誌","page.ai":"AI Coach","page.settings":"設定",
    "dashboard.netWorth":"Net Worth","dashboard.totalAssets":"Total Assets","dashboard.totalDebt":"Total Debt","dashboard.monthlyCashflow":"Monthly Cashflow","dashboard.passiveCoverage":"Passive Coverage","dashboard.hero":"Cloud synced · 儲蓄率 {saving}% · 負債比 {debt}%",
    "charts.assetAllocation":"資產配置","charts.netWorthTrend":"淨資產趨勢",
    "assets.title":"資產管理","assets.addAsset":"新增資產","assets.addLiability":"新增負債","assets.assets":"資產","assets.liabilities":"負債","assets.empty":"尚無資產資料","assets.emptyDebt":"尚無負債資料","assets.debt":"負債",
    "investments.title":"投資組合","investments.add":"新增投資","investments.empty":"尚無投資資料","investments.cost":"成本","investments.dividend":"股息","investments.return":"報酬",
    "cashflow.income":"每月收入","cashflow.expenses":"每月支出","cashflow.addIncome":"新增收入","cashflow.addExpense":"新增支出","cashflow.emptyIncome":"尚無收入資料","cashflow.emptyExpense":"尚無支出資料",
    "fire.title":"FIRE 模擬器","fire.goal":"FIRE 目標金額","fire.monthlyInvestment":"每月投資金額","fire.annualReturn":"年化報酬率 (%)","fire.eta":"預估達成","fire.over100":"超過 100 年","fire.etaText":"{years} 年 {months} 個月 · {date}",
    "journal.title":"財務日誌","journal.snapshot":"記錄本月快照","journal.add":"新增日誌","journal.empty":"尚無財務日誌","journal.snapshotTitle":"月度淨資產快照","journal.snapshotNote":"已記錄 {month} 淨資產。","journal.snapshotDone":"已建立本月快照",
    "ai.title":"AI Coach","ai.netWorth":"你的目前淨資產為 {netWorth}，FIRE 進度 {fire}%。","ai.cashflow":"本月收入 {income}、支出 {expenses}，儲蓄率約 {saving}%。","ai.topExpense":"目前最大支出是「{name}」{amount}，可以優先檢查是否有優化空間。","ai.noExpense":"尚無支出資料，可以先建立每月支出。","ai.cashLow":"現金預備金低於 {months} 個月支出目標，建議逐步提高到 {target}。","ai.cashOk":"現金預備金看起來充足，已達 {months} 個月支出目標。","ai.fireEta":"若每月投資維持 {amount}，預估約 {eta} 達成 FIRE。",
    "settings.title":"設定","settings.displayName":"顯示名稱","settings.language":"語言","settings.emergencyMonths":"預備金目標（月支出倍數）","settings.export":"匯出 JSON 備份","settings.import":"匯入 JSON 備份","settings.reset":"重置為示範資料",
    "fields.name":"名稱","fields.type":"類型","fields.amount":"金額","fields.symbol":"代號","fields.cost":"成本","fields.value":"現值","fields.dividend":"年度股息","fields.incomeName":"收入項目","fields.expenseName":"支出項目","fields.date":"日期","fields.title":"標題","fields.note":"備註",
    "kinds.asset":"資產","kinds.liability":"負債","kinds.investment":"投資","kinds.income":"收入","kinds.expense":"支出","kinds.journal":"日誌"
  },
  en: {
    "auth.google":"Continue with Google","auth.note":"Your data will sync to Firebase Firestore after sign in.",
    "common.logout":"Logout","common.install":"Install App","common.sync":"Sync","common.save":"Save","common.cancel":"Cancel","common.delete":"Delete","common.edit":"Edit","common.add":"Add","common.noName":"Unnamed","common.untitled":"Untitled","common.synced":"Synced to Firestore","common.confirmDelete":"Delete this item?","common.resetConfirm":"Reset to demo data? Current cloud data will be overwritten.","common.unknownType":"Unknown data type: ","common.notFound":"Item not found","common.importConfirm":"Importing will overwrite current cloud data. Continue?","common.importDone":"Import completed","common.importError":"Import failed: invalid JSON file",
    "nav.dashboard":"Explore","nav.assets":"Assets","nav.investments":"Dashboard","nav.cashflow":"Cashflow","nav.fire":"FIRE","nav.journal":"Journal","nav.ai":"AI Coach","nav.settings":"Settings",
    "page.dashboard":"Dashboard","page.assets":"My Assets","page.investments":"Portfolio","page.cashflow":"Cashflow","page.fire":"FIRE","page.journal":"Journal","page.ai":"AI Coach","page.settings":"Settings",
    "dashboard.netWorth":"Net Worth","dashboard.totalAssets":"Total Assets","dashboard.totalDebt":"Total Debt","dashboard.monthlyCashflow":"Monthly Cashflow","dashboard.passiveCoverage":"Passive Coverage","dashboard.hero":"Cloud synced · Saving rate {saving}% · Debt ratio {debt}%",
    "charts.assetAllocation":"Asset Allocation","charts.netWorthTrend":"Net Worth Trend",
    "assets.title":"Asset Management","assets.addAsset":"Add Asset","assets.addLiability":"Add Debt","assets.assets":"Assets","assets.liabilities":"Liabilities","assets.empty":"No asset data yet","assets.emptyDebt":"No debt data yet","assets.debt":"Debt",
    "investments.title":"Portfolio","investments.add":"Add Investment","investments.empty":"No investment data yet","investments.cost":"Cost","investments.dividend":"Dividend","investments.return":"Return",
    "cashflow.income":"Monthly Income","cashflow.expenses":"Monthly Expenses","cashflow.addIncome":"Add Income","cashflow.addExpense":"Add Expense","cashflow.emptyIncome":"No income data yet","cashflow.emptyExpense":"No expense data yet",
    "fire.title":"FIRE Simulator","fire.goal":"FIRE Target","fire.monthlyInvestment":"Monthly Investment","fire.annualReturn":"Annual Return (%)","fire.eta":"Estimated FI","fire.over100":"Over 100 years","fire.etaText":"{years}y {months}m · {date}",
    "journal.title":"Financial Journal","journal.snapshot":"Record Snapshot","journal.add":"Add Journal","journal.empty":"No journal entries yet","journal.snapshotTitle":"Monthly Net Worth Snapshot","journal.snapshotNote":"Recorded net worth for {month}.","journal.snapshotDone":"Monthly snapshot saved",
    "ai.title":"AI Coach","ai.netWorth":"Your current net worth is {netWorth}, and your FIRE progress is {fire}%.","ai.cashflow":"This month: income {income}, expenses {expenses}, saving rate around {saving}%.","ai.topExpense":"Your largest expense is “{name}” at {amount}. It is a good place to check for optimization.","ai.noExpense":"No expense data yet. Start by adding monthly expenses.","ai.cashLow":"Your cash reserve is below the {months}-month expense target. Consider building it up to {target}.","ai.cashOk":"Your cash reserve looks healthy and meets the {months}-month expense target.","ai.fireEta":"If you keep investing {amount} per month, estimated FIRE timing is around {eta}.",
    "settings.title":"Settings","settings.displayName":"Display Name","settings.language":"Language","settings.emergencyMonths":"Emergency Fund Target (months of expenses)","settings.export":"Export JSON Backup","settings.import":"Import JSON Backup","settings.reset":"Reset Demo Data",
    "fields.name":"Name","fields.type":"Type","fields.amount":"Amount","fields.symbol":"Symbol","fields.cost":"Cost","fields.value":"Current Value","fields.dividend":"Annual Dividend","fields.incomeName":"Income Item","fields.expenseName":"Expense Item","fields.date":"Date","fields.title":"Title","fields.note":"Note",
    "kinds.asset":"Asset","kinds.liability":"Debt","kinds.investment":"Investment","kinds.income":"Income","kinds.expense":"Expense","kinds.journal":"Journal"
  }
};

function currentLang(){ return state?.settings?.language || localStorage.getItem("fireos_lang") || "zh"; }
function tr(key, vars = {}){
  const lang = currentLang();
  let value = i18n[lang]?.[key] || i18n.zh[key] || key;
  Object.entries(vars).forEach(([k,v]) => value = value.replaceAll(`{${k}}`, v));
  return value;
}
function applyI18n(){
  const lang = currentLang();
  document.documentElement.lang = lang === "en" ? "en" : "zh-Hant";
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = tr(el.dataset.i18n); });
  const top = $("languageSelectTop"); if (top) top.value = lang;
  const sel = $("languageSelect"); if (sel) sel.value = lang;
  const active = document.querySelector(".nav.active");
  if (active) $("pageTitle").textContent = tr(`page.${active.dataset.page}`);
}

const collectionMap = {
  asset: "assets",
  liability: "liabilities",
  investment: "investments",
  income: "income",
  expense: "expenses",
  journal: "journal",
  history: "history"
};

const fieldConfigs = {
  asset: [
    ["name", "fields.name", "text"],
    ["type", "fields.type", "text"],
    ["amount", "fields.amount", "money"]
  ],
  liability: [
    ["name", "fields.name", "text"],
    ["amount", "fields.amount", "money"]
  ],
  investment: [
    ["symbol", "fields.symbol", "text"],
    ["name", "fields.name", "text"],
    ["cost", "fields.cost", "money"],
    ["value", "fields.value", "money"],
    ["dividend", "fields.dividend", "money"]
  ],
  income: [
    ["name", "fields.incomeName", "text"],
    ["amount", "每月金額", "money"]
  ],
  expense: [
    ["name", "fields.expenseName", "text"],
    ["amount", "每月金額", "money"]
  ],
  journal: [
    ["date", "fields.date", "date"],
    ["title", "fields.title", "text"],
    ["amount", "fields.amount", "money"],
    ["note", "fields.note", "textarea"]
  ]
};

const defaultData = {
  version: "2.3",
  settings: { displayName: "", emergencyMonths: 6, language: "zh" },
  fire: { goal: 30000000, monthlyInvestment: 60000, annualReturn: 8 },
  assets: [
    { id: uid(), name: "現金 / 存款", type: "現金", amount: 800000 },
    { id: uid(), name: "房地產", type: "房產", amount: 3000000 },
    { id: uid(), name: "其他資產", type: "其他", amount: 200000 }
  ],
  liabilities: [
    { id: uid(), name: "房貸", amount: 2300000 },
    { id: uid(), name: "信用卡", amount: 0 }
  ],
  investments: [
    { id: uid(), symbol: "0050", name: "元大台灣50", cost: 2300000, value: 2850000, dividend: 68000 },
    { id: uid(), symbol: "VOO", name: "Vanguard S&P 500", cost: 1200000, value: 1560000, dividend: 32000 }
  ],
  income: [
    { id: uid(), name: "薪水", amount: 95000 },
    { id: uid(), name: "租金", amount: 18000 },
    { id: uid(), name: "股息 / 利息", amount: 12000 }
  ],
  expenses: [
    { id: uid(), name: "生活費", amount: 30000 },
    { id: uid(), name: "房貸", amount: 25800 },
    { id: uid(), name: "保險", amount: 5000 }
  ],
  journal: [
    { id: uid(), date: today(), title: "建立 FIRE OS 2.3", amount: 0, note: "資料管理 + 雙語介面版。" }
  ],
  history: [
    { id: uid(), month: "2025-04", netWorth: 5900000 },
    { id: uid(), month: "2025-05", netWorth: 6150000 },
    { id: uid(), month: "2025-06", netWorth: 6420000 },
    { id: uid(), month: "2025-07", netWorth: 6810000 },
    { id: uid(), month: "2025-08", netWorth: 7200000 }
  ]
};

function userRef() {
  return doc(db, "users", user.uid);
}

function normalizeState(data) {
  const base = clone(defaultData);
  const merged = { ...base, ...(data || {}) };
  ["assets", "liabilities", "investments", "income", "expenses", "journal", "history"].forEach(key => {
    if (!Array.isArray(merged[key])) merged[key] = [];
    merged[key] = merged[key].map(item => ({ id: item.id || uid(), ...item }));
  });
  merged.settings = { ...base.settings, ...(merged.settings || {}) };
  merged.fire = { ...base.fire, ...(merged.fire || {}) };
  merged.version = "2.3";
  return merged;
}

async function loadData() {
  const snap = await getDoc(userRef());
  if (snap.exists()) {
    state = normalizeState(snap.data());
  } else {
    state = clone(defaultData);
    state.profile = { uid: user.uid, email: user.email, name: user.displayName, photo: user.photoURL };
    await saveData();
  }
  renderAll();
}

async function saveData() {
  if (!user || !state) return;
  state.updatedAt = serverTimestamp();
  await setDoc(userRef(), state, { merge: true });
}

async function saveAndRender() {
  await saveData();
  renderAll();
}

function totals() {
  const directAssets = state.assets.reduce((sum, x) => sum + raw(x.amount), 0);
  const investmentValue = state.investments.reduce((sum, x) => sum + raw(x.value), 0);
  const investmentCost = state.investments.reduce((sum, x) => sum + raw(x.cost), 0);
  const debt = state.liabilities.reduce((sum, x) => sum + raw(x.amount), 0);
  const income = state.income.reduce((sum, x) => sum + raw(x.amount), 0);
  const expenses = state.expenses.reduce((sum, x) => sum + raw(x.amount), 0);
  const passive = state.income
    .filter(x => /租|股息|利息|被動|dividend|interest|rent/i.test(x.name))
    .reduce((sum, x) => sum + raw(x.amount), 0);
  const assets = directAssets + investmentValue;
  return {
    directAssets,
    investmentValue,
    investmentCost,
    assets,
    debt,
    netWorth: assets - debt,
    income,
    expenses,
    cashflow: income - expenses,
    passive,
    savingRate: income ? ((income - expenses) / income) * 100 : 0,
    debtRatio: assets ? (debt / assets) * 100 : 0
  };
}

function calcFire() {
  const t = totals();
  const goal = raw(state.fire.goal);
  const percent = goal ? Math.min(Math.max((t.netWorth / goal) * 100, 0), 100) : 0;
  let balance = t.netWorth;
  let months = 0;
  const monthlyRate = raw(state.fire.annualReturn) / 100 / 12;
  const monthlyInvestment = raw(state.fire.monthlyInvestment);
  if (balance >= goal) return { percent, months: 0 };
  if (monthlyInvestment <= 0 && monthlyRate <= 0) return { percent, months: null };
  while (balance < goal && months < 1200) {
    balance = balance * (1 + monthlyRate) + monthlyInvestment;
    months++;
  }
  return { percent, months: months >= 1200 ? null : months };
}

function renderAll() {
  if (!state) return;
  applyI18n();
  renderUser();
  renderDashboard();
  renderLists();
  renderFire();
  renderAI();
  renderCharts();
}

function renderAllocationBars() {
  if (!$('allocationStrip')) return;
  const colors = ["#76b7f0", "#65d69a", "#e9a36d", "#9c78da", "#e1707d", "#8a9890"];
  const entries = [...state.assets.map(x => ({ name: x.name, amount: raw(x.amount) })), ...state.investments.map(x => ({ name: x.symbol || x.name, amount: raw(x.value) }))].filter(x => x.amount > 0);
  const total = entries.reduce((sum, x) => sum + x.amount, 0) || 1;
  const top = entries.sort((a,b)=>b.amount-a.amount).slice(0,6);
  $('allocationStrip').innerHTML = top.map((x,i)=>`<i style="background:${colors[i%colors.length]};flex:${Math.max(x.amount/total*100,3)}"></i>`).join('');
  const legend = top.map((x,i)=>`<span style="--dot:${colors[i%colors.length]}">${escapeHTML(x.name)} ${((x.amount/total)*100).toFixed(0)}%</span>`).join('');
  if ($('allocationLegend')) $('allocationLegend').innerHTML = legend;
  if ($('portfolioLegend')) $('portfolioLegend').innerHTML = top.slice(0,5).map((x,i)=>`<span style="--dot:${colors[i%colors.length]}"><b>${escapeHTML(x.name)}</b><em>${((x.amount/total)*100).toFixed(1)}%</em></span>`).join('');
}

function renderUser() {
  $("userName").textContent = state.settings.displayName || user.displayName || "User";
  $("userEmail").textContent = user.email || "";
  $("userPhoto").src = user.photoURL || "";
  $("displayNameInput").value = state.settings.displayName || "";
  $("emergencyMonthsInput").value = state.settings.emergencyMonths || 6;
  if ($("languageSelect")) $("languageSelect").value = currentLang();
  if ($("languageSelectTop")) $("languageSelectTop").value = currentLang();
}

function renderDashboard() {
  const t = totals();
  const f = calcFire();
  $("netWorthHero").textContent = fmt(t.netWorth);
  $("kpiAssets").textContent = fmt(t.assets);
  $("kpiDebt").textContent = fmt(t.debt);
  $("kpiCashflow").textContent = fmt(t.cashflow);
  $("kpiCashflow").className = t.cashflow >= 0 ? "positive" : "negative";
  $("kpiPassive").textContent = (t.expenses ? Math.min((t.passive / t.expenses) * 100, 999) : 0).toFixed(1) + "%";
  $("fireRing").textContent = f.percent.toFixed(0) + "%";
  const ringEl = document.querySelector(".ring"); if (ringEl) ringEl.style.setProperty("--p", f.percent + "%");
  $("heroDelta").textContent = tr("dashboard.hero", { saving: t.savingRate.toFixed(1), debt: t.debtRatio.toFixed(1) });
  const leverage = t.debt ? (t.assets / Math.max(t.debt, 1)) : 0;
  if ($("leverageText")) $("leverageText").textContent = leverage ? leverage.toFixed(2) + "x" : "0.00x";
  const cash = state.assets.find(x => /cash|現金|twd|台幣/i.test(x.name || x.type || ""));
  const cashAmount = cash ? raw(cash.amount) : 0;
  if ($("exCashExposure")) $("exCashExposure").textContent = fmt(Math.max(t.assets - cashAmount, 0));
  if ($("todayDelta")) $("todayDelta").textContent = currentLang() === "zh" ? "今日 ▼ -$0" : "Today ▼ -$0";
  if ($("yearChangeText")) {
    const history = [...state.history].sort((a,b)=>String(a.month).localeCompare(String(b.month)));
    const first = history[0]?.netWorth ? raw(history[0].netWorth) : t.netWorth;
    const change = t.netWorth - first;
    const pct = first ? (change / first) * 100 : 0;
    $("yearChangeText").textContent = `${change >= 0 ? "+" : ""}${fmt(change)} ${change >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
    $("yearChangeText").className = change >= 0 ? "positive" : "negative";
  }
  renderAllocationBars();
}

function simpleItemHTML(item, kind, options = {}) {
  const title = item.name || item.symbol || tr("common.noName");
  const sub = options.sub || item.type || "";
  const amount = options.amount ?? raw(item.amount);
  return `
    <div class="item">
      <div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(sub)}</span></div>
      <div class="amount">${fmt(amount)}</div>
      <button class="ghost-btn" data-edit="${kind}" data-id="${item.id}">${tr("common.edit")}</button>
    </div>`;
}

function renderLists() {
  $("assetList").innerHTML = state.assets.map(x => simpleItemHTML(x, "asset")).join("") || emptyText(tr("assets.empty"));
  $("liabilityList").innerHTML = state.liabilities.map(x => simpleItemHTML(x, "liability", { sub: tr("assets.debt") })).join("") || emptyText(tr("assets.emptyDebt"));
  $("investmentList").innerHTML = state.investments.map(x => {
    const pnl = raw(x.value) - raw(x.cost);
    const pct = raw(x.cost) ? (pnl / raw(x.cost)) * 100 : 0;
    return `
      <div class="item">
        <div><strong>${escapeHTML(x.symbol || tr("kinds.investment"))}</strong><span>${escapeHTML(x.name || "")} · ${tr("investments.cost")} ${fmt(x.cost)} · ${tr("investments.dividend")} ${fmt(x.dividend)} · ${tr("investments.return")} ${pct.toFixed(1)}%</span></div>
        <div class="amount ${pnl >= 0 ? "positive" : "negative"}">${fmt(x.value)}</div>
        <button class="ghost-btn" data-edit="investment" data-id="${x.id}">${tr("common.edit")}</button>
      </div>`;
  }).join("") || emptyText(tr("investments.empty"));
  $("incomeList").innerHTML = state.income.map(x => simpleItemHTML(x, "income")).join("") || emptyText(tr("cashflow.emptyIncome"));
  $("expenseList").innerHTML = state.expenses.map(x => simpleItemHTML(x, "expense")).join("") || emptyText(tr("cashflow.emptyExpense"));
  $("journalList").innerHTML = [...state.journal]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map(x => `
      <div class="timeline-item">
        <strong>${escapeHTML(x.date || tr("fields.date"))} · ${escapeHTML(x.title || tr("common.untitled"))}</strong>
        <p>${fmt(x.amount)}</p>
        <span>${escapeHTML(x.note || "")}</span>
        <button class="ghost-btn small" data-edit="journal" data-id="${x.id}">${tr("common.edit")}</button>
      </div>`).join("") || emptyText(tr("journal.empty"));
  document.querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = () => openEdit(button.dataset.edit, button.dataset.id);
  });
}

function emptyText(text) {
  return `<div class="empty">${text}</div>`;
}

function renderFire() {
  const f = calcFire();
  $("fireGoalInput").value = nf(state.fire.goal);
  $("monthlyInvestInput").value = nf(state.fire.monthlyInvestment);
  $("returnInput").value = state.fire.annualReturn;
  $("fireProgress").style.width = f.percent + "%";
  if (f.months === null) {
    $("fireEta").textContent = tr("fire.over100");
  } else {
    const d = new Date();
    d.setMonth(d.getMonth() + f.months);
    $("fireEta").textContent = tr("fire.etaText", { years: Math.floor(f.months / 12), months: f.months % 12, date: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}` });
  }
}

function renderAI() {
  const t = totals();
  const f = calcFire();
  const cash = state.assets.find(x => /現金|存款/i.test(x.name))?.amount || 0;
  const emergency = t.expenses * (state.settings.emergencyMonths || 6);
  const topExpense = [...state.expenses].sort((a, b) => raw(b.amount) - raw(a.amount))[0];
  const insights = [
    tr("ai.netWorth", { netWorth: fmt(t.netWorth), fire: f.percent.toFixed(1) }),
    tr("ai.cashflow", { income: fmt(t.income), expenses: fmt(t.expenses), saving: t.savingRate.toFixed(1) }),
    topExpense ? tr("ai.topExpense", { name: topExpense.name, amount: fmt(topExpense.amount) }) : tr("ai.noExpense"),
    raw(cash) < emergency ? tr("ai.cashLow", { months: state.settings.emergencyMonths, target: fmt(emergency) }) : tr("ai.cashOk", { months: state.settings.emergencyMonths }),
    tr("ai.fireEta", { amount: fmt(state.fire.monthlyInvestment), eta: $("fireEta").textContent })
  ];
  $("aiInsights").innerHTML = insights.map(x => `<div class="insight">${escapeHTML(x)}</div>`).join("");
}

function chart(key, el, type, data, options = {}) {
  if (!$(el)) return;
  if (charts[key]) charts[key].destroy();
  charts[key] = new Chart($(el), { type, data, options });
}

function renderCharts() {
  if (!$("assetChart") || !state) return;
  const assetLabels = [...state.assets.map(x => x.name), ...state.investments.map(x => x.symbol || x.name)];
  const assetData = [...state.assets.map(x => raw(x.amount)), ...state.investments.map(x => raw(x.value))];
  chart("asset", "assetChart", "doughnut", { labels: assetLabels, datasets: [{ data: assetData, borderWidth: 0, hoverOffset: 8 }] }, { cutout: "62%", plugins: { legend: { display: false } } });
  const history = [...state.history].sort((a, b) => String(a.month).localeCompare(String(b.month)));
  chart("nw", "netWorthChart", "line", {
    labels: history.map(x => x.month),
    datasets: [{ label: "Net Worth", data: history.map(x => raw(x.netWorth)), tension: 0.35, pointRadius: 4, borderWidth: 4 }]
  }, { plugins: { legend: { display: false } }, scales: { x: { grid: { color: "rgba(255,255,255,.06)" }, ticks: { color: "rgba(255,255,255,.62)" } }, y: { beginAtZero: false, grid: { color: "rgba(255,255,255,.06)" }, ticks: { color: "rgba(255,255,255,.62)" } } } });
}

function getCollection(kind) {
  const key = collectionMap[kind];
  return key ? state[key] : null;
}

function openEdit(kind, id) {
  const dialog = $("editDialog");
  const fields = $("dialogFields");
  const arr = getCollection(kind);
  if (!arr) return alert(tr("common.unknownType") + kind);
  const config = fieldConfigs[kind];
  editing = { kind, id };
  const item = id ? arr.find(x => x.id === id) : { id: uid(), date: kind === "journal" ? today() : undefined };
  if (!item) return alert(tr("common.notFound"));
  $("dialogTitle").textContent = (id ? tr("common.edit") : tr("common.add")) + " " + labelOf(kind);
  fields.innerHTML = config.map(([key, label, type]) => {
    const value = type === "money" ? nf(item[key]) : (item[key] ?? "");
    if (type === "textarea") return `<label>${tr(label)}</label><textarea name="${key}">${escapeHTML(value)}</textarea>`;
    return `<label>${tr(label)}</label><input name="${key}" type="${type === "date" ? "date" : "text"}" value="${escapeHTML(value)}">`;
  }).join("");
  $("deleteDialogBtn").classList.toggle("hidden", !id);
  dialog.showModal();
}

async function submitEdit(event) {
  event.preventDefault();
  const { kind, id } = editing;
  const arr = getCollection(kind);
  const config = fieldConfigs[kind];
  if (!arr || !config) return;
  let item = id ? arr.find(x => x.id === id) : { id: uid() };
  if (!item) return;
  const formData = new FormData(event.target);
  config.forEach(([key, , type]) => {
    const value = formData.get(key);
    item[key] = type === "money" ? raw(value) : value;
  });
  if (!id) arr.unshift(item);
  await saveData();
  $("editDialog").close();
  renderAll();
}

async function deleteEditingItem() {
  const { kind, id } = editing;
  if (!id) return;
  if (!confirm(tr("common.confirmDelete"))) return;
  const key = collectionMap[kind];
  state[key] = state[key].filter(x => x.id !== id);
  await saveData();
  $("editDialog").close();
  renderAll();
}

function add(kind) {
  openEdit(kind, null);
}

function labelOf(kind) {
  return tr(`kinds.${kind}`);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function recordMonthlySnapshot() {
  const t = totals();
  const key = monthKey();
  const existing = state.history.find(x => x.month === key);
  if (existing) {
    existing.netWorth = t.netWorth;
  } else {
    state.history.push({ id: uid(), month: key, netWorth: t.netWorth });
  }
  state.journal.unshift({ id: uid(), date: today(), title: tr("journal.snapshotTitle"), amount: t.netWorth, note: tr("journal.snapshotNote", { month: key }) });
  await saveAndRender();
  alert(tr("journal.snapshotDone"));
}

function exportData() {
  const payload = clone(state);
  payload.exportedAt = new Date().toISOString();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `fire-os-backup-${today()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!confirm(tr("common.importConfirm"))) return;
      state = normalizeState(imported);
      state.profile = { uid: user.uid, email: user.email, name: user.displayName, photo: user.photoURL };
      await saveAndRender();
      alert(tr("common.importDone"));
    } catch (error) {
      alert(tr("common.importError"));
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function setupPWA() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(console.warn);
  }
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    const btn = $("installBtn");
    if (btn) btn.classList.remove("hidden");
  });
  const installBtn = $("installBtn");
  if (installBtn) {
    installBtn.onclick = async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installBtn.classList.add("hidden");
    };
  }
}

function bind() {
  document.querySelectorAll(".nav").forEach(button => {
    button.onclick = () => {
      document.querySelectorAll(".nav").forEach(x => x.classList.remove("active"));
      document.querySelectorAll(".page").forEach(x => x.classList.remove("active-page"));
      button.classList.add("active");
      $(button.dataset.page).classList.add("active-page");
      $("pageTitle").textContent = tr(`page.${button.dataset.page}`);
      renderCharts();
    };
  });
  $("googleLoginBtn").onclick = () => signInWithPopup(auth, provider);
  $("logoutBtn").onclick = () => signOut(auth);
  $("saveBtn").onclick = async () => { await saveData(); alert(tr("common.synced")); };
  $("addAssetBtn").onclick = () => add("asset");
  $("addLiabilityBtn").onclick = () => add("liability");
  $("addInvestmentBtn").onclick = () => add("investment");
  $("addIncomeBtn").onclick = () => add("income");
  $("addExpenseBtn").onclick = () => add("expense");
  $("addJournalBtn").onclick = () => add("journal");
  $("snapshotBtn").onclick = recordMonthlySnapshot;
  $("exportBtn").onclick = exportData;
  $("importBtn").onclick = () => $("importFile").click();
  $("importFile").onchange = importData;
  $("editForm").onsubmit = submitEdit;
  $("deleteDialogBtn").onclick = deleteEditingItem;
  $("fireGoalInput").oninput = e => { state.fire.goal = raw(e.target.value); e.target.value = nf(state.fire.goal); renderAll(); saveData(); };
  $("monthlyInvestInput").oninput = e => { state.fire.monthlyInvestment = raw(e.target.value); e.target.value = nf(state.fire.monthlyInvestment); renderAll(); saveData(); };
  $("returnInput").oninput = e => { state.fire.annualReturn = raw(e.target.value); renderAll(); saveData(); };
  $("displayNameInput").oninput = e => { state.settings.displayName = e.target.value; renderUser(); saveData(); };
  const setLanguage = value => { state.settings.language = value; localStorage.setItem("fireos_lang", value); applyI18n(); renderAll(); saveData(); };
  if ($("languageSelect")) $("languageSelect").onchange = e => setLanguage(e.target.value);
  if ($("languageSelectTop")) $("languageSelectTop").onchange = e => setLanguage(e.target.value);
  $("emergencyMonthsInput").oninput = e => { state.settings.emergencyMonths = raw(e.target.value); renderAI(); saveData(); };
  $("resetDemoBtn").onclick = async () => {
    if (confirm(tr("common.resetConfirm"))) {
      state = clone(defaultData);
      state.profile = { uid: user.uid, email: user.email, name: user.displayName, photo: user.photoURL };
      await saveAndRender();
    }
  };
}

bind();
applyI18n();
setupPWA();

onAuthStateChanged(auth, async currentUser => {
  user = currentUser;
  if (currentUser) {
    $("loginView").classList.add("hidden");
    $("appView").classList.remove("hidden");
    await loadData();
  } else {
    $("loginView").classList.remove("hidden");
    $("appView").classList.add("hidden");
  }
});
