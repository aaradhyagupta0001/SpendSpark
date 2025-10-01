// SpendSpark - Expense Tracker

// --- Tab and DOM Setup ---
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const dailyPanel = document.getElementById('tab-daily');
const monthlyPanel = document.getElementById('tab-monthly');
const profilePanel = document.getElementById('tab-profile');

// Daily tab elements
const form = document.getElementById('expense-form');
const nameInput = document.getElementById('expense-name');
const amountInput = document.getElementById('expense-amount');
const list = document.getElementById('expense-list');
const totalDisplay = document.getElementById('total-amount');
const chartCanvas = document.getElementById('expense-chart');

// Monthly tab elements
const monthlyList = document.getElementById('monthly-list');
const monthlyTotal = document.getElementById('monthly-total');
const monthlyChartCanvas = document.getElementById('monthly-chart');

// Profile tab
const profileArea = document.getElementById('profile-area');

// --- Auth & Data ---
let expenses = [];
let chart = null;
let monthlyChart = null;
let user = null;

function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function getMonthStr() {
  const d = new Date();
  return d.toISOString().slice(0, 7);
}

function getUser() {
  const u = localStorage.getItem('spendspark-user');
  return u ? JSON.parse(u) : null;
}
function setUser(u) {
  if (u) localStorage.setItem('spendspark-user', JSON.stringify(u));
  else localStorage.removeItem('spendspark-user');
  user = u;
}

function getExpenseKey() {
  return user ? `spendspark-expenses-${user.username}` : null;
}

function loadExpenses() {
  if (!user) { expenses = []; return; }
  const data = localStorage.getItem(getExpenseKey());
  if (data) {
    expenses = JSON.parse(data);
  } else {
    expenses = [];
  }
}

function saveExpenses() {
  if (!user) return;
  localStorage.setItem(getExpenseKey(), JSON.stringify(expenses));
}

// --- Tabs ---
function showTab(tab) {
  tabBtns.forEach(b => b.classList.remove('active'));
  tabPanels.forEach(panel => panel.style.display = 'none');
  const btn = Array.from(tabBtns).find(b => b.dataset.tab === tab);
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('tab-' + tab);
  if (panel) panel.style.display = '';
  if (tab === 'profile') renderProfile();
  if (tab === 'monthly') renderMonthly();
  if (tab === 'daily') updateUI();
}
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});
// Show daily tab by default
showTab('daily');

// --- Daily Tab Logic ---
function updateTotal() {
  const today = getTodayStr();
  const total = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);
  totalDisplay.textContent = total.toFixed(2);
}

function renderList() {
  list.innerHTML = '';
  const today = getTodayStr();
  expenses.filter(e => e.date === today).forEach((expense, idx) => {
    const emoji = getExpenseEmoji(expense.name);
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${emoji} ${expense.name}</span>
      <span>$${expense.amount.toFixed(2)} <button class="remove-btn" data-idx="${idx}">Remove</button></span>
    `;
    list.appendChild(li);
  });
}

function renderChart() {
  if (chart) chart.destroy();
  const pastelColors = [
    '#ffb6d5', '#b6e0fe', '#f9e7fe', '#e0f7fa', '#f6ad55', '#ecc94b', '#68d391', '#f687b3', '#a0aec0', '#63b3ed'
  ];
  const today = getTodayStr();
  const todayExpenses = expenses.filter(e => e.date === today);
  if (todayExpenses.length === 0) {
    chart = new Chart(chartCanvas, {
      type: 'pie',
      data: {
        labels: ['No expenses'],
        datasets: [{ data: [1], backgroundColor: ['#ffe0ec'] }]
      },
      options: {
        plugins: { legend: { display: false } },
        layout: { padding: 10 },
      }
    });
    return;
  }
  chart = new Chart(chartCanvas, {
    type: 'pie',
    data: {
      labels: todayExpenses.map(e => e.name),
      datasets: [{
        data: todayExpenses.map(e => e.amount),
        backgroundColor: todayExpenses.map((_, i) => pastelColors[i % pastelColors.length]),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 10,
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { color: '#e53e3e', font: { weight: 'bold' } } }
      },
      layout: { padding: 10 },
      elements: {
        arc: {
          borderRadius: 12,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowBlur: 16,
          shadowColor: '#ffb6d540',
        }
      }
    }
  });
}

function updateUI() {
  renderList();
  updateTotal();
  renderChart();
  form.style.display = user ? '' : 'none';
  if (!user) {
    list.innerHTML = '<li style="text-align:center; color:#e53e3e;">Please log in to add/view expenses.</li>';
    totalDisplay.textContent = '0.00';
    if (chart) chart.destroy();
  }
}

form.addEventListener('submit', e => {
  e.preventDefault();
  if (!user) return;
  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  if (!name || isNaN(amount) || amount <= 0) return;
  expenses.push({ name, amount, date: getTodayStr() });
  saveExpenses();
  updateUI();
  form.reset();
  nameInput.focus();
});

// (already handled above, remove duplicate)

// --- Monthly Tab Logic ---
function renderMonthly() {
  if (!user) {
    monthlyList.innerHTML = '<li style="text-align:center; color:#e53e3e;">Please log in to view expenses.</li>';
    monthlyTotal.textContent = '0.00';
    if (monthlyChart) monthlyChart.destroy();
    return;
  }
  const month = getMonthStr();
  const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(month));
  monthlyList.innerHTML = '';
  let total = 0;
  const catMap = {};
  monthExpenses.forEach((expense, idx) => {
    total += expense.amount;
    const emoji = getExpenseEmoji(expense.name);
    const li = document.createElement('li');
    li.innerHTML = `<span>${emoji} ${expense.name} <span style='color:#aaa;font-size:0.9em;'>(${expense.date})</span></span><span>$${expense.amount.toFixed(2)}</span>`;
    monthlyList.appendChild(li);
    // For chart
    catMap[expense.name] = (catMap[expense.name] || 0) + expense.amount;
  });
  monthlyTotal.textContent = total.toFixed(2);
  // Chart
  if (monthlyChart) monthlyChart.destroy();
  const pastelColors = [
    '#ffb6d5', '#b6e0fe', '#f9e7fe', '#e0f7fa', '#f6ad55', '#ecc94b', '#68d391', '#f687b3', '#a0aec0', '#63b3ed'
  ];
  if (monthExpenses.length === 0) {
    monthlyChart = new Chart(monthlyChartCanvas, {
      type: 'pie',
      data: {
        labels: ['No expenses'],
        datasets: [{ data: [1], backgroundColor: ['#ffe0ec'] }]
      },
      options: {
        plugins: { legend: { display: false } },
        layout: { padding: 10 },
      }
    });
    return;
  }
  monthlyChart = new Chart(monthlyChartCanvas, {
    type: 'pie',
    data: {
      labels: Object.keys(catMap),
      datasets: [{
        data: Object.values(catMap),
        backgroundColor: Object.keys(catMap).map((_, i) => pastelColors[i % pastelColors.length]),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 10,
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { color: '#e53e3e', font: { weight: 'bold' } } }
      },
      layout: { padding: 10 },
      elements: {
        arc: {
          borderRadius: 12,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowBlur: 16,
          shadowColor: '#ffb6d540',
        }
      }
    }
  });
}

// --- Profile/Login Logic ---
function renderProfile() {
  if (user) {
    profileArea.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:2.5em;">👤</div>
        <div style="font-size:1.2em; margin:0.5em 0;">Hello, <b>${user.username}</b>!</div>
        <button id="logout-btn" style="background:#e53e3e;color:#fff;border:none;border-radius:0.7em;padding:0.5em 1.2em;font-size:1em;cursor:pointer;">Log Out</button>
      </div>
    `;
    document.getElementById('logout-btn').onclick = () => {
      setUser(null);
      loadExpenses();
      updateUI();
      renderMonthly();
      renderProfile();
    };
  } else {
    profileArea.innerHTML = `
      <form id="login-form" style="display:flex;flex-direction:column;align-items:center;gap:1em;">
        <input id="login-username" type="text" placeholder="Username" required style="padding:0.7em 1em;border-radius:0.7em;border:1.5px solid #ffd6e0;font-size:1.1em;">
        <input id="login-password" type="password" placeholder="Password" required style="padding:0.7em 1em;border-radius:0.7em;border:1.5px solid #ffd6e0;font-size:1.1em;">
        <button type="submit" style="background:linear-gradient(90deg,#ffb6d5 0%,#b6e0fe 100%);color:#fff;border:none;border-radius:0.7em;padding:0.5em 1.2em;font-size:1.1em;font-weight:600;cursor:pointer;">Log In</button>
      </form>
      <div style="font-size:0.95em;color:#888;margin-top:0.7em;">(Demo: any username & password will work)</div>
    `;
    document.getElementById('login-form').onsubmit = e => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      if (!username || !password) return;
      setUser({ username });
      loadExpenses();
      updateUI();
      renderMonthly();
      renderProfile();
    };
  }
}

// --- Initial Load ---
user = getUser();
loadExpenses();
updateUI();
renderMonthly();
renderProfile();
// (removed duplicate event listener and initial load)
