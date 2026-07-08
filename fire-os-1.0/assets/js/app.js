import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, addDoc, getDocs, deleteDoc as deleteFirestoreDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

let currentUser = null;
let records = [];
let charts = {};

const moneyIds = ["assetStocks","assetCash","assetRealEstate","assetOther","debtMortgage","debtLoan","debtCar","debtCreditCard","incomeSalary","incomeRent","incomeDividend","incomeOther","expenseLiving","expenseHousing","expenseOther","fireTarget","monthlyInvestment","recordAssets","recordDebt","recordIncome","recordExpense"];
const dashboardIds = moneyIds.filter(id => !id.startsWith("record")).concat(["annualReturn"]);

const $ = id => document.getElementById(id);
const moneyValue = v => Number(String(v || "").replace(/,/g, "").replace(/[^\d.-]/g, "")) || 0;
const num = id => moneyValue($(id)?.value);
const money = v => "NT$" + Math.round(v).toLocaleString("zh-TW");
const plain = v => Math.round(v).toLocaleString("zh-TW");
const setText = (id, text) => { if ($(id)) $(id).textContent = text; };

function formatMoneyInput(input){
  const raw = input.value.replace(/,/g, "").replace(/[^\d]/g, "");
  input.value = raw === "" ? "" : Number(raw).toLocaleString("zh-TW");
}

function snapshot(){
  const totalAssets = num("assetStocks") + num("assetCash") + num("assetRealEstate") + num("assetOther");
  const totalDebt = num("debtMortgage") + num("debtLoan") + num("debtCar") + num("debtCreditCard");
  const totalIncome = num("incomeSalary") + num("incomeRent") + num("incomeDividend") + num("incomeOther");
  const totalExpense = num("expenseLiving") + num("expenseHousing") + num("expenseOther");
  const passiveIncome = num("incomeRent") + num("incomeDividend");
  return { totalAssets, totalDebt, netWorth: totalAssets - totalDebt, totalIncome, totalExpense, passiveIncome, cashFlow: totalIncome - totalExpense };
}

function calcFireDate(current, target, monthlyInvestment, annualReturn){
  if (current >= target) return { months: 0, label: "已達成" };
  if (monthlyInvestment <= 0 && annualReturn <= 0) return { months: null, label: "無法估算" };
  let balance = current;
  let months = 0;
  const r = annualReturn / 100 / 12;
  while (balance < target && months < 1200){
    balance = balance * (1 + r) + monthlyInvestment;
    months++;
  }
  if (months >= 1200) return { months: null, label: "超過 100 年" };
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return { months, label: `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,"0")}` };
}

function getDashboardData(){
  const data = {};
  dashboardIds.forEach(id => data[id] = $(id)?.value || "");
  return data;
}

function applyDashboardData(data = {}){
  Object.entries(data).forEach(([id, value]) => { if ($(id)) $(id).value = value; });
  moneyIds.forEach(id => { if ($(id)?.value) formatMoneyInput($(id)); });
}

async function saveDashboard(){
  if (!currentUser) return;
  setText("syncStatus", "同步中...");
  await setDoc(doc(db, "users", currentUser.uid, "data", "dashboard"), {
    ...getDashboardData(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  setText("syncStatus", "已同步到雲端");
}

async function loadDashboard(){
  const ref = doc(db, "users", currentUser.uid, "data", "dashboard");
  const snap = await getDoc(ref);
  if (snap.exists()) applyDashboardData(snap.data());
  else await saveDashboard();
  updateUI(false);
}

async function saveRecord(){
  if (!currentUser) return;
  const date = $("recordDate").value;
  if (!date) return alert("請選擇日期");
  await addDoc(collection(db, "users", currentUser.uid, "records"), {
    date,
    assets: $("recordAssets").value,
    debt: $("recordDebt").value,
    income: $("recordIncome").value,
    expense: $("recordExpense").value,
    note: $("recordNote").value,
    createdAt: serverTimestamp()
  });
  ["recordDate","recordAssets","recordDebt","recordIncome","recordExpense","recordNote"].forEach(id => $(id).value = "");
  await loadRecords();
}

async function loadRecords(){
  records = [];
  const q = query(collection(db, "users", currentUser.uid, "records"), orderBy("date", "desc"));
  const snaps = await getDocs(q);
  snaps.forEach(s => records.push({ id: s.id, ...s.data() }));
  renderRecords();
  renderCharts();
}

async function removeRecord(id){
  if (!confirm("確定刪除這筆紀錄？")) return;
  await deleteFirestoreDoc(doc(db, "users", currentUser.uid, "records", id));
  await loadRecords();
}

function updateUI(autoSave = true){
  const s = snapshot();
  const fireTarget = num("fireTarget");
  const firePercent = fireTarget ? Math.min(Math.max(s.netWorth / fireTarget * 100, 0), 100) : 0;
  const passiveCoverage = s.totalExpense ? Math.min(s.passiveIncome / s.totalExpense * 100, 100) : 0;
  const fire = calcFireDate(s.netWorth, fireTarget, num("monthlyInvestment"), Number($("annualReturn").value) || 0);

  setText("netWorthText", money(s.netWorth));
  setText("firePercentText", firePercent.toFixed(1) + "%");
  setText("fireDateText", "預估 FI：" + fire.label);
  setText("totalAssetsText", money(s.totalAssets));
  setText("totalDebtText", money(s.totalDebt));
  setText("cashFlowText", money(s.cashFlow));
  setText("passiveCoverageText", passiveCoverage.toFixed(1) + "%");
  $("cashFlowText").className = s.cashFlow >= 0 ? "green" : "red";
  $("fireProgressBar").style.width = firePercent + "%";

  const delta = records.length ? s.netWorth - (moneyValue(records[0].assets) - moneyValue(records[0].debt)) : 0;
  setText("netWorthDelta", records.length ? `較最近紀錄 ${delta >= 0 ? "+" : ""}${money(delta)}` : "新增月紀錄後會顯示變化");

  renderCoach();
  renderCharts();
  if (autoSave) debounceSave();
}

let saveTimer;
function debounceSave(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveDashboard, 700); }

function renderRecords(){
  const box = $("recordList");
  if (!records.length){ box.innerHTML = `<p class="muted">尚無紀錄。可以先用目前數字建立第一筆月紀錄。</p>`; return; }
  box.innerHTML = records.map(r => {
    const nw = moneyValue(r.assets) - moneyValue(r.debt);
    return `<div class="record-item">
      <div class="record-top"><strong>${r.date}</strong><span>${money(nw)}</span></div>
      <div class="record-line"><span>資產 ${r.assets || 0}</span><span>負債 ${r.debt || 0}</span></div>
      <div class="record-line"><span>收入 ${r.income || 0}</span><span>支出 ${r.expense || 0}</span></div>
      <p class="muted">${r.note || ""}</p>
      <button class="danger" data-delete="${r.id}">刪除</button>
    </div>`;
  }).join("");
  document.querySelectorAll("[data-delete]").forEach(btn => btn.onclick = () => removeRecord(btn.dataset.delete));
}

function renderCoach(){
  const s = snapshot();
  const savingsRate = s.totalIncome ? (s.cashFlow / s.totalIncome * 100) : 0;
  const fireTarget = num("fireTarget");
  const firePercent = fireTarget ? s.netWorth / fireTarget * 100 : 0;
  const extra = calcFireDate(s.netWorth, fireTarget, num("monthlyInvestment") + 10000, Number($("annualReturn").value) || 0);
  const base = calcFireDate(s.netWorth, fireTarget, num("monthlyInvestment"), Number($("annualReturn").value) || 0);
  const advance = base.months && extra.months ? Math.max(base.months - extra.months, 0) : 0;
  const insights = [
    `目前淨資產為 <strong>${money(s.netWorth)}</strong>，FIRE 進度約 <strong>${firePercent.toFixed(1)}%</strong>。`,
    `本月現金流為 <strong>${money(s.cashFlow)}</strong>，儲蓄率約 <strong>${savingsRate.toFixed(1)}%</strong>。`,
    `若每月多投入 NT$10,000，預估可提前 <strong>${advance}</strong> 個月達成 FIRE。`,
    s.cashFlow >= 0 ? `現金流為正，狀態健康。下一步可以專注提高投資比例。` : `現金流為負，建議先檢查固定支出與非必要支出。`
  ];
  const html = insights.map(x => `<div class="insight">${x}</div>`).join("");
  setText("coachSummary", "");
  $("coachSummary").innerHTML = html;
  $("coachFull").innerHTML = html;
}

function renderCharts(){
  const make = (key, id, type, data, options = {}) => {
    const el = $(id); if (!el) return;
    if (charts[key]) charts[key].destroy();
    charts[key] = new Chart(el, { type, data, options });
  };
  const s = snapshot();
  make("asset", "assetChart", "doughnut", {
    labels: ["股票/ETF", "現金", "房地產", "其他"],
    datasets: [{ data: [num("assetStocks"), num("assetCash"), num("assetRealEstate"), num("assetOther")] }]
  });
  make("cash", "cashChart", "bar", {
    labels: ["收入", "支出", "現金流"],
    datasets: [{ label: "每月金額", data: [s.totalIncome, s.totalExpense, s.cashFlow] }]
  }, { scales: { y: { beginAtZero: true } } });
  const asc = [...records].sort((a,b) => String(a.date).localeCompare(String(b.date)));
  make("history", "historyChart", "line", {
    labels: asc.map(r => r.date),
    datasets: [{ label: "淨資產", data: asc.map(r => moneyValue(r.assets) - moneyValue(r.debt)), tension: .35 }]
  });
}

function prefillRecord(){
  const s = snapshot();
  $("recordDate").valueAsDate = new Date();
  $("recordAssets").value = plain(s.totalAssets);
  $("recordDebt").value = plain(s.totalDebt);
  $("recordIncome").value = plain(s.totalIncome);
  $("recordExpense").value = plain(s.totalExpense);
}

function exportData(){
  const data = { dashboard: getDashboardData(), records, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "fire-os-backup.json"; a.click(); URL.revokeObjectURL(a.href);
}

async function wipeData(){
  if (!currentUser || !confirm("確定清除你的雲端 Dashboard 資料？月紀錄會保留。")) return;
  await deleteDoc(doc(db, "users", currentUser.uid, "data", "dashboard"));
  location.reload();
}

function bindEvents(){
  $("googleLoginBtn").onclick = async () => { await signInWithPopup(auth, provider); };
  $("logoutBtn").onclick = async () => signOut(auth);
  $("saveDashboardBtn").onclick = saveDashboard;
  $("saveRecordBtn").onclick = saveRecord;
  $("prefillRecordBtn").onclick = prefillRecord;
  $("exportBtn").onclick = exportData;
  $("wipeBtn").onclick = wipeData;
  moneyIds.forEach(id => {
    const el = $(id);
    if (!el) return;
    el.setAttribute("inputmode", "numeric");
    el.addEventListener("input", () => { formatMoneyInput(el); if (!id.startsWith("record")) updateUI(); });
    if (el.value) formatMoneyInput(el);
  });
  $("annualReturn").addEventListener("input", () => updateUI());
  document.querySelectorAll(".nav").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".nav").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      $(btn.dataset.panel).classList.add("active");
      renderCharts();
    };
  });
}

function showLoggedIn(user){
  currentUser = user;
  $("loginView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  setText("userName", user.displayName || "User");
  setText("userEmail", user.email || "");
  setText("userTitle", `歡迎回來，${(user.displayName || "朋友").split(" ")[0]} 👋`);
  setText("syncStatus", "讀取雲端資料...");
  $("userPhoto").src = user.photoURL || "";
}

function showLoggedOut(){
  currentUser = null;
  $("dashboardView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
  setText("syncStatus", "尚未登入");
}

bindEvents();
onAuthStateChanged(auth, async user => {
  if (!user) return showLoggedOut();
  showLoggedIn(user);
  try { await loadDashboard(); await loadRecords(); setText("syncStatus", "已同步到雲端"); }
  catch (err) { console.error(err); alert("Firebase 讀寫失敗，請確認 Firestore Rules 與授權網域設定。\n" + err.message); setText("syncStatus", "同步失敗"); }
});
