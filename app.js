/* ====== ХРАНЕНИЕ ====== */
const LS_KEY = "shiftapp:data";
const LS_SETTINGS = "shiftapp:settings";

const $ = (id) => document.getElementById(id);
const $$ = (q) => Array.from(document.querySelectorAll(q));

function loadData() {
  return JSON.parse(localStorage.getItem(LS_KEY) || '{"shifts":[]}');
}
function saveData(d) {
  localStorage.setItem(LS_KEY, JSON.stringify(d));
}
function loadSettings() {
  return JSON.parse(localStorage.getItem(LS_SETTINGS) || '{"rate":360}');
}
function saveSettings(s) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
}

let data = loadData();
let settings = loadSettings();

/* ====== УТИЛИТЫ ====== */
function uid() {
  return Math.random().toString(36).slice(2) + Date.now();
}
function d(v) { return new Date(v); }
function fmtDate(v) {
  return d(v).toLocaleDateString("ru-RU", { day:"2-digit", month:"2-digit", year:"numeric" });
}
function fmtTime(v) {
  return d(v).toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });
}
function round2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
function minutesBetween(a,b){ return Math.max(0, Math.floor((b-a)/60000)); }

/* ====== СТАТУС СМЕНЫ ====== */
function shiftStatus(s){
  if(s.status === "confirmed") return "confirmed";
  if(Date.now() > d(s.plannedEnd)) return "needs";
  return "planned";
}

/* ====== РАСЧЁТ ====== */
function calc(shift){
  const start = d(shift.actualStart || shift.plannedStart);
  const end   = d(shift.actualEnd   || shift.plannedEnd);
  let mins = minutesBetween(start, end);

  if(shift.actualBreakStart && shift.actualBreakEnd){
    mins -= minutesBetween(d(shift.actualBreakStart), d(shift.actualBreakEnd));
  }

  const rate = shift.rateLocked ?? settings.rate;
  return {
    minutes: mins,
    hours: mins / 60,
    money: rate * (mins / 60)
  };
}

/* ====== КАЛЕНДАРЬ ====== */
let currentDay = new Date();
currentDay.setHours(0,0,0,0);

function renderCalendar(){
  $("dayLabel").textContent = currentDay.toLocaleDateString("ru-RU", { dateStyle:"long" });
  const list = $("dayList");
  list.innerHTML = "";

  const shifts = data.shifts.filter(s =>
    d(s.plannedStart).toDateString() === currentDay.toDateString()
  );

  if(!shifts.length){
    list.innerHTML = <div class="hint">Нет смен</div>;
    return;
  }

  shifts.forEach(s=>{
    const st = shiftStatus(s);
    const badge =
      st==="needs" ? "warn" :
      st==="confirmed" ? "ok" : "plan";

    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div>
        <div class="t">${fmtTime(s.plannedStart)}–${fmtTime(s.plannedEnd)}</div>
        <div class="s">${st==="needs"?"Требует подтверждения":st==="confirmed"?"Завершена":"Запланирована"}</div>
      </div>
      <div class="badge ${badge}">${st==="needs"?"Подтвердить":st==="confirmed"?"OK":"План"}</div>
    `;
    el.onclick = ()=>openModal(s.id);
    list.appendChild(el);
  });
}

/* ====== МОДАЛКА ====== */
let editingId = null;

function openModal(id=null){
  editingId = id;
  $("modal").classList.remove("hidden");

  let s = id ? data.shifts.find(x=>x.id===id) : {
    plannedStart: new Date().toISOString(),
    plannedEnd: new Date(Date.now()+8*3600000).toISOString()
  };

  $("mPlannedStart").value = s.plannedStart.slice(0,16);
  $("mPlannedEnd").value   = s.plannedEnd.slice(0,16);

  $("mActualStart").value = (s.actualStart||s.plannedStart).slice(0,16);
  $("mActualEnd").value   = (s.actualEnd||s.plannedEnd).slice(0,16);
}

function closeModal(){
  $("modal").classList.add("hidden");
  editingId = null;
}

$("closeModal").onclick = closeModal;
$("btnNew").onclick = ()=>openModal(null);

$("savePlan").onclick = ()=>{
  const ps = $("mPlannedStart").value;
  const pe = $("mPlannedEnd").value;

  if(!editingId){
    data.shifts.push({
      id: uid(),
      status: "planned",
      plannedStart: ps,
      plannedEnd: pe
    });
  } else {
    const s = data.shifts.find(x=>x.id===editingId);
    if(s.status==="confirmed") return alert("Нельзя менять завершённую смену");
    s.plannedStart = ps;
    s.plannedEnd = pe;
  }
saveData(data);
  closeModal();
  renderCalendar();
};

$("finishShift").onclick = ()=>{
  const s = editingId ? data.shifts.find(x=>x.id===editingId) : {
    id: uid(),
    plannedStart: $("mPlannedStart").value,
    plannedEnd: $("mPlannedEnd").value
  };

  s.actualStart = $("mActualStart").value;
  s.actualEnd   = $("mActualEnd").value;
  s.status = "confirmed";
  s.rateLocked = settings.rate;

  if(!editingId) data.shifts.push(s);
  saveData(data);
  closeModal();
  renderCalendar();
};

$("deleteShift").onclick = ()=>{
  if(!editingId) return;
  data.shifts = data.shifts.filter(s=>s.id!==editingId);
  saveData(data);
  closeModal();
  renderCalendar();
};

/* ====== НАСТРОЙКИ ====== */
$("rateInput").value = settings.rate;
$("saveRate").onclick = ()=>{
  settings.rate = Number($("rateInput").value||360);
  saveSettings(settings);
  alert("Сохранено");
};

/* ====== КАЛЬКУЛЯТОР ====== */
function renderCalc(){
  $("calcRate").textContent = settings.rate;
  const h = Number($("calcHours").value||0);
  const m = Number($("calcMinutes").value||0);
  $("calcResult").textContent = round2(settings.rate*((h*60+m)/60));
}
$("calcHours").oninput = renderCalc;
$("calcMinutes").oninput = renderCalc;

/* ====== СТАРТ ====== */
renderCalendar();
renderCalc();