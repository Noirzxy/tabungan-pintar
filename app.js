const STORAGE_KEY = "tabungan_pintar_state_v1";

const DEFAULT_STATE = {
  theme: "light",
  goals: [
    {
      id: "g1",
      title: "Dana Darurat (3 Bulan)",
      category: "DARURAT",
      targetAmount: 15000000,
      currentAmount: 6500000,
      color: "#059669",
      deadline: "2027-06-30"
    },
    {
      id: "g2",
      title: "Liburan Impian Jepang",
      category: "LIBURAN",
      targetAmount: 25000000,
      currentAmount: 8200000,
      color: "#2563EB",
      deadline: "2027-12-15"
    },
    {
      id: "g3",
      title: "Upgrade Gadget Kerja",
      category: "GADGET",
      targetAmount: 12000000,
      currentAmount: 4800000,
      color: "#7C3AED",
      deadline: "2027-03-01"
    },
    {
      id: "g4",
      title: "Tabungan Biaya Kursus",
      category: "PENDIDIKAN",
      targetAmount: 5000000,
      currentAmount: 3100000,
      color: "#D97706",
      deadline: "2027-02-01"
    }
  ],
  transactions: [
    {
      id: "t1",
      goalId: "g1",
      type: "DEPOSIT",
      amount: 1500000,
      note: "Setoran rutin alokasi darurat",
      createdAt: "2026-11-24T09:30:00"
    },
    {
      id: "t2",
      goalId: "g2",
      type: "DEPOSIT",
      amount: 1200000,
      note: "Gajian! Alokasi Tabungan Impian",
      createdAt: "2026-11-22T14:15:00"
    },
    {
      id: "t3",
      goalId: "g3",
      type: "DEPOSIT",
      amount: 800000,
      note: "Sisihkan bonus proyek",
      createdAt: "2026-11-18T19:00:00"
    },
    {
      id: "t4",
      goalId: "g4",
      type: "WITHDRAW",
      amount: 400000,
      note: "Pembayaran modul sertifikasi",
      createdAt: "2026-11-12T11:10:00"
    }
  ],
  reminders: [
    {
      id: "r1",
      title: "Setoran Tabungan Harian",
      amount: 20000,
      time: "08:00",
      frequency: "Harian",
      goalId: "g1",
      enabled: true
    },
    {
      id: "r2",
      title: "Alokasi Gajian Bulanan",
      amount: 1000000,
      time: "09:00",
      frequency: "Bulanan",
      goalId: "g2",
      enabled: true
    }
  ]
};

let state = loadState();
let currentFilter = "ALL";
let selectedColor = "#059669";
let txType = "DEPOSIT";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatRp(num) {
  return "Rp " + Math.round(num || 0).toLocaleString("id-ID");
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add("hidden"), 2600);
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme || "light");
  const isDark = state.theme === "dark";
  document.getElementById("icon-moon").classList.toggle("hidden", isDark);
  document.getElementById("icon-sun").classList.toggle("hidden", !isDark);
}

function switchScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(`screen-${name}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((n) => {
    n.classList.toggle("active", n.dataset.screen === name);
  });
  if (name === "analytics") renderAnalytics();
}

function renderAll() {
  applyTheme();
  renderHome();
  renderGoals();
  renderReminders();
  renderAnalytics();
  populateGoalSelects();
}

function renderHome() {
  const totalBalance = state.goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = state.goals.reduce((s, g) => s + g.targetAmount, 0);
  const pct = totalTarget > 0 ? Math.min(100, Math.round((totalBalance / totalTarget) * 100)) : 0;

  const totalIn = state.transactions
    .filter((t) => t.type === "DEPOSIT")
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = state.transactions
    .filter((t) => t.type === "WITHDRAW")
    .reduce((s, t) => s + t.amount, 0);

  document.getElementById("home-total-balance").textContent = formatRp(totalBalance);
  document.getElementById("home-goal-count").textContent = `${state.goals.length} Target Aktif`;
  document.getElementById("home-overall-progress").style.width = `${pct}%`;
  document.getElementById("home-progress-text").textContent = `${pct}% dari total target`;
  document.getElementById("home-target-total").textContent = `Target: ${formatRp(totalTarget)}`;
  document.getElementById("home-total-in").textContent = formatRp(totalIn);
  document.getElementById("home-total-out").textContent = formatRp(totalOut);

  const priorityEl = document.getElementById("home-priority-goals");
  if (state.goals.length === 0) {
    priorityEl.innerHTML = `<div class="muted">Buat target pertama untuk mulai menabung cerdas!</div>`;
  } else {
    priorityEl.innerHTML = state.goals
      .slice(0, 4)
      .map((g) => {
        const gPct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
        return `
          <div class="goal-mini-card" onclick="openTxForGoal('${g.id}')">
            <span class="goal-cat-badge" style="background:${g.color}">${g.category}</span>
            <div class="goal-title">${escapeHtml(g.title)}</div>
            <div class="goal-amounts">
              <strong>${formatRp(g.currentAmount)}</strong>
              <span class="muted-sm">${gPct}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${gPct}%;background:${g.color}"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  const txEl = document.getElementById("home-recent-tx");
  if (state.transactions.length === 0) {
    txEl.innerHTML = `<div class="card muted">Belum ada aktivitas tabungan.</div>`;
  } else {
    txEl.innerHTML = state.transactions
      .slice(0, 8)
      .map((t) => {
        const goal = state.goals.find((g) => g.id === t.goalId);
        const isDep = t.type === "DEPOSIT";
        return `
          <div class="tx-item">
            <div>
              <div class="tx-title">${escapeHtml(goal ? goal.title : "Target Dihapus")}</div>
              <div class="tx-meta">${escapeHtml(t.note || (isDep ? "Setoran" : "Penarikan"))} • ${formatDate(t.createdAt)}</div>
            </div>
            <div class="tx-amount ${isDep ? "positive" : "negative"}">
              ${isDep ? "+" : "-"}${formatRp(t.amount)}
            </div>
          </div>
        `;
      })
      .join("");
  }
}

function renderGoals() {
  const listEl = document.getElementById("goals-list");
  const filtered = currentFilter === "ALL"
    ? state.goals
    : state.goals.filter((g) => g.category === currentFilter);

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="card muted">Belum ada target pada kategori ini.</div>`;
    return;
  }

  listEl.innerHTML = filtered
    .map((g) => {
      const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
      return `
        <article class="goal-card">
          <div class="goal-card-top">
            <div>
              <span class="goal-cat-badge" style="background:${g.color}">${g.category}</span>
              <h3 class="goal-title">${escapeHtml(g.title)}</h3>
              <div class="goal-deadline">Target selesai: ${formatDate(g.deadline)}</div>
            </div>
            <span class="badge-soft">${pct}%</span>
          </div>
          <div class="goal-amounts">
            <strong>${formatRp(g.currentAmount)}</strong>
            <span class="muted-sm">dari ${formatRp(g.targetAmount)}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%;background:${g.color}"></div>
          </div>
          <div class="goal-card-actions">
            <button class="btn-sm accent" type="button" onclick="openTxForGoal('${g.id}', 'DEPOSIT')">+ Setor</button>
            <button class="btn-sm" type="button" onclick="openTxForGoal('${g.id}', 'WITHDRAW')">- Tarik</button>
            <button class="btn-sm del" type="button" onclick="deleteGoal('${g.id}')">Hapus</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAnalytics() {
  const total = state.goals.reduce((s, g) => s + g.currentAmount, 0);
  document.getElementById("analytics-cat-total").textContent = formatRp(total);

  const catMap = {};
  state.goals.forEach((g) => {
    if (!catMap[g.category]) catMap[g.category] = { amount: 0, color: g.color };
    catMap[g.category].amount += g.currentAmount;
  });

  const catEl = document.getElementById("analytics-categories");
  const entries = Object.entries(catMap);
  if (entries.length === 0) {
    catEl.innerHTML = `<div class="muted">Belum ada data kategori.</div>`;
  } else {
    catEl.innerHTML = entries
      .map(([cat, info]) => {
        const pct = total > 0 ? Math.round((info.amount / total) * 100) : 0;
        return `
          <div>
            <div class="cat-row-head">
              <span>${cat} (${pct}%)</span>
              <span>${formatRp(info.amount)}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${pct}%;background:${info.color}"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  drawMonthlyChart();
}

function drawMonthlyChart() {
  const canvas = document.getElementById("monthly-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const months = ["Jun", "Jul", "Agu", "Sep", "Okt", "Nov"];
  const currentTotal = state.goals.reduce((s, g) => s + g.currentAmount, 0);
  const values = [
    Math.round(currentTotal * 0.35),
    Math.round(currentTotal * 0.46),
    Math.round(currentTotal * 0.58),
    Math.round(currentTotal * 0.72),
    Math.round(currentTotal * 0.86),
    currentTotal
  ];

  const maxVal = Math.max(...values, 100000);
  const padX = 24;
  const padY = 24;
  const barW = 28;
  const gap = (w - padX * 2 - barW * months.length) / (months.length - 1);

  const isDark = state.theme === "dark";
  ctx.font = "600 11px Plus Jakarta Sans, sans-serif";
  ctx.textAlign = "center";

  months.forEach((m, i) => {
    const x = padX + i * (barW + gap);
    const barH = Math.max(8, ((h - padY * 2) * values[i]) / maxVal);
    const y = h - padY - barH;

    ctx.fillStyle = i === months.length - 1 ? "#059669" : isDark ? "#334155" : "#cbd5e1";
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [6, 6, 0, 0]);
    ctx.fill();

    ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
    ctx.fillText(m, x + barW / 2, h - 6);
  });
}

function renderReminders() {
  const el = document.getElementById("reminders-list");
  if (state.reminders.length === 0) {
    el.innerHTML = `<div class="card muted">Belum ada pengingat menabung.</div>`;
    return;
  }

  el.innerHTML = state.reminders
    .map((r) => {
      const goal = state.goals.find((g) => g.id === r.goalId);
      return `
        <div class="rem-card">
          <div>
            <div class="rem-title">${escapeHtml(r.title)}</div>
            <div class="rem-meta">${formatRp(r.amount)} • ${r.frequency} pukul ${r.time}</div>
            <div class="rem-meta">Target: ${escapeHtml(goal ? goal.title : "Umum")}</div>
          </div>
          <label class="switch" aria-label="Aktifkan pengingat">
            <input type="checkbox" ${r.enabled ? "checked" : ""} onchange="toggleReminder('${r.id}')" />
            <span class="slider"></span>
          </label>
        </div>
      `;
    })
    .join("");
}

function populateGoalSelects() {
  const options = state.goals
    .map((g) => `<option value="${g.id}">${escapeHtml(g.title)} (${formatRp(g.currentAmount)})</option>`)
    .join("");
  document.getElementById("tx-goal").innerHTML = options || `<option value="">Belum ada target</option>`;
  document.getElementById("rem-goal").innerHTML = options || `<option value="">Umum</option>`;
}

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

window.openTxForGoal = function (goalId, type = "DEPOSIT") {
  if (state.goals.length === 0) {
    showToast("Buat target tabungan terlebih dahulu");
    openModal("modal-goal");
    return;
  }
  txType = type;
  document.querySelectorAll(".seg-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.type === txType);
  });
  populateGoalSelects();
  if (goalId) document.getElementById("tx-goal").value = goalId;
  openModal("modal-tx");
};

window.deleteGoal = function (goalId) {
  state.goals = state.goals.filter((g) => g.id !== goalId);
  state.transactions = state.transactions.filter((t) => t.goalId !== goalId);
  saveState();
  renderAll();
  showToast("Target dihapus");
};

window.toggleReminder = function (remId) {
  const r = state.reminders.find((x) => x.id === remId);
  if (r) {
    r.enabled = !r.enabled;
    saveState();
    showToast(r.enabled ? "Pengingat diaktifkan" : "Pengingat dimatikan");
  }
};

function updateCalculator() {
  const target = Number(document.getElementById("calc-target").value) || 0;
  const current = Number(document.getElementById("calc-current").value) || 0;
  const months = Math.max(1, Number(document.getElementById("calc-months").value) || 1);
  const remaining = Math.max(0, target - current);
  const perMonth = remaining / months;
  const perWeek = remaining / (months * 4);
  const perDay = remaining / (months * 30);

  document.getElementById("calc-per-month").textContent = formatRp(perMonth);
  document.getElementById("calc-per-week").textContent = formatRp(perWeek);
  document.getElementById("calc-per-day").textContent = formatRp(perDay);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Event Listeners
document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => switchScreen(btn.dataset.screen));
});

document.querySelectorAll("[data-nav]").forEach((btn) => {
  btn.addEventListener("click", () => switchScreen(btn.dataset.nav));
});

document.getElementById("btn-theme").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveState();
  applyTheme();
  drawMonthlyChart();
});

document.getElementById("btn-info").addEventListener("click", () => openModal("modal-info"));
document.getElementById("btn-quick-deposit").addEventListener("click", () => window.openTxForGoal(state.goals[0]?.id, "DEPOSIT"));
document.getElementById("btn-quick-goal").addEventListener("click", () => openModal("modal-goal"));
document.getElementById("btn-add-goal").addEventListener("click", () => openModal("modal-goal"));
document.getElementById("btn-add-reminder").addEventListener("click", () => {
  populateGoalSelects();
  openModal("modal-reminder");
});

document.querySelectorAll(".close-modal").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});

document.querySelectorAll(".modal-backdrop").forEach((bg) => {
  bg.addEventListener("click", (e) => {
    if (e.target === bg) bg.classList.add("hidden");
  });
});

document.querySelectorAll("#goals-filter-chips .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("#goals-filter-chips .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentFilter = chip.dataset.cat;
    renderGoals();
  });
});

document.querySelectorAll("#goal-color-picker .color-dot").forEach((dot) => {
  dot.addEventListener("click", () => {
    document.querySelectorAll("#goal-color-picker .color-dot").forEach((d) => d.classList.remove("active"));
    dot.classList.add("active");
    selectedColor = dot.dataset.color;
  });
});

document.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    txType = btn.dataset.type;
  });
});

document.querySelectorAll(".q-amt").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById("tx-amount");
    input.value = (Number(input.value) || 0) + Number(btn.dataset.amt);
  });
});

document.getElementById("form-goal").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("goal-title").value.trim();
  const category = document.getElementById("goal-category").value;
  const targetAmount = Number(document.getElementById("goal-target").value);
  const currentAmount = Number(document.getElementById("goal-initial").value) || 0;
  const deadline = document.getElementById("goal-deadline").value;

  if (!title || targetAmount <= 0) return;

  state.goals.unshift({
    id: "g_" + Date.now(),
    title,
    category,
    targetAmount,
    currentAmount,
    color: selectedColor,
    deadline
  });

  saveState();
  renderAll();
  e.target.reset();
  closeModal("modal-goal");
  showToast("Target tabungan ditambahkan!");
});

document.getElementById("form-tx").addEventListener("submit", (e) => {
  e.preventDefault();
  const goalId = document.getElementById("tx-goal").value;
  const amount = Number(document.getElementById("tx-amount").value);
  const note = document.getElementById("tx-note").value.trim();
  const goal = state.goals.find((g) => g.id === goalId);

  if (!goal || amount <= 0) return;

  if (txType === "WITHDRAW" && amount > goal.currentAmount) {
    showToast("Saldo target tidak mencukupi");
    return;
  }

  goal.currentAmount += txType === "DEPOSIT" ? amount : -amount;
  state.transactions.unshift({
    id: "t_" + Date.now(),
    goalId,
    type: txType,
    amount,
    note: note || (txType === "DEPOSIT" ? "Setoran tabungan" : "Penarikan dana"),
    createdAt: new Date().toISOString()
  });

  saveState();
  renderAll();
  e.target.reset();
  closeModal("modal-tx");
  showToast(txType === "DEPOSIT" ? "Setoran berhasil dicatat!" : "Penarikan berhasil dicatat!");
});

document.getElementById("form-reminder").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("rem-title").value.trim();
  const amount = Number(document.getElementById("rem-amount").value);
  const time = document.getElementById("rem-time").value;
  const frequency = document.getElementById("rem-freq").value;
  const goalId = document.getElementById("rem-goal").value;

  if (!title) return;

  state.reminders.unshift({
    id: "r_" + Date.now(),
    title,
    amount,
    time,
    frequency,
    goalId,
    enabled: true
  });

  saveState();
  renderAll();
  e.target.reset();
  closeModal("modal-reminder");
  showToast("Pengingat ditambahkan!");
});

document.getElementById("btn-reset-data").addEventListener("click", () => {
  state = structuredClone(DEFAULT_STATE);
  saveState();
  renderAll();
  closeModal("modal-info");
  showToast("Data direset ke awal");
});

["calc-target", "calc-current", "calc-months"].forEach((id) => {
  document.getElementById(id).addEventListener("input", updateCalculator);
});

// Set default deadline input to +6 months
const d6 = new Date();
d6.setMonth(d6.getMonth() + 6);
document.getElementById("goal-deadline").value = d6.toISOString().split("T")[0];

renderAll();
updateCalculator();
