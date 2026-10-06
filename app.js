const STORAGE_KEY = "rvTracker2026Pro";

const GOALS = {
  op1: { target: 0, weight: 0.50 },
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

const pct = value =>
  `${value.toFixed(1).replace(".", ",")}%`;


let savedTarget = 0;
let lastSavedAt = null;
let messageTimer = null;


/* =========================================================
   CÁLCULOS
========================================================= */

function achievement(actual, target, cap = 130) {

  if (!Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Math.min(
    (actual / target) * 100,
    cap
  );
}


function calculateRvOp(opPercent) {

  if (opPercent < 70) {
    return 0;
  }

  if (opPercent <= 100) {

    return (
      0.4 * RVOP100
      + ((opPercent - 70) *
        (0.6 * RVOP100) / 30)
    );

  }

  if (opPercent <= 130) {

    return (
      RVOP100
      + ((opPercent - 100) *
        (0.3 * RVOP100) / 30)
    );

  }

  return RVOPMAX;
}


function calculateGlobal(
  op1,
  op2,
  op3,
  targetOp1
) {

  return (
    achievement(op1, targetOp1)
      * GOALS.op1.weight

    + achievement(op2, GOALS.op2.target)
      * GOALS.op2.weight

    + achievement(
        op3,
        GOALS.op3.target,
        GOALS.op3.cap
      )
      * GOALS.op3.weight
  );
}


function remainingDays() {

  const now = new Date();

  const end =
    new Date(
      2026,
      11,
      31,
      23,
      59,
      59
    );

  return Math.max(
    1,
    Math.ceil(
      (end - now) / 86400000
    )
  );
}


function missingAmount(
  targetPercent,
  current,
  target
) {

  if (
    !Number.isFinite(target)
    || target <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil(
      target *
      targetPercent /
      100
    ) - current
  );
}


/* =========================================================
   OBJETIVO OP1
========================================================= */

function getCurrentTargetForCalculations() {

  const raw =
    $("op1TargetEdit").value.trim();

  const candidate =
    Number(raw);

  if (
    raw !== ""
    && Number.isFinite(candidate)
    && candidate > 0
  ) {

    return candidate;

  }

  return savedTarget;
}


/* =========================================================
   ALMACENAMIENTO LOCAL
========================================================= */

function readStoredData() {

  const raw =
    localStorage.getItem(
      STORAGE_KEY
    );

  if (!raw) {
    return null;
  }

  try {

    return JSON.parse(raw);

  } catch (error) {

    console.error(
      "No se pudieron leer los datos guardados:",
      error
    );

    return null;

  }
}


function loadData() {

  const data =
    readStoredData();

  /*
   * Usuario nuevo.
   * Todo empieza a cero.
   */

  if (!data) {

    savedTarget = 0;

    $("op1TargetEdit").value = "0";
    $("op1Actual").value = "0";
    $("op3Actual").value = "0";
    $("op2Actual").value = "";

    $("nedgiaPendiente").checked = true;

    return;
  }


  /*
   * Usuario que ya había guardado datos.
   */

  const target =
    Number(data.op1Target);

  if (
    Number.isFinite(target)
    && target > 0
  ) {

    savedTarget = target;

    $("op1TargetEdit").value =
      String(target);

  } else {

    savedTarget = 0;

    $("op1TargetEdit").value =
      "0";

  }


  if (data.op1 !== undefined) {

    $("op1Actual").value =
      data.op1;

  }


  if (data.op2 !== undefined) {

    $("op2Actual").value =
      data.op2;

  }


  if (data.op3 !== undefined) {

    $("op3Actual").value =
      data.op3;

  }


  if (data.pending !== undefined) {

    $("nedgiaPendiente").checked =
      Boolean(data.pending);

  }


  if (data.savedAt) {

    const date =
      new Date(data.savedAt);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {

      lastSavedAt = date;

    }

  }
}


/* =========================================================
   MENSAJES
========================================================= */

function showMessage(
  text,
  type = "success"
) {

  const message =
    $("saveMessage");

  const button =
    $("saveBtn");

  clearTimeout(
    messageTimer
  );

  message.textContent =
    text;

  message.classList.toggle(
    "error",
    type === "error"
  );


  if (type === "success") {

    button.textContent =
      "Guardado";

    button.classList.add(
      "saved"
    );

  }


  messageTimer =
    setTimeout(() => {

      message.textContent = "";

      message.classList.remove(
        "error"
      );

      button.textContent =
        "Guardar datos";

      button.classList.remove(
        "saved"
      );

    }, 2800);
}


/* =========================================================
   VALIDACIÓN
========================================================= */

function validateBeforeSave() {

  const targetInput =
    $("op1TargetEdit");

  const rawTarget =
    targetInput.value.trim();

  const target =
    Number(rawTarget);

  targetInput.classList.remove(
    "invalid"
  );


  /*
   * El objetivo OP1 tiene que introducirlo
   * cada usuario.
   */

  if (
    rawTarget === ""
    || !Number.isFinite(target)
    || target <= 0
  ) {

    targetInput.classList.add(
      "invalid"
    );

    targetInput.focus();

    showMessage(
      "Debes indicar tu objetivo OP1.",
      "error"
    );

    return null;
  }


  return {

    op1Target: target,

    op1: Math.max(
      0,
      Number(
        $("op1Actual").value
      ) || 0
    ),

    op2:
      $("op2Actual")
        .value
        .trim() === ""

        ? ""

        : Math.max(
            0,
            Number(
              $("op2Actual").value
            ) || 0
          ),

    op3: Math.max(
      0,
      Number(
        $("op3Actual").value
      ) || 0
    ),

    pending:
      $("nedgiaPendiente")
        .checked,

    savedAt:
      new Date().toISOString()

  };
}


/* =========================================================
   GUARDAR
========================================================= */

function saveData() {

  const data =
    validateBeforeSave();

  if (!data) {
    return;
  }


  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );


    savedTarget =
      data.op1Target;

    lastSavedAt =
      new Date(data.savedAt);


    $("op1TargetEdit")
      .classList
      .remove("invalid");


    $("simOp1").value =
      data.op1;

    $("simOp3").value =
      data.op3;

    $("simOp2").value =
      data.op2 === ""
        ? 6500
        : data.op2;


    renderAll();


    showMessage(
      "✓ Datos guardados correctamente"
    );

  } catch (error) {

    console.error(
      "No se pudieron guardar los datos:",
      error
    );

    showMessage(
      "No se han podido guardar los datos.",
      "error"
    );

  }
}


/* =========================================================
   FECHA
========================================================= */

function renderDate() {

  const now =
    new Date();


  $("todayText").textContent =
    now.toLocaleDateString(
      "es-ES",
      {
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );


  const start =
    new Date(
      now.getFullYear(),
      0,
      1
    );


  const day =
    Math.floor(
      (now - start) /
      86400000
    ) + 1;


  const totalDays =
    new Date(
      now.getFullYear(),
      1,
      29
    ).getMonth() === 1
      ? 366
      : 365;


  $("yearProgress").textContent =
    `Día ${day} de ${totalDays} (${pct(
      day / totalDays * 100
    )})`;


  $("lastUpdate").textContent =
    lastSavedAt

      ? lastSavedAt
          .toLocaleString(
            "es-ES",
            {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            }
          )

      : "Sin guardar";
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

  const targetOp1 =
    getCurrentTargetForCalculations();


  const op1 =
    Number(
      $("op1Actual").value
    ) || 0;


  const op2 =
    Number(
      $("op2Actual").value
    ) || 0;


  const op3 =
    Number(
      $("op3Actual").value
    ) || 0;


  const pending =
    $("nedgiaPendiente").checked
    ||
    $("op2Actual")
      .value
      .trim() === "";


  const hasTarget =
    Number.isFinite(targetOp1)
    && targetOp1 > 0;


  const p1 =
    hasTarget
      ? achievement(
          op1,
          targetOp1
        )
      : 0;


  const p2 =
    pending
      ? null
      : achievement(
          op2,
          GOALS.op2.target
        );


  const p3 =
    achievement(
      op3,
      GOALS.op3.target,
      GOALS.op3.cap
    );


  const globalPercent =
    pending

      ? (
          p1 *
          GOALS.op1.weight
          +
          p3 *
          GOALS.op3.weight
        )

      : calculateGlobal(
          op1,
          op2,
          op3,
          targetOp1
        );


  /*
   * Tabla objetivos
   */

  $("op1TargetNow").textContent =
    hasTarget
      ? targetOp1.toLocaleString(
          "es-ES"
        )
      : "0";


  $("op1Now").textContent =
    op1.toLocaleString(
      "es-ES"
    );


  $("op2Now").textContent =
    pending
      ? "--"
      : op2.toLocaleString(
          "es-ES"
        );


  $("op3Now").textContent =
    op3.toLocaleString(
      "es-ES"
    );


  $("op1Pct").textContent =
    hasTarget
      ? pct(p1)
      : "0%";


  $("op2Pct").textContent =
    pending
      ? "--"
      : pct(p2);


  $("op3Pct").textContent =
    pct(p3);


  /*
   * Barras
   */

  $("op1Fill").style.width =
    hasTarget
      ? `${Math.min(
          p1 / 130 * 100,
          100
        )}%`
      : "0%";


  $("op2Fill").style.width =
    pending
      ? "0%"
      : `${Math.min(
          p2 / 130 * 100,
          100
        )}%`;


  $("op3Fill").style.width =
    `${Math.min(
      p3 / 130 * 100,
      100
    )}%`;


  /*
   * Cumplimiento global
   */

  $("opGlobalCard").textContent =
    pct(globalPercent);


  $("globalHuge").textContent =
    pct(globalPercent);


  $("opGlobalSub").textContent =
    pending
      ? "Orientativo"
      : "Completo";


  $("opGlobalPending").textContent =
    pending
      ? "Pendiente: dato Nedgia"
      : "Con dato Nedgia";


  $("globalMarker").style.left =
    `${Math.min(
      globalPercent / 130 * 100,
      98
    )}%`;


  /*
   * Mensaje progreso
   */

  if (!hasTarget) {

    $("globalHelp").textContent =
      "Introduce tu objetivo OP1 para comenzar.";

  } else if (
    globalPercent < 70
  ) {

    $("globalHelp").textContent =
      `Te faltan ${pct(
        70 - globalPercent
      )} para empezar a devengar OP.`;

  } else if (
    globalPercent < 100
  ) {

    $("globalHelp").textContent =
      `Has superado el mínimo. Te faltan ${pct(
        100 - globalPercent
      )} para el 100%.`;

  } else {

    $("globalHelp").textContent =
      "Estás por encima del 100%.";

  }


  /*
   * Variable OP
   */

  if (pending) {

    $("rvOp").textContent =
      "----- €";

    $("rvStatus").textContent =
      "Pendiente de dato Nedgia";

  } else if (!hasTarget) {

    $("rvOp").textContent =
      "----- €";

    $("rvStatus").textContent =
      "Introduce tu objetivo OP1";

  } else {

    $("rvOp").textContent =
      euro(
        calculateRvOp(
          globalPercent
        )
      );


    $("rvStatus").textContent =
      globalPercent < 70
        ? "Por debajo del umbral"
        : "Estimación OP";

  }


  /*
   * Ritmo
   */

  const days =
    remainingDays();


  $("daysLeft").textContent =
    `Quedan ${days} días para el 31/12/2026`;


  if (hasTarget) {

    $("daily100").textContent =
      (
        missingAmount(
          100,
          op1,
          targetOp1
        ) / days
      )
        .toFixed(2)
        .replace(".", ",");


    $("daily130").textContent =
      (
        missingAmount(
          130,
          op1,
          targetOp1
        ) / days
      )
        .toFixed(2)
        .replace(".", ",");

  } else {

    $("daily100").textContent =
      "0";

    $("daily130").textContent =
      "0";

  }


  /*
   * Hitos
   */

  if (!hasTarget) {

    $("miss70").textContent =
      "--";

    $("miss100").textContent =
      "--";

    $("miss130").textContent =
      "--";

  } else {

    $("miss70").textContent =
      `Te faltan ${pct(
        Math.max(
          0,
          70 - globalPercent
        )
      )}`;


    $("miss100").textContent =
      `Te faltan ${pct(
        Math.max(
          0,
          100 - globalPercent
        )
      )}`;


    $("miss130").textContent =
      `Te faltan ${pct(
        Math.max(
          0,
          130 - globalPercent
        )
      )}`;

  }


  renderScenarios(
    op1,
    op3,
    targetOp1
  );
}


/* =========================================================
   ESCENARIOS
========================================================= */

function renderScenarios(
  op1,
  op3,
  targetOp1
) {

  const scenarios = [
    ["Pesimista", 90],
    ["Conservador", 100],
    ["Optimista", 110],
    ["Muy optimista", 130]
  ];


  const hasTarget =
    Number.isFinite(targetOp1)
    && targetOp1 > 0;


  /*
   * Mientras el usuario no indique
   * su objetivo OP1 no mostramos
   * escenarios engañosos.
   */

  if (!hasTarget) {

    $("scenarios").innerHTML =
      `<div class="scenario">
        <div>
          <b>Introduce tu objetivo OP1</b>
          <small>
            Los escenarios aparecerán automáticamente.
          </small>
        </div>
      </div>`;


    $("totalScenarios").innerHTML =
      `<div>
        <span>Pendiente</span>
        <strong>-- €</strong>
      </div>`;

    return;
  }


  $("scenarios").innerHTML =
    scenarios.map(
      ([name, nedgiaPercent]) => {

        const op2 =
          GOALS.op2.target
          * nedgiaPercent
          / 100;


        const globalPercent =
          calculateGlobal(
            op1,
            op2,
            op3,
            targetOp1
          );


        return `
          <div class="scenario">

            <div>
              <b>${name}</b>
              <small>
                Nedgia ${nedgiaPercent}%
              </small>
            </div>

            <div>
              <small>
                Cumplimiento OP
              </small>
              <b>
                ${pct(globalPercent)}
              </b>
            </div>

            <div>
              <small>
                RV OP
              </small>
              <b class="money">
                ${euro(
                  calculateRvOp(
                    globalPercent
                  )
                )}
              </b>
            </div>

          </div>
        `;

      }
    ).join("");


  $("totalScenarios").innerHTML =
    scenarios.map(
      ([name, nedgiaPercent]) => {

        const op2 =
          GOALS.op2.target
          * nedgiaPercent
          / 100;


        const globalPercent =
          calculateGlobal(
            op1,
            op2,
            op3,
            targetOp1
          );


        const total =
          calculateRvOp(
            globalPercent
          )
          + RVOUS100
          + AP100;


        return `
          <div>
            <span>${name}</span>
            <strong>
              ${euro(total)}
            </strong>
          </div>
        `;

      }
    ).join("");
}


/* =========================================================
   SIMULADOR
========================================================= */

function renderSimulator() {

  const targetOp1 =
    getCurrentTargetForCalculations();


  const op1 =
    Number(
      $("simOp1").value
    ) || 0;


  const op2 =
    Number(
      $("simOp2").value
    ) || 0;


  const op3 =
    Number(
      $("simOp3").value
    ) || 0;


  if (
    !Number.isFinite(targetOp1)
    || targetOp1 <= 0
  ) {

    $("simPct").textContent =
      "0%";

    $("simRv").textContent =
      euro(0);

    return;
  }


  const globalPercent =
    calculateGlobal(
      op1,
      op2,
      op3,
      targetOp1
    );


  $("simPct").textContent =
    pct(globalPercent);


  $("simRv").textContent =
    euro(
      calculateRvOp(
        globalPercent
      )
    );
}


/* =========================================================
   RENDER GENERAL
========================================================= */

function renderAll() {

  renderDashboard();

  renderSimulator();

  renderDate();

}


/* =========================================================
   EVENTOS
========================================================= */

function bindEvents() {

  $("saveBtn")
    .addEventListener(
      "click",
      saveData
    );


  [
    "op1TargetEdit",
    "op1Actual",
    "op2Actual",
    "op3Actual",
    "nedgiaPendiente"
  ].forEach(id => {

    $(id).addEventListener(
      "input",
      () => {

        if (
          id === "op1TargetEdit"
        ) {

          $(id)
            .classList
            .remove("invalid");

        }

        renderAll();

      }
    );

  });


  [
    "simOp1",
    "simOp2",
    "simOp3"
  ].forEach(id => {

    $(id).addEventListener(
      "input",
      renderSimulator
    );

  });

}


/* =========================================================
   INICIO
========================================================= */

function init() {

  loadData();


  $("simOp1").value =
    $("op1Actual").value;


  $("simOp3").value =
    $("op3Actual").value;


  $("simOp2").value =
    $("op2Actual").value || 6500;


  bindEvents();

  renderAll();

}


init();
