
const TOTAL = 10;
const MAX_PER_SIDE = 5;
const mq = window.matchMedia("(min-width: 768px)");

/**
 * Configuración:
 * left:  ids de posiciones en columna izquierda
 * right: ids de posiciones en columna derecha
 * (si left/right no incluyen todas, el resto serán "extra")
 */
const layoutConfig = {
  "5:5": {
    left:  [1,2,3,4,5],
    right: [6,7,8,9,10],
  },
  "3:5": {
    left:  [1,2,3],
    right: [4,5,6,7,8],
  },
  "0:5": {
    left:  [],
    right: [1,2,3,4,5],
  },
  "1:4": {
    left:  [1],
    right: [2,3,4,5],
  },
  "5:4": {
    left:  [1,2,3,4,5],
    right: [6,7,8,9],
  }
};

/**
 * OPCIONES DE COMPORTAMIENTO
 * - extrasMode: "hide" | "empty"
 *   hide  -> no se muestran
 *   empty -> se muestran como placeholders (borde dashed)
 *
 * - stackOrder: "topToBottom" | "bottomToTop"
 *   cómo apilas dentro de la columna (portrait) o dentro del renglón (landscape)
 */
const options = {
  extrasMode: "hide",
  stackOrder: "topToBottom",
  alignLandscape: "left", // "left" | "center" (si quieres centrar cuando hay menos de 5)
};

function setLayout(key){
  document.querySelector(".equipos-expandidos").dataset.layout = key;
  applyLayout();
}

function applyLayout(){
  const mesa = document.querySelector(".equipos-expandidos");
  const key = mesa.dataset.layout;
  const cfg = layoutConfig[key];
  if(!cfg) return;

  // Validación básica (por seguridad)
  if(cfg.left.length > MAX_PER_SIDE || cfg.right.length > MAX_PER_SIDE){
    console.warn("Un lado excede MAX_PER_SIDE=5");
  }

  const grid = document.getElementById("grid");
  const cards = Array.from(grid.querySelectorAll(".card-equipo"));
  const byId = new Map(cards.map(el => [Number(el.dataset.id), el]));

  // Determinar orientación
  const mode = mq.matches ? "landscape" : "portrait";

  // Calcular extras (ids no incluidos en left/right)
  const used = new Set([...cfg.left, ...cfg.right]);
  const extras = [];
  for(let i=1; i<=TOTAL; i++){
    if(!used.has(i)) extras.push(i);
  }

  // Preparar listas finales según extrasMode
  const leftIds  = [...cfg.left];
  const rightIds = [...cfg.right];

  // Puedes decidir si extras se van a un “tercer” lugar;
  // aquí por simplicidad: se tratan como no visibles o placeholders.
  // (si quisieras, también podríamos “rellenar” primero right y luego left hasta 5)
  // ----

  // Reset visual
  cards.forEach(el => {
    el.classList.remove("is-hidden","is-empty");
    el.style.gridColumn = "";
    el.style.gridRow = "";
    el.style.display = "flex";
  });

  // Ocultar o marcar extras
  extras.forEach(id => {
    const el = byId.get(id);
    if(!el) return;
    if(options.extrasMode === "hide"){
      el.classList.add("is-hidden");
    }else{
      el.classList.add("is-empty");
    }
  });

  // Decide si es “single axis”
  const hasLeft = leftIds.length > 0;
  const hasRight = rightIds.length > 0;
  const singleAxis = !(hasLeft && hasRight); // si uno es 0 → true

  if(mode === "portrait"){
    // Portrait: columnas
    if(singleAxis){
      // 1 sola columna
      const ids = hasLeft ? leftIds : rightIds;
      const rows = Math.max(ids.length, 1);

      grid.style.gridTemplateColumns = `1fr`;
      grid.style.gridTemplateRows = `repeat(${rows}, auto)`;

      placeStack1D(byId, ids, "col", 1, rows);
    }else{
      // 2 columnas: izquierda y derecha
      const rows = Math.max(leftIds.length, rightIds.length, 1);

      grid.style.gridTemplateColumns = `1fr 1fr`;
      grid.style.gridTemplateRows = `repeat(${rows}, auto)`;

      placeStackColumn(byId, leftIds, 1, rows);
      placeStackColumn(byId, rightIds, 2, rows);
    }
  }else{
    // Landscape: renglones (máximo 5 columnas visuales)
    if(singleAxis){
      // 1 solo renglón
      const ids = hasLeft ? leftIds : rightIds;
      const cols = Math.max(ids.length, 1);

      grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      grid.style.gridTemplateRows = `auto`;

      placeStack1D(byId, ids, "row", 1, cols);
    }else{
      // 2 renglones: arriba derecha, abajo izquierda (como la idea 5x2)
      // cols se define por el máximo entre ambos, limitado a 5
      const cols = Math.min(Math.max(leftIds.length, rightIds.length, 1), MAX_PER_SIDE);

      grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      grid.style.gridTemplateRows = `auto auto`;

      placeStackRow(byId, rightIds, 1, cols); // fila 1
      placeStackRow(byId, leftIds,  2, cols); // fila 2
    }
  }
}

// Coloca una lista en una columna específica, apilando en filas
function placeStackColumn(byId, ids, col, totalRows){
  const list = normalizeOrder(ids, totalRows);
  list.forEach((id, idx) => {
    const el = byId.get(id);
    if(!el) return;
    el.style.gridColumn = col;
    el.style.gridRow = idx + 1;
  });
}

// Coloca una lista en una fila específica, apilando en columnas
function placeStackRow(byId, ids, row, totalCols){
  const list = normalizeOrder(ids, totalCols, true);
  const startCol = computeStart(totalCols, ids.length);

  list.forEach((id, idx) => {
    const el = byId.get(id);
    if(!el) return;
    el.style.gridRow = row;
    el.style.gridColumn = startCol + idx;
  });
}

// Para el caso 1D (una sola columna o un solo renglón)
function placeStack1D(byId, ids, axis, fixedIndex, count){
  const list = normalizeOrder(ids, count, axis==="row");
  const start = computeStart(count, ids.length);

  list.forEach((id, idx) => {
    const el = byId.get(id);
    if(!el) return;
    if(axis === "col"){
      el.style.gridColumn = 1;
      el.style.gridRow = start + idx;
    }else{
      el.style.gridRow = 1;
      el.style.gridColumn = start + idx;
    }
  });
}

// Orden (topToBottom / bottomToTop) y padding para que no “brinque”
function normalizeOrder(ids, maxSlots, isLandscape=false){
  let list = [...ids];

  if(options.stackOrder === "bottomToTop"){
    list = list.reverse();
  }

  // Si quieres forzar máximo 5 en landscape:
  if(isLandscape && list.length > MAX_PER_SIDE){
    list = list.slice(0, MAX_PER_SIDE);
  }

  // No necesitamos rellenar con “null” porque solo colocamos las existentes.
  return list;
}

// Alineación en landscape cuando hay menos de totalCols (left / center)
function computeStart(totalSlots, usedSlots){
  if(options.alignLandscape !== "center") return 1;
  const free = totalSlots - usedSlots;
  return 1 + Math.floor(free/2);
}

mq.addEventListener("change", applyLayout);
window.addEventListener("load", applyLayout);
