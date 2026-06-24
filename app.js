// =======================
// グローバル変数
// =======================
let expenses = [];
let incomes = [];
let cashAccounts = [];
let investAccounts = [];
let assetsHistory = [];

let assetPieChart = null;
let assetLineChart = null;
let categoryPieChart = null;
let monthlyBarChart = null;

let calcTargetId = null;
let calcExpression = "";

// カレンダー用
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

// レポート用
let reportYear = new Date().getFullYear();
let reportMonth = new Date().getMonth() + 1;
let reportBarYear = new Date().getFullYear();

// デフォルト口座
let defaultCashAccountId = null;

// =======================
// データ保存・読み込み
// =======================
function saveData() {
  const data = {
    expenses,
    incomes,
    cashAccounts,
    investAccounts,
    assetsHistory,
    defaultCashAccountId,
  };

  localStorage.setItem("kakeiboData", JSON.stringify(data));

  // Firebase にも保存
  saveToFirebase();
}

function loadData() {
  const raw = localStorage.getItem("kakeiboData");
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    expenses = data.expenses || [];
    incomes = data.incomes || [];
    cashAccounts = data.cashAccounts || [];
    investAccounts = data.investAccounts || [];
    assetsHistory = data.assetsHistory || [];
    defaultCashAccountId = data.defaultCashAccountId || null;
  } catch (e) {
    console.error(e);
  }
}

// =======================
// 初期化
// =======================
document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().slice(0, 10);
  if (document.getElementById("expDate")) document.getElementById("expDate").value = today;
  if (document.getElementById("incDate")) document.getElementById("incDate").value = today;

  loadData();
  renderAll();
  showPage("input");
});

// =======================
// ページ切り替え
// =======================
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  const page = document.getElementById(id);
  if (page) page.classList.remove("hidden");
}

// =======================
// 入力タブ切り替え
// =======================
function switchInputTab(type) {
  const expPanel = document.getElementById("expInput");
  const incPanel = document.getElementById("incInput");
  const tabExp = document.getElementById("tabExp");
  const tabInc = document.getElementById("tabInc");

  if (type === "exp") {
    expPanel.classList.remove("hidden");
    incPanel.classList.add("hidden");
    tabExp.classList.add("active");
    tabInc.classList.remove("active");
  } else {
    expPanel.classList.add("hidden");
    incPanel.classList.remove("hidden");
    tabExp.classList.remove("active");
    tabInc.classList.add("active");
  }
}

// =======================
// カテゴリ選択
// =======================
function selectCategory(type, cat) {
  if (type === "exp") {
    document.getElementById("expCategory").value = cat;
  } else {
    document.getElementById("incCategory").value = cat;
  }

  document
    .querySelectorAll(`#${type === "exp" ? "expInput" : "incInput"} .cat-btn`)
    .forEach(btn => {
      btn.classList.toggle("selected", btn.getAttribute("data-cat") === cat);
    });
}

// =======================
// 口座選択ドロップダウン
// =======================
function renderAccountSelects() {
  const expSel  = document.getElementById("expAccount");
  const incSel  = document.getElementById("incAccount");
  const editSel = document.getElementById("editAccount");

  if (!expSel || !incSel) return;

  // デフォルト未設定なら最初の口座を設定
  if (!defaultCashAccountId && cashAccounts.length > 0) {
    defaultCashAccountId = cashAccounts[0].id;
  }

  expSel.innerHTML  = "";
  incSel.innerHTML  = "";
  if (editSel) editSel.innerHTML = "";

  cashAccounts.forEach(acc => {
    // 支出
    const opt1 = document.createElement("option");
    opt1.value = acc.id;
    opt1.textContent = acc.name;
    if (acc.id === defaultCashAccountId) opt1.selected = true;
    expSel.appendChild(opt1);

    // 収入
    const opt2 = document.createElement("option");
    opt2.value = acc.id;
    opt2.textContent = acc.name;
    if (acc.id === defaultCashAccountId) opt2.selected = true;
    incSel.appendChild(opt2);

    // 編集モーダル（初期リスト用）
    if (editSel) {
      const opt3 = document.createElement("option");
      opt3.value = acc.id;
      opt3.textContent = acc.name;
      editSel.appendChild(opt3);
    }
  });
}

// =======================
// デフォルト口座設定
// =======================
function setDefaultCashAccount() {
  const id = Number(document.getElementById("cashEditId").value);
  defaultCashAccountId = id;
  saveData();
  renderAll();
  alert("この口座をデフォルトに設定しました");
}

// =======================
// 電卓
// =======================
function openCalc(targetId) {
  calcTargetId = targetId;
  const input = document.getElementById(targetId);
  calcExpression = input.value ? String(input.value).replace(/,/g, "") : "";
  document.getElementById("calcDisplay").value = calcExpression;
  document.getElementById("calcModal").classList.add("show");
}

function closeCalc() {
  document.getElementById("calcModal").classList.remove("show");
  calcTargetId = null;
  calcExpression = "";
}

function pressNum(n) {
  calcExpression += n;
  document.getElementById("calcDisplay").value = calcExpression;
}

function pressOp(op) {
  if (!calcExpression) return;
  calcExpression += op;
  document.getElementById("calcDisplay").value = calcExpression;
}

function clearCalc() {
  calcExpression = "";
  document.getElementById("calcDisplay").value = "";
}

function backspace() {
  calcExpression = calcExpression.slice(0, -1);
  document.getElementById("calcDisplay").value = calcExpression;
}

function calcEqual() {
  try {
    const val = Function(`"use strict";return (${calcExpression})`)();
    calcExpression = Math.round(val).toString();
    document.getElementById("calcDisplay").value = calcExpression;
  } catch (e) {
    console.error(e);
  }
}

function applyAmount() {
  if (!calcTargetId) return;
  const num = Number(calcExpression || "0");
  document.getElementById(calcTargetId).value = num;
  closeCalc();
}

// =======================
// 家計簿：支出・収入追加（複数口座対応）
// =======================
function addExpense() {
  const amount = Number(document.getElementById("expAmount").value || "0");
  const category = document.getElementById("expCategory").value || "未分類";
  const date = document.getElementById("expDate").value;
  const memo = document.getElementById("expMemo").value || "";
  const accountId = Number(document.getElementById("expAccount").value);

  if (!amount || !date) return;

  const acc = cashAccounts.find(a => a.id === accountId);
  if (acc) {
    acc.balance -= amount;
  }

  expenses.push({
    id: Date.now(),
    amount,
    category,
    date,
    memo,
    accountId,
  });

  document.getElementById("expAmount").value = "";
  document.getElementById("expMemo").value = "";
  document.getElementById("expCategory").value = "";
  document.querySelectorAll("#expInput .cat-btn").forEach(btn => btn.classList.remove("selected"));

  saveData();
  recordAssetSnapshot();
  renderAll();
  alert("保存しました");
}

function addIncome() {
  const amount = Number(document.getElementById("incAmount").value || "0");
  const category = document.getElementById("incCategory").value || "未分類";
  const date = document.getElementById("incDate").value;
  const memo = document.getElementById("incMemo").value || "";
  const accountId = Number(document.getElementById("incAccount").value);

  if (!amount || !date) return;

  const acc = cashAccounts.find(a => a.id === accountId);
  if (acc) {
    acc.balance += amount;
  }

  incomes.push({
    id: Date.now(),
    amount,
    category,
    date,
    memo,
    accountId,
  });

  document.getElementById("incAmount").value = "";
  document.getElementById("incMemo").value = "";
  document.getElementById("incCategory").value = "";
  document.querySelectorAll("#incInput .cat-btn").forEach(btn => btn.classList.remove("selected"));

  saveData();
  recordAssetSnapshot();
  renderAll();
  alert("保存しました");
}

// =======================
// 現金・銀行
// =======================
function openCashModal() {
  document.getElementById("cashName").value = "";
  document.getElementById("cashBalance").value = "";
  document.getElementById("cashModal").classList.add("show");
}

function closeCashModal() {
  document.getElementById("cashModal").classList.remove("show");
}

function saveCash() {
  const name = document.getElementById("cashName").value || "名称未設定";
  const balance = Number(document.getElementById("cashBalance").value || "0");

  cashAccounts.push({
    id: Date.now(),
    name,
    balance,
  });

  if (!defaultCashAccountId) {
    defaultCashAccountId = cashAccounts[0].id;
  }

  saveData();
  recordAssetSnapshot();
  renderAll();
  alert("保存しました");
  closeCashModal();
}

function openCashEditModal(id) {
  const acc = cashAccounts.find(a => a.id === id);
  if (!acc) return;

  document.getElementById("cashEditId").value = acc.id;
  document.getElementById("cashEditName").value = acc.name;
  document.getElementById("cashEditBalance").value = acc.balance;

  document.getElementById("cashEditModal").classList.add("show");
}

function closeCashEditModal() {
  document.getElementById("cashEditModal").classList.remove("show");
}

function saveCashEdit() {
  const id = Number(document.getElementById("cashEditId").value);
  const name = document.getElementById("cashEditName").value || "名称未設定";
  const balance = Number(document.getElementById("cashEditBalance").value || "0");

  const idx = cashAccounts.findIndex(a => a.id === id);
  if (idx >= 0) {
    cashAccounts[idx].name = name;
    cashAccounts[idx].balance = balance;
  }

  saveData();
  recordAssetSnapshot();
  renderAll();
  alert("保存しました");
  closeCashEditModal();
}

function deleteCash() {
  const id = Number(document.getElementById("cashEditId").value);

  if (defaultCashAccountId === id) {
    const remain = cashAccounts.filter(a => a.id !== id);
    defaultCashAccountId = remain.length > 0 ? remain[0].id : null;
  }

  cashAccounts = cashAccounts.filter(a => a.id !== id);

  saveData();
  recordAssetSnapshot();
  renderAll();
  alert("削除しました");
  closeCashEditModal();
}

// =======================
// 現金リスト表示
// =======================
function renderCashList() {
  const area = document.getElementById("cashList");
  if (!area) return;

  area.innerHTML = "";

  if (cashAccounts.length === 0) {
    area.innerHTML = "<p>まだ登録がありません</p>";
    return;
  }

  cashAccounts.forEach(c => {
    const star = c.id === defaultCashAccountId ? "⭐" : "";
    area.innerHTML += `
      <div class="day-item" onclick="openCashEditModal(${c.id})">
        💰 <strong>${c.name}</strong> ${star}<br>
        残高：${c.balance.toLocaleString()}円
      </div>
    `;
  });
}

// =======================
// 投資口座
// =======================
function openInvestModal() {
  document.getElementById("investName").value = "";
  document.getElementById("investTotal").value = "";
  document.getElementById("investValue").value = "";
  document.getElementById("investModal").classList.add("show");
}

function closeInvestModal() {
  document.getElementById("investModal").classList.remove("show");
}

function saveInvest() {
  const name = document.getElementById("investName").value || "名称未設定";
  const totalInvest = Number(document.getElementById("investTotal").value || "0");
  const currentValue = Number(document.getElementById("investValue").value || "0");

  investAccounts.push({
    id: Date.now(),
    name,
    totalInvest,
    currentValue,
  });

  saveData();
  recordAssetSnapshot();
  renderAll();
  alert("保存しました");
  closeInvestModal();
}

function openInvestEditModal(id) {
  const acc = investAccounts.find(a => a.id === id);
  if (!acc) return;

  document.getElementById("investEditId").value = acc.id;
  document.getElementById("investEditName").value = acc.name;
  document.getElementById("investEditTotal").value = acc.totalInvest;
  document.getElementById("investEditValue").value = acc.currentValue;

  document.getElementById("investEditModal").classList.add("show");
}

function closeInvestEditModal() {
  document.getElementById("investEditModal").classList.remove("show");
}

function saveInvestEdit() {
  const id = Number(document.getElementById("investEditId").value);
  const name = document.getElementById("investEditName").value || "名称未設定";
  const totalInvest = Number(document.getElementById("investEditTotal").value || "0");
  const currentValue = Number(document.getElementById("investEditValue").value || "0");

  const idx = investAccounts.findIndex(a => a.id === id);
  if (idx >= 0) {
    investAccounts[idx].name = name;
    investAccounts[idx].totalInvest = totalInvest;
    investAccounts[idx].currentValue = currentValue;
  }

  saveData();
  recordAssetSnapshot();
  renderAll();
  alert("保存しました");
  closeInvestEditModal();
}

function deleteInvest() {
  const id = Number(document.getElementById("investEditId").value);
  investAccounts = investAccounts.filter(a => a.id !== id);

  saveData();
  recordAssetSnapshot();
  renderAll();
  alert("削除しました");
  closeInvestEditModal();
}

function renderInvestList() {
  const area = document.getElementById("investList");
  if (!area) return;

  area.innerHTML = "";

  if (investAccounts.length === 0) {
    area.innerHTML = "<p>まだ登録がありません</p>";
    return;
  }

  investAccounts.forEach(n => {
    const profit = n.currentValue - n.totalInvest;
    const color = profit >= 0 ? "#3498db" : "#e74c3c";

    area.innerHTML += `
      <div class="day-item" onclick="openInvestEditModal(${n.id})">
        📈 <strong>${n.name}</strong><br>
        投資額：${n.totalInvest.toLocaleString()}円<br>
        評価額：${n.currentValue.toLocaleString()}円<br>
        含み益：<span style="color:${color};">${profit.toLocaleString()}円</span>
      </div>
    `;
  });
}

// =======================
// 総資産（収支反映版）
// =======================
function getTotalIncome() {
  return incomes.reduce((a, b) => a + (b.amount || 0), 0);
}

function getTotalExpense() {
  return expenses.reduce((a, b) => a + (b.amount || 0), 0);
}

function getTotalCash() {
  return cashAccounts.reduce((a, b) => a + (b.balance || 0), 0);
}

function getTotalInvest() {
  return investAccounts.reduce((a, b) => a + (b.currentValue || 0), 0);
}

function getTotalAsset() {
  // 現金 + 投資だけで十分（収支は口座残高に反映済み）
  return getTotalCash() + getTotalInvest();
}

// =======================
// 総資産スナップショット（グラフ用）
// =======================
function recordAssetSnapshot() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const total = getTotalAsset();

  assetsHistory = assetsHistory.filter(h => !(h.year === year && h.month === month));

  assetsHistory.push({
    id: Date.now(),
    year,
    month,
    total,
  });

  saveData();
}

// =======================
// 資産配分グラフ（円）
// =======================
function renderAssetPie() {
  const ctx = document.getElementById("assetPie");
  if (!ctx) return;

  const cash = getTotalCash();
  const invest = getTotalInvest();
  const total = cash + invest;

  if (assetPieChart) assetPieChart.destroy();

  if (total === 0) {
    assetPieChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["資産なし"],
        datasets: [{ data: [1], backgroundColor: ["#ccc"] }],
      },
      options: { plugins: { legend: { position: "bottom" } } },
    });
    return;
  }

  assetPieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["現金", "投資"],
      datasets: [{
        data: [cash, invest],
        backgroundColor: ["#36a2eb", "#ffcd56"],
      }],
    },
    options: {
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.raw;
              const percent = ((value / total) * 100).toFixed(1);
              return `${context.label}: ${value.toLocaleString()}円 (${percent}%)`;
            },
          },
        },
      },
    },
  });
}

// =======================
// 総資産推移グラフ（折れ線）
// =======================
function renderAssetLine() {
  const ctx = document.getElementById("assetLine");
  if (!ctx) return;

  const sorted = [...assetsHistory].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  const labels = sorted.map(h => `${h.year}/${h.month}`);
  const data = sorted.map(h => h.total);

  if (assetLineChart) assetLineChart.destroy();

  assetLineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "総資産",
        data,
        borderColor: "#36a2eb",
        backgroundColor: "rgba(54,162,235,0.2)",
        tension: 0.2,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          ticks: {
            callback: value => value.toLocaleString() + "円",
          },
        },
      },
    },
  });
}

// =======================
// カレンダー：月移動
// =======================
function prevMonth() {
  currentMonth--;
  if (currentMonth === 0) {
    currentMonth = 12;
    currentYear--;
  }
  renderAll();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth === 13) {
    currentMonth = 1;
    currentYear++;
  }
  renderAll();
}

// =======================
// カレンダー描画
// =======================
function renderCalendar() {
  const area = document.getElementById("calendarArea");
  const monthSummary = document.getElementById("monthSummary");
  const monthList = document.getElementById("monthList");
  const title = document.getElementById("calendarTitle");
  if (!area) return;

  const year = currentYear;
  const month = currentMonth;

  title.textContent = `${year}年${month}月`;

  const ym = `${year}-${String(month).padStart(2, "0")}`;

  const monthExp = expenses.filter(e => e.date.startsWith(ym));
  const monthInc = incomes.filter(i => i.date.startsWith(ym));

  const totalExp = monthExp.reduce((a, b) => a + b.amount, 0);
  const totalInc = monthInc.reduce((a, b) => a + b.amount, 0);

  monthSummary.innerHTML = `
    <p>${year}年${month}月</p>
    <p>収入：${totalInc.toLocaleString()}円　支出：${totalExp.toLocaleString()}円</p>
    <p>収支：${(totalInc - totalExp).toLocaleString()}円</p>
  `;

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startWeek = firstDay.getDay();
  const totalDays = lastDay.getDate();

  let html = `<div class="calendar-grid">`;

  for (let i = 0; i < startWeek; i++) {
    html += `<div class="calendar-cell empty"></div>`;
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const dayExp = expenses.filter(e => e.date === dateStr);
    const dayInc = incomes.filter(i => i.date === dateStr);

    const expTotal = dayExp.reduce((a, b) => a + b.amount, 0);
    const incTotal = dayInc.reduce((a, b) => a + b.amount, 0);

    let icons = "";
    if (expTotal > 0) icons += `<div class="expense">−${expTotal.toLocaleString()}円</div>`;
    if (incTotal > 0) icons += `<div class="income">＋${incTotal.toLocaleString()}円</div>`;

    html += `
      <div class="calendar-cell" onclick="openDayDetail('${dateStr}')">
        <div class="calendar-day">${d}</div>
        <div class="calendar-icons">${icons}</div>
      </div>
    `;
  }

  html += `</div>`;
  area.innerHTML = html;

  monthList.innerHTML = "";
  [...monthExp.map(e => ({ ...e, type: "支出" })), ...monthInc.map(i => ({ ...i, type: "収入" }))]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(item => {
      monthList.innerHTML += `
        <div class="day-item">
          ${item.date}　${item.type}：${item.amount.toLocaleString()}円（${item.category}）
          <button onclick="openEditModal(${item.id}, '${item.type}')">編集</button>
          <button onclick="deleteEditFromList(${item.id}, '${item.type}')">削除</button><br>
          <span>${item.memo || ""}</span>
        </div>
      `;
    });
}

// =======================
// 日別明細モーダル
// =======================
function openDayDetail(dateStr) {
  const list = [
    ...expenses.filter(e => e.date === dateStr).map(e => ({ ...e, type: "支出" })),
    ...incomes.filter(i => i.date === dateStr).map(i => ({ ...i, type: "収入" }))
  ].sort((a, b) => a.id - b.id);

  let html = `<h3>${dateStr} の明細</h3>`;

  if (list.length === 0) {
    html += `<p>データなし</p>`;
  } else {
    list.forEach(item => {
      html += `
        <div class="day-item">
          ${item.type}：${item.amount.toLocaleString()}円（${item.category}）<br>
          <span>${item.memo || ""}</span><br>
          <button onclick="openEditModal(${item.id}, '${item.type}')">編集</button>
          <button onclick="deleteEditFromList(${item.id}, '${item.type}')">削除</button>
        </div>
      `;
    });
  }

  document.getElementById("dayDetailContent").innerHTML = html;
  document.getElementById("dayDetailModal").classList.add("show");
}

function closeDayDetail() {
  document.getElementById("dayDetailModal").classList.remove("show");
}

// =======================
// 編集モーダル
// =======================
function openEditModal(id, type) {
  let item;

  if (type === "支出") {
    item = expenses.find(e => e.id === id);
  } else {
    item = incomes.find(i => i.id === id);
  }
  if (!item) return;

  document.getElementById("editId").value = id;
  document.getElementById("editType").value = type;
  document.getElementById("editAmount").value = item.amount;

// ★ カテゴリをプルダウン化
renderEditCategorySelect(item.category);

document.getElementById("editDate").value = item.date;
document.getElementById("editMemo").value = item.memo;

  const sel = document.getElementById("editAccount");
  sel.innerHTML = "";
  cashAccounts.forEach(acc => {
    const opt = document.createElement("option");
    opt.value = acc.id;
    opt.textContent = acc.name;
    if (acc.id === item.accountId) opt.selected = true;
    sel.appendChild(opt);
  });

  document.getElementById("editModal").classList.add("show");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("show");
}

// =======================
// 編集保存（口座差分反映）
// =======================
function saveEdit() {
  const id = Number(document.getElementById("editId").value);
  const type = document.getElementById("editType").value;

  const amount = Number(document.getElementById("editAmount").value || "0");
  const category = document.getElementById("editCategory").value || "未分類";
  const date = document.getElementById("editDate").value;
  const memo = document.getElementById("editMemo").value || "";
  const newAccountId = Number(document.getElementById("editAccount").value);

  if (type === "支出") {
    const old = expenses.find(e => e.id === id);
    const diff = amount - old.amount;

    if (old.accountId !== newAccountId) {
      const oldAcc = cashAccounts.find(a => a.id === old.accountId);
      const newAcc = cashAccounts.find(a => a.id === newAccountId);
      if (oldAcc) oldAcc.balance += old.amount;
      if (newAcc) newAcc.balance -= amount;
    } else {
      const acc = cashAccounts.find(a => a.id === newAccountId);
      if (acc) acc.balance -= diff;
    }

    old.amount = amount;
    old.category = category;
    old.date = date;
    old.memo = memo;
    old.accountId = newAccountId;

  } else {
    const old = incomes.find(i => i.id === id);
    const diff = amount - old.amount;

    if (old.accountId !== newAccountId) {
      const oldAcc = cashAccounts.find(a => a.id === old.accountId);
      const newAcc = cashAccounts.find(a => a.id === newAccountId);
      if (oldAcc) oldAcc.balance -= old.amount;
      if (newAcc) newAcc.balance += amount;
    } else {
      const acc = cashAccounts.find(a => a.id === newAccountId);
      if (acc) acc.balance += diff;
    }

    old.amount = amount;
    old.category = category;
    old.date = date;
    old.memo = memo;
    old.accountId = newAccountId;
  }

  saveData();
  recordAssetSnapshot();
  renderAll();
  closeEditModal();
  alert("保存しました");
}

// =======================
// 削除（口座反映）
// =======================
function deleteEdit() {
  const id = Number(document.getElementById("editId").value);
  const type = document.getElementById("editType").value;

  if (type === "支出") {
    const old = expenses.find(e => e.id === id);
    const acc = cashAccounts.find(a => a.id === old.accountId);
    if (acc) acc.balance += old.amount;
    expenses = expenses.filter(e => e.id !== id);
  } else {
    const old = incomes.find(i => i.id === id);
    const acc = cashAccounts.find(a => a.id === old.accountId);
    if (acc) acc.balance -= old.amount;
    incomes = incomes.filter(i => i.id !== id);
  }

  saveData();
  recordAssetSnapshot();
  renderAll();
  closeEditModal();
  alert("削除しました");
}

function deleteEditFromList(id, type) {
  if (type === "支出") {
    const old = expenses.find(e => e.id === id);
    const acc = cashAccounts.find(a => a.id === old.accountId);
    if (acc) acc.balance += old.amount;
    expenses = expenses.filter(e => e.id !== id);
  } else {
    const old = incomes.find(i => i.id === id);
    const acc = cashAccounts.find(a => a.id === old.accountId);
    if (acc) acc.balance -= old.amount;
    incomes = incomes.filter(i => i.id !== id);
  }

  saveData();
  recordAssetSnapshot();
  renderAll();
  alert("削除しました");
}

// =======================
// レポート：年間サマリー
// =======================
function renderReportYearSummary() {
  const year = reportYear;
  document.getElementById("reportYearTitle").textContent = `${year}年`;

  const yearExp = expenses.filter(e => e.date.startsWith(`${year}-`));
  const yearInc = incomes.filter(i => i.date.startsWith(`${year}-`));

  const totalExp = yearExp.reduce((a, b) => a + b.amount, 0);
  const totalInc = yearInc.reduce((a, b) => a + b.amount, 0);

  document.getElementById("reportYearSummary").innerHTML = `
    <p>収入：${totalInc.toLocaleString()}円</p>
    <p>支出：${totalExp.toLocaleString()}円</p>
    <p>収支：${(totalInc - totalExp).toLocaleString()}円</p>
  `;
}

function prevReportYear() {
  reportYear--;
  renderAll();
}

function nextReportYear() {
  reportYear++;
  renderAll();
}

// =======================
// レポート：月別カテゴリ円グラフ
// =======================
function renderCategoryPie() {
  const ctx = document.getElementById("categoryPie");
  if (!ctx) return;

  const year = reportYear;
  const month = reportMonth;

  document.getElementById("reportMonthTitle").textContent =
    `${year}年 ${month}月`;

  const ym = `${year}-${String(month).padStart(2, "0")}`;

  const monthExp = expenses.filter(e => e.date.startsWith(ym));

  const categoryTotals = {};
  monthExp.forEach(e => {
    if (!categoryTotals[e.category]) categoryTotals[e.category] = 0;
    categoryTotals[e.category] += e.amount;
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  if (categoryPieChart) categoryPieChart.destroy();

  if (labels.length === 0) {
    categoryPieChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["データなし"],
        datasets: [{ data: [1], backgroundColor: ["#ccc"] }],
      },
      options: { plugins: { legend: { position: "bottom" } } },
    });
    return;
  }

  categoryPieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map(() =>
          `hsl(${Math.random() * 360}, 70%, 60%)`
        ),
      }],
    },
    options: {
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
}

function prevReportMonth() {
  reportMonth--;
  if (reportMonth === 0) {
    reportMonth = 12;
    reportYear--;
  }
  renderAll();
}

function nextReportMonth() {
  reportMonth++;
  if (reportMonth === 13) {
    reportMonth = 1;
    reportYear++;
  }
  renderAll();
}

// =======================
// レポート：年間 月別支出棒グラフ
// =======================
function renderMonthlyBar() {
  const ctx = document.getElementById("monthlyBar");
  if (!ctx) return;

  const year = reportBarYear;
  document.getElementById("reportBarYearTitle").textContent = `${year}年`;

  const monthlyTotals = Array(12).fill(0);

  expenses.forEach(e => {
    if (e.date.startsWith(`${year}-`)) {
      const m = Number(e.date.slice(5, 7));
      monthlyTotals[m - 1] += e.amount;
    }
  });

  if (monthlyBarChart) monthlyBarChart.destroy();

  monthlyBarChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
      datasets: [{
        label: "支出",
        data: monthlyTotals,
        backgroundColor: "#ff6384",
      }],
    },
    options: {
      scales: {
        y: {
          ticks: {
            callback: value => value.toLocaleString() + "円",
          },
        },
      },
    },
  });
}

function prevReportBarYear() {
  reportBarYear--;
  renderAll();
}

function nextReportBarYear() {
  reportBarYear++;
  renderAll();
}

// =======================
// 総資産表示
// =======================
function renderTotalAsset() {
  const total = getTotalAsset();
  const area = document.getElementById("totalAssetDisplay");
  if (area) area.textContent = total.toLocaleString() + "円";
}

// 編集モーダル用カテゴリ一覧
const CATEGORY_LIST = [
  "食費","日用品","光熱費","住宅費","通信費","ファッション","子供","車",
  "医療費","美容","旅行","交通費","交際費","プレゼント","友達","娯楽",
  "会社","その他",
  "パパ給料","ママ給料","副業","賞与","臨時収入","子供貯金","その他収入"
];

function renderEditCategorySelect(selected) {
  const sel = document.getElementById("editCategory");
  sel.innerHTML = "";
  CATEGORY_LIST.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    if (cat === selected) opt.selected = true;
    sel.appendChild(opt);
  });
}

// =======================
// 全体描画
// =======================
function renderAll() {
  renderCashList();
  renderInvestList();
  renderAccountSelects();
  renderAssetPie();
  renderAssetLine();
  renderTotalAsset();
  renderCalendar();
  renderReportYearSummary();
  renderCategoryPie();
  renderMonthlyBar();
}

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

async function login() {
  const email = document.getElementById("loginEmail").value;
  const pass = document.getElementById("loginPass").value;
  await signInWithEmailAndPassword(auth, email, pass);
  alert("ログインしました");
}

async function signup() {
  const email = document.getElementById("loginEmail").value;
  const pass = document.getElementById("loginPass").value;
  await createUserWithEmailAndPassword(auth, email, pass);
  alert("アカウントを作成しました");
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("ログイン中:", user.email);
    await loadFromFirebase();
  }
});

import {
  doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

async function saveToFirebase() {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "kakeibo", user.uid);

  await setDoc(ref, {
    expenses,
    incomes,
    cashAccounts,
    investAccounts,
    assetsHistory,
    defaultCashAccountId,
    updatedAt: Date.now()
  });
}

async function loadFromFirebase() {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "kakeibo", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();

    expenses = data.expenses || [];
    incomes = data.incomes || [];
    cashAccounts = data.cashAccounts || [];
    investAccounts = data.investAccounts || [];
    assetsHistory = data.assetsHistory || [];
    defaultCashAccountId = data.defaultCashAccountId || null;

    saveData(); // ローカルにも保存
    renderAll();
  }
}
