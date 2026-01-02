const LS_KEY = "shiftapp:data";

function $(id) {
  return document.getElementById(id);
}

function load() {
  return JSON.parse(localStorage.getItem(LS_KEY) || '{"shifts":[]}');
}

function save(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

let data = load();

function openModal() {
  $("modal").classList.remove("hidden");
  $("mPlannedStart").value = new Date().toISOString().slice(0,16);
  $("mPlannedEnd").value = new Date(Date.now() + 8*3600000).toISOString().slice(0,16);
}

function closeModal() {
  $("modal").classList.add("hidden");
}

function render() {
  const list = $("dayList");
  list.innerHTML = "";
  data.shifts.forEach(s => {
    const div = document.createElement("div");
    div.textContent = s.plannedStart + " – " + s.plannedEnd;
    list.appendChild(div);
  });
}

window.addEventListener("load", () => {
  $("btnNew").onclick = openModal;
  $("closeModal").onclick = closeModal;

  $("savePlan").onclick = () => {
    data.shifts.push({
      plannedStart: $("mPlannedStart").value,
      plannedEnd: $("mPlannedEnd").value
    });
    save(data);
    closeModal();
    render();
  };

  render();
});
