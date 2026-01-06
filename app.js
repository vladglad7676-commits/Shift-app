/* ===== PWA register ===== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try { await navigator.serviceWorker.register("./sw.js"); } catch {}
  });
}

/* ===== State ===== */
const LS_KEY = "shift_week_state_v1";

const DAY_NAMES = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];

const $ = (id) => document.getElementById(id);

const money2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
const hours2 = (n) => (Math.round(n * 100) / 100).toFixed(2);

function toNum(v){
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function defaultState(){
  return {
    defaultRate: 360,
    days: Array.from({length:7}).map(() => ({
      enabled: false,
      start: "08:00",
      end: "22:00",
      breakEnabled: true,
      breakStart: "13:00",
      breakEnd: "14:00",
      rate: "" // ставка дня
    }))
  };
}

function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if(!s || !Array.isArray(s.days) || s.days.length !== 7) return defaultState();
    return s;
  } catch {
    return defaultState();
  }
}

function saveState(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

let state = loadState();

/* ===== Time math ===== */
function parseMin(hhmm){
  const [h,m] = String(hhmm).split(":").map(x => parseInt(x,10));
  if(!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h*60 + m;
}

function diffMinutes(start, end){
  const s = parseMin(start);
  const e = parseMin(end);
  let d = e - s;
  if(d <= 0) d += 24*60; // через полночь
  return d;
}

function calcDay(i){
  const d = state.days[i];
  if(!d.enabled) return {paidMin:0, hours:0, money:0, rateUsed:0, warn:""};

  const total = diffMinutes(d.start, d.end);

  let br = 0;
  let warn = "";

  if(d.breakEnabled){
    br = diffMinutes(d.breakStart, d.breakEnd);

    if(br === 0) warn = "Перерыв нулевой — проверь время.";
    if(br > total){
      br = 0;
      warn = "Перерыв больше смены — не учтён.";
    }
  }

  const paidMin = Math.max(0, total - br);
  const rateUsed = d.rate === "" ? state.defaultRate : toNum(d.rate);
  const hours = paidMin / 60;
  const money = hours * rateUsed;

  return {paidMin, hours, money, rateUsed, warn};
}

/* ===== Render ===== */
function dayMetaText(d){
  if(!d.enabled) return "Выходной";
  // ночная смена если end < start (по минутам)
  const s = parseMin(d.start), e = parseMin(d.end);
  const night = (e - s) <= 0;
  return night ? "Работаю · ночная смена" : "Работаю";
}

function render(){
  $("defaultRate").value = state.defaultRate;

  const root = $("weekList");
  root.innerHTML = "";

  let sumH = 0;
  let sumM = 0;

  state.days.forEach((d, i) => {
    const c = calcDay(i);
    sumH += c.hours;
    sumM += c.money;

    const card = document.createElement("article");
    card.className = "day";
    card.dataset.day = String(i);

    const rateLabel = (d.rate === "") ? "по умолчанию" : `${money2(toNum(d.rate))} ₽/ч`;

    card.innerHTML = `
      <div class="day__top">
        <div class="day__left">
          <input class="chk" type="checkbox" data-field="enabled" ${d.enabled ? "checked":""}>
          <div>
            <div class="dayname">${DAY_NAMES[i]}</div>
            <div class="daymeta">${dayMetaText(d)}</div>
          </div>
        </div>

        <div class="day__right">
          <div class="badge">${d.enabled ? `${hours2(c.hours)} ч · ${money2(c.money)} ₽` : "—"}</div>
          <div class="daymeta">Ставка: <b>${rateLabel}</b></div>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <div class="label">От</div>
          <input class="input" type="time" step="60" data-field="start" value="${d.start}" ${d.enabled ? "" : "disabled"}>
        </div>
        <div class="box">
          <div class="label">До</div>
          <input class="input" type="time" step="60" data-field="end" value="${d.end}" ${d.enabled ? "" : "disabled"}>
        </div>
      </div>

      <div class="row">
        <div class="box breakRow">
          <div class="switchline">
            <div class="label" style="margin:0">Перерыв (неоплачиваемый)</div>
            <label class="small">
              <input type="checkbox" data-field="breakEnabled" ${d.breakEnabled ? "checked":""} ${d.enabled ? "" : "disabled"}>
              включён
            </label>
          </div>

          <div class="times">
            <div class="timeWrap">
              <div class="label">С</div>
              <input class="input" type="time" step="60" data-field="breakStart" value="${d.breakStart}" ${(d.enabled && d.breakEnabled) ? "" : "disabled"}>
            </div>
            <div class="timeWrap">
              <div class="label">До</div>
              <input class="input" type="time" step="60" data-field="breakEnd" value="${d.breakEnd}" ${(d.enabled && d.breakEnabled) ? "" : "disabled"}>
            </div>
          </div>
        </div>

        <div class="box rateRow">
          <div class="label">Ставка дня (₽/час)</div>
          <input class="input" inputmode="decimal" data-field="rate" placeholder="пусто = моя ставка" value="${d.rate}" ${d.enabled ? "" : "disabled"}>
          <div class="small" style="margin-top:8px;">Если пусто — используется “Моя ставка”.</div>
        </div>
      </div>

      <div class="summary">
        <div>Оплачиваемо: <b>${hours2(c.paidMin/60)} ч</b></div>
        <div>Сумма: <b>${money2(c.money)} ₽</b></div>
      </div>

      <div class="warn" ${c.warn ? 'style="display:block"' : ""}>${c.warn}</div>
    `;

    root.appendChild(card);
  });

  $("sumWeekHours").textContent = hours2(sumH);
  $("sumWeekMoney").textContent = money2(sumM);

  $("sum4wHours").textContent = hours2(sumH * 4);
  $("sum4wMoney").textContent = money2(sumM * 4);

  $("sumMoHours").textContent = hours2(sumH * 4.33);
  $("sumMoMoney").textContent = money2(sumM * 4.33);
}

/* ===== Events (delegation) ===== */
function updateFromInput(el){
  const card = el.closest(".day");
  if(!card) return;

  const i = Number(card.dataset.day);
  if(!Number.isFinite(i)) return;

  const field = el.dataset.field;
  if(!field) return;

  const d = state.days[i];

  if(field === "enabled") d.enabled = el.checked;
  else if(field === "breakEnabled") d.breakEnabled = el.checked;
  else d[field] = el.value;

  // top default rate
  saveState();
  render();
}

$("weekList").addEventListener("input", (e) => {
  const el = e.target;
  if(!(el instanceof HTMLElement)) return;
  if(!el.dataset.field) return;
  updateFromInput(el);
});

$("weekList").addEventListener("change", (e) => {
  const el = e.target;
  if(!(el instanceof HTMLElement)) return;
  if(!el.dataset.field) return;
  updateFromInput(el);
});

$("defaultRate").addEventListener("input", () => {
  state.defaultRate = Math.max(0, toNum($("defaultRate").value));
  saveState();
  render();
});

$("resetBtn").addEventListener("click", () => {
  state = defaultState();
  saveState();
  render();
});

/* ===== Start ===== */
render();
