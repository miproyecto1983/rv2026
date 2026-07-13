const STORAGE_KEY = "rvTracker2026Pro";

const GOALS = {
  op1: { target: 550, weight: 0.50 },
  op2: { target: 6500, weight: 0.35 },
  op3: { target: 175, weight: 0.15, cap: 130 }
};

const RVOP100 = 9440.90;
const RVOPMAX = 12273.17;
const RVOUS100 = 2697.40;
const AP100 = 1348.70;

const $ = id => document.getElementById(id);
const numberValue = element => Number(element.value);
const euro = value => value.toLocaleString("es-ES", {
  style: "currency",
  currency: "EUR"
});
const pct = value => `${value.toFixed(1).replace(".", ",")}%`;

let savedTarget = 550;
let lastSavedAt = null;
let messageTimer = null;

function achievement(actual, target, cap = 130) {
  if (!Number.isFinite(target) || target <= 0) return 0;
  return Math.min((actual / target) * 100, cap);
}

function calculateRvOp(opPercent) {
  if (opPercent < 70) return 0;

  if (opPercent <= 100) {
    return 0.4 * RVOP100
      + ((opPercent - 70) * (0.6 * RVOP100) / 30);
  }

  if (opPercent <= 130) {
    return RVOP100
      + ((opPercent - 100) * (0.3 * RVOP100) / 30);
  }

  return RVOPMAX;
}

function calculateGlobal(op1, op2, op3, targetOp1) {
  return achievement(op1, targetOp1) * GOALS.op1.weight
    + achievement(op2, GOALS.op2.target) * GOALS.op2.weight
    + achievement(op3, GOALS.op3.target, GOALS.op3.cap) * GOALS.op3.weight;
}

function remainingDays() {
  const now = new Date();
  const end = new Date(2026, 11, 31, 23, 59, 59);
  return Math.max(1, Math.ceil((end - now) / 86400000));
}

function missingAmount(targetPercent, current, target) {
  return Math.max(0, Math.ceil(target * targetPercent / 100) - current);
}

function getCurrentTargetForCalculations() {
  const raw = $("op1TargetEdit").value.trim();
  const candidate = Number(raw);

  // El campo nunca se modifica automáticamente.
  // Mientras está vacío o es inválido, los cálculos conservan el último objetivo válido.
  if (raw !== "" && Number.isFinite(candidate) && candidate > 0) {
    return candidate;
  }

  return savedTarget;
}

function readStoredData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("No se pudieron leer los datos guardados:", error);
    return null;
  }
}

function loadData() {
  const data = readStoredData();

  if (!data) {
    savedTarget = 550;
    $("op1TargetEdit").value = "550";
    return;
  }

  const target = Number(data.op1Target);
  if (Number.isFinite(target) && target > 0) {
    savedTarget = target;
    $("op1TargetEdit").value = String(target);
  }

  if (data.op1 !== undefined) $("op1Actual").value = data.op1;
  if (data.op2 !== undefined) $("op2Actual").value = data.op2;
  if (data.op3 !== undefined) $("op3Actual").value = data.op3;
  if (data.pending !== undefined) $("nedgiaPendiente").checked = Boolean(data.pending);

  if (data.savedAt) {
    const date = new Date(data.savedAt);
    if (!Number.isNaN(date.getTime())) lastSavedAt = date;
  }
}

function showMessage(text, type = "success") {
  const message = $("saveMessage");
  const button = $("saveBtn");

  clearTimeout(messageTimer);

  message.textContent = text;
  message.classList.toggle("error", type === "error");

  if (type === "success") {
    button.textContent = "Guardado";
    button.classList.add("saved");
  }

  messageTimer = setTimeout(() => {
    message.textContent = "";
    message.classList.remove("error");
    button.textContent = "Guardar datos";
    button.classList.remove("saved");
  }, 2800);
}

function validateBeforeSave() {
  const targetInput = $("op1TargetEdit");
  const rawTarget = targetInput.value.trim();
  const target = Number(rawTarget);

  targetInput.classList.remove("invalid");

  if (rawTarget === "" || !Number.isFinite(target) || target <= 0) {
    targetInput.classList.add("invalid");
    targetInput.focus();
    showMessage("Debes indicar un objetivo OP1 válido.", "error");
    return null;
  }

  return {
    op1Target: target,
    op1: Math.max(0, Number($("op1Actual").value) || 0),
    op2: $("op2Actual").value.trim() === ""
      ? ""
      : Math.max(0, Number($("op2Actual").value) || 0),
    op3: Math.max(0, Number($("op3Actual").value) || 0),
    pending: $("nedgiaPendiente").checked,
    savedAt: new Date().toISOString()
  };
}

function saveData() {
  const data = validateBeforeSave();
  if (!data) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    savedTarget = data.op1Target;
    lastSavedAt = new Date(data.savedAt);

    $("op1TargetEdit").classList.remove("invalid");

    $("simOp1").value = data.op1;
    $("simOp3").value = data.op3;
    $("simOp2").value = data.op2 === "" ? 6500 : data.op2;

    renderAll();
    showMessage("✓ Datos guardados correctamente");
  } catch (error) {
    console.error("No se pudieron guardar los datos:", error);
    showMessage("No se han podido guardar los datos.", "error");
  }
}

function renderDate() {
  const now = new Date();

  $("todayText").textContent = now.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const start = new Date(now.getFullYear(), 0, 1);
  const day = Math.floor((now - start) / 86400000) + 1;
  const totalDays = new Date(now.getFullYear(), 1, 29).getMonth() === 1 ? 366 : 365;

  $("yearProgress").textContent =
    `Día ${day} de ${totalDays} (${pct(day / totalDays * 100)})`;

  $("lastUpdate").textContent = lastSavedAt
    ? lastSavedAt.toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Sin guardar";
}

function renderDashboard() {
  const targetOp1 = getCurrentTargetForCalculations();
  const op1 = Number($("op1Actual").value) || 0;
  const op2 = Number($("op2Actual").value) || 0;
  const op3 = Number($("op3Actual").value) || 0;

  const pending =
    $("nedgiaPendiente").checked || $("op2Actual").value.trim() === "";

  const p1 = achievement(op1, targetOp1);
  const p2 = pending ? null : achievement(op2, GOALS.op2.target);
  const p3 = achievement(op3, GOALS.op3.target, GOALS.op3.cap);

  const globalPercent = pending
    ? p1 * GOALS.op1.weight + p3 * GOALS.op3.weight
    : calculateGlobal(op1, op2, op3, targetOp1);

  $("op1TargetNow").textContent = targetOp1.toLocaleString("es-ES");
  $("op1Now").textContent = op1.toLocaleString("es-ES");
  $("op2Now").textContent = pending ? "--" : op2.toLocaleString("es-ES");
  $("op3Now").textContent = op3.toLocaleString("es-ES");

  $("op1Pct").textContent = pct(p1);
  $("op2Pct").textContent = pending ? "--" : pct(p2);
  $("op3Pct").textContent = pct(p3);

  $("op1Fill").style.width = `${Math.min(p1 / 130 * 100, 100)}%`;
  $("op2Fill").style.width = pending
    ? "0%"
    : `${Math.min(p2 / 130 * 100, 100)}%`;
  $("op3Fill").style.width = `${Math.min(p3 / 130 * 100, 100)}%`;

  $("opGlobalCard").textContent = pct(globalPercent);
  $("globalHuge").textContent = pct(globalPercent);
  $("opGlobalSub").textContent = pending ? "Orientativo" : "Completo";
  $("opGlobalPending").textContent =
    pending ? "Pendiente: dato Nedgia" : "Con dato Nedgia";

  $("globalMarker").style.left =
    `${Math.min(globalPercent / 130 * 100, 98)}%`;

  if (globalPercent < 70) {
    $("globalHelp").textContent =
      `Te faltan ${pct(70 - globalPercent)} para empezar a devengar OP.`;
  } else if (globalPercent < 100) {
    $("globalHelp").textContent =
      `Has superado el mínimo. Te faltan ${pct(100 - globalPercent)} para el 100%.`;
  } else {
    $("globalHelp").textContent = "Estás por encima del 100%.";
  }

  if (pending) {
    $("rvOp").textContent = "----- €";
    $("rvStatus").textContent = "Pendiente de dato Nedgia";
  } else {
    $("rvOp").textContent = euro(calculateRvOp(globalPercent));
    $("rvStatus").textContent =
      globalPercent < 70 ? "Por debajo del umbral" : "Estimación OP";
  }

  const days = remainingDays();
  $("daysLeft").textContent = `Quedan ${days} días para el 31/12/2026`;

  $("daily100").textContent =
    (missingAmount(100, op1, targetOp1) / days).toFixed(2).replace(".", ",");

  $("daily130").textContent =
    (missingAmount(130, op1, targetOp1) / days).toFixed(2).replace(".", ",");

  $("miss70").textContent =
    `Te faltan ${pct(Math.max(0, 70 - globalPercent))}`;

  $("miss100").textContent =
    `Te faltan ${pct(Math.max(0, 100 - globalPercent))}`;

  $("miss130").textContent =
    `Te faltan ${pct(Math.max(0, 130 - globalPercent))}`;

  renderScenarios(op1, op3, targetOp1);
}

function renderScenarios(op1, op3, targetOp1) {
  const scenarios = [
    ["Pesimista", 90],
    ["Conservador", 100],
    ["Optimista", 110],
    ["Muy optimista", 130]
  ];

  $("scenarios").innerHTML = scenarios.map(([name, nedgiaPercent]) => {
    const op2 = GOALS.op2.target * nedgiaPercent / 100;
    const globalPercent = calculateGlobal(op1, op2, op3, targetOp1);

    return `<div class="scenario">
      <div><b>${name}</b><small>Nedgia ${nedgiaPercent}%</small></div>
      <div><small>Cumplimiento OP</small><b>${pct(globalPercent)}</b></div>
      <div><small>RV OP</small><b class="money">${euro(calculateRvOp(globalPercent))}</b></div>
    </div>`;
  }).join("");

  $("totalScenarios").innerHTML = scenarios.map(([name, nedgiaPercent]) => {
    const op2 = GOALS.op2.target * nedgiaPercent / 100;
    const globalPercent = calculateGlobal(op1, op2, op3, targetOp1);
    const total = calculateRvOp(globalPercent) + RVOUS100 + AP100;

    return `<div>
      <span>${name}</span>
      <strong>${euro(total)}</strong>
    </div>`;
  }).join("");
}

function renderSimulator() {
  const targetOp1 = getCurrentTargetForCalculations();
  const op1 = Number($("simOp1").value) || 0;
  const op2 = Number($("simOp2").value) || 0;
  const op3 = Number($("simOp3").value) || 0;

  const globalPercent = calculateGlobal(op1, op2, op3, targetOp1);

  $("simPct").textContent = pct(globalPercent);
  $("simRv").textContent = euro(calculateRvOp(globalPercent));
}

function renderAll() {
  renderDashboard();
  renderSimulator();
  renderDate();
}

function bindEvents() {
  $("saveBtn").addEventListener("click", saveData);

  [
    "op1TargetEdit",
    "op1Actual",
    "op2Actual",
    "op3Actual",
    "nedgiaPendiente"
  ].forEach(id => {
    $(id).addEventListener("input", () => {
      if (id === "op1TargetEdit") {
        $(id).classList.remove("invalid");
      }
      renderAll();
    });
  });

  ["simOp1", "simOp2", "simOp3"].forEach(id => {
    $(id).addEventListener("input", renderSimulator);
  });
}

function init() {
  loadData();

  $("simOp1").value = $("op1Actual").value;
  $("simOp3").value = $("op3Actual").value;
  $("simOp2").value = $("op2Actual").value || 6500;

  bindEvents();
  renderAll();
}

init();
