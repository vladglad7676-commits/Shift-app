// ===== STORAGE =====
const LS_KEY = "shiftapp:data";
const LS_SETTINGS = "shiftapp:settings";

const $ = (id) => document.getElementById(id);

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

// ===== UTILS =====
function uid() {
  return Math.random().toString(36).slice(2) + Date.now();
}
function d(v) {
  return new Date(v);
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function toLocalInputValue(date = new Date()) {
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
}

// ===== UI =====
let currentDay = new Date();
currentDay.setHours(0, 0, 0, 0);

function renderDay() {
  const list = $("dayList");
  list.innerHTML = "";

  const shifts = data.shifts.filter(
    (s) =>
      new Date(s.plannedStart).toDateString() ===
      currentDay.toDateString()
  );

  if (!shifts.length) {
    list.innerHTML = "<div>Нет смен</div>";
    return;
  }

  shifts.forEach((s) => {
    const div = document.createElement("div");
    div.textContent =
      new Date(s.plannedStart).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }) +
      " – " +
      new Date(s.plannedEnd).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    list.appendChild(div);
  });
}

// ===== MODAL =====
let editingId = null;

function openModal() {
  editingId = null;
  $("modal").classList.remove("hidden");

  $("mPlannedStart").value = toLocalInputValue(new Date());
  $("mPlannedEnd").value = toLocalInputValue(
    new Date(Date.now() + 8 * 60 * 60 * 1000)
  );
}

function closeModal() {
  $("modal").classList.add("hidden");
}

// ===== EVENTS =====
window.addEventListener("load", () => {
  $("btnNew").onclick = openModal;
  $("closeModal").onclick = closeModal;

  $("savePlan").onclick = () => {
    const shift = {
      id: uid(),
      plannedStart: $("mPlannedStart").value,
      plannedEnd: $("mPlannedEnd").value,
    };
    data.shifts.push(shift);
    saveData(data);
    closeModal();
    renderDay();
  };

  renderDay();
});
