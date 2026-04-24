let mesasData = [];
let equiposData = [];
let selectedMesa = null;
let selectedMesaElement = null;

const cardList = document.getElementById('card-list');
const mq = window.matchMedia('(min-width: 768px)');

// Configuración de layouts según distribución
const layoutConfig = {
  '5:5': {
    left:  [1,2,3,4,5],
    right: [6,7,8,9,10],
  },
  '3:5': {
    left:  [1,2,3],
    right: [4,5,6,7,8],
  },
  '0:5': {
    left:  [],
    right: [1,2,3,4,5],
  },
  '1:4': {
    left:  [1],
    right: [2,3,4,5],
  },
  '5:4': {
    left:  [1,2,3,4,5],
    right: [6,7,8,9],
  }
};

const layoutOptions = {
  extrasMode: 'hide',
  stackOrder: 'topToBottom',
  alignLandscape: 'left',
  maxPerSide: 5,
};

async function loadData() {
  try {
    const mesasResponse = await fetch('mesas.json');
    const equiposResponse = await fetch('equipos.json');
    
    if (!mesasResponse.ok || !equiposResponse.ok) {
      throw new Error('Error cargando archivos JSON');
    }
    
    mesasData = await mesasResponse.json();
    equiposData = await equiposResponse.json();
    
    renderMesasCards();
  } catch (error) {
    console.error('Error al cargar datos:', error);
    cardList.innerHTML = '<p>Error cargando los datos. Verifica los archivos JSON.</p>';
  }
}

function renderMesasCards() {
  cardList.innerHTML = '';
  selectedMesa = null;
  selectedMesaElement = null;

  mesasData.forEach((mesa) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.dataset.mesaId = mesa.id;
    card.innerHTML = `
      <h2>${mesa.mesa}</h2>
      <p><strong>Equipos </strong> (${mesa.posiciones})</p>
      `;
/*       <p><strong>Distribución:</strong> ${mesa.distrib}</p> */

    card.addEventListener('click', () => toggleMesaDetail(card, mesa));
    cardList.appendChild(card);

    // Crear contenedor de equipos expandible
    const equiposWrapper = document.createElement('div');
    equiposWrapper.className = 'equipos-expandidos hidden';
    equiposWrapper.dataset.mesaId = mesa.id;
    equiposWrapper.dataset.layout = mesa.distrib;
    equiposWrapper.innerHTML = `
      <div class="equipos-container">
        <div id="grid-${mesa.id}" class="equipos-grid"></div>
      </div>
    `;
    cardList.appendChild(equiposWrapper);
  });
}

function toggleMesaDetail(cardElement, mesa) {
  // Si ya está seleccionada, deseleccionar
  if (selectedMesa && selectedMesa.id === mesa.id) {
    hideMesaDetail(mesa.id);
    return;
  }

  // Cerrar selección anterior si existe
  if (selectedMesa && selectedMesaElement) {
    hideMesaDetail(selectedMesa.id);
  }

  // Mostrar nueva selección
  showMesaDetail(cardElement, mesa);
}

function showMesaDetail(cardElement, mesa) {
  selectedMesa = mesa;
  selectedMesaElement = cardElement;

  const equiposRelacionados = equiposData.filter(
    (equipo) => equipo.mesaId === mesa.id
  );

  // Encontrar el contenedor de equipos correspondiente
  const equiposWrapper = cardList.querySelector(`[data-mesa-id="${mesa.id}"].equipos-expandidos`);
  const gridContainer = equiposWrapper.querySelector(`#grid-${mesa.id}`);

  // Limpiar grid
  gridContainer.innerHTML = '';

  // Crear tarjetas de equipo
  equiposRelacionados.forEach((equipo) => {
    const equipoCard = document.createElement('button');
    equipoCard.type = 'button';
    equipoCard.className = 'card card-equipo';
    equipoCard.dataset.equipoId = equipo.id;
    equipoCard.dataset.id = equipo.posicion;
    equipoCard.innerHTML = `
      <h3>${equipo.nombre}</h3>
      `;
      //<p><strong>Pos:</strong> ${equipo.posicion}</p>

    if (equipo.activo) {
      equipoCard.addEventListener('click', (e) => {
        e.stopPropagation();
        selectEquipo(equipo);
      });
    } else {
      equipoCard.classList.add('is-empty');
      equipoCard.disabled = true;
    }
    gridContainer.appendChild(equipoCard);
  });

  // Mostrar contenedor y aplicar layout
  equiposWrapper.classList.remove('hidden');
  cardElement.classList.add('mesa-selected');
  applyLayout(gridContainer, mesa.distrib);

  // Scroll suave
  equiposWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideMesaDetail(mesaId) {
  const equiposWrapper = cardList.querySelector(`[data-mesa-id="${mesaId}"].equipos-expandidos`);
  if (equiposWrapper) {
    equiposWrapper.classList.add('hidden');
  }
  const cardElement = cardList.querySelector(`[data-mesa-id="${mesaId}"].card`);
  if (cardElement) {
    cardElement.classList.remove('mesa-selected');
  }
  selectedMesa = null;
  selectedMesaElement = null;
}

function applyLayout(gridContainer, layoutKey) {
  const cfg = layoutConfig[layoutKey];
  if (!cfg) return;

  const cards = Array.from(gridContainer.querySelectorAll('.card-equipo'));
  const byPosition = new Map(cards.map(el => [Number(el.dataset.id), el]));

  const mode = mq.matches ? 'landscape' : 'portrait';
  const leftIds = cfg.left || [];
  const rightIds = cfg.right || [];
  const hasLeft = leftIds.length > 0;
  const hasRight = rightIds.length > 0;
  const singleAxis = !(hasLeft && hasRight);

  // Reset
  cards.forEach(el => {
    // el.classList.remove('is-hidden', 'is-empty');
    el.style.gridColumn = '';
    el.style.gridRow = '';
  });

  if (mode === 'portrait') {
    if (singleAxis) {
      const ids = hasLeft ? leftIds : rightIds;
      const rows = Math.max(ids.length, 1);
      gridContainer.style.gridTemplateColumns = '1fr';
      gridContainer.style.gridTemplateRows = `repeat(${rows}, auto)`;
      placeStack1D(byPosition, ids, 'col', rows);
    } else {
      const rows = Math.max(leftIds.length, rightIds.length, 1);
      gridContainer.style.gridTemplateColumns = '1fr 1fr';
      gridContainer.style.gridTemplateRows = `repeat(${rows}, auto)`;
      placeStackColumn(byPosition, leftIds, 1, rows);
      placeStackColumn(byPosition, rightIds, 2, rows);
    }
  } else {
    // Landscape (pantalla grande)
    if (singleAxis) {
      const ids = hasLeft ? leftIds : rightIds;
      const cols = Math.max(ids.length, 1);
      gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      gridContainer.style.gridTemplateRows = 'auto';
      placeStack1D(byPosition, ids, 'row', cols);
    } else {
      // Para 2 ejes en landscape: distribuir mejor en el ancho disponible
      const containerWidth = gridContainer.parentElement.offsetWidth - 48; // Restar padding
      const minCardWidth = 140; // Ancho mínimo de tarjeta + gap
      const availableCols = Math.max(leftIds.length, rightIds.length, 1);  // (Math.floor(containerWidth / minCardWidth), 3));
      
      // Distribuir equipos en columnas de forma más equilibrada
      const totalEquipos = leftIds.length + rightIds.length;
      const cols = Math.min(availableCols, totalEquipos);      
      // Calcular filas necesarias
      const rows = Math.ceil(totalEquipos / cols);
      
      gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      gridContainer.style.gridTemplateRows = `repeat(${rows}, auto)`;
      
      // Colocar todos los equipos de forma lineal para mejor distribución visual
      let col = 1;
      let row = 1;
      
      // Primero equipos de right
      rightIds.forEach((id) => {
        const el = byPosition.get(id);
        if (!el) return;
        el.style.gridColumn = col;
        el.style.gridRow = row;
        col++;
        if (col > cols || col > cfg.right.length) {
          col = 1;
          row++;
        }
      });
      
      // Luego equipos de left
      leftIds.forEach((id) => {
        const el = byPosition.get(id);
        if (!el) return;
        el.style.gridColumn = col;
        el.style.gridRow = row;
        col++;
        if (col > cols) {
          col = 1;
          row++;
        }
      });
    }
  }
}

function placeStackColumn(byPosition, ids, col, totalRows) {
  const list = normalizeOrder(ids, totalRows);
  list.forEach((id, idx) => {
    const el = byPosition.get(id);
    if (!el) return;
    el.style.gridColumn = col;
    el.style.gridRow = idx + 1;
  });
}

function placeStackRow(byPosition, ids, row, totalCols) {
  const list = normalizeOrder(ids, totalCols, true);
  const startCol = computeStart(totalCols, ids.length);
  list.forEach((id, idx) => {
    const el = byPosition.get(id);
    if (!el) return;
    el.style.gridRow = row;
    el.style.gridColumn = startCol + idx;
  });
}

function placeStack1D(byPosition, ids, axis, count) {
  const list = normalizeOrder(ids, count, axis === 'row');
  const start = computeStart(count, ids.length);
  list.forEach((id, idx) => {
    const el = byPosition.get(id);
    if (!el) return;
    if (axis === 'col') {
      el.style.gridColumn = 1;
      el.style.gridRow = start + idx;
    } else {
      el.style.gridRow = 1;
      el.style.gridColumn = start + idx;
    }
  });
}

function normalizeOrder(ids, maxSlots, isLandscape = false) {
  let list = [...ids];
  if (layoutOptions.stackOrder === 'bottomToTop') {
    list = list.reverse();
  }
  if (isLandscape && list.length > layoutOptions.maxPerSide) {
    list = list.slice(0, layoutOptions.maxPerSide);
  }
/*   console.log('IDs antes de ordenar:', ids);
  console.log('IDs ordenados para layout:', list); */
  return list;
}

function computeStart(totalSlots, usedSlots) {
  if (layoutOptions.alignLandscape !== 'center') return 1;
  const free = totalSlots - usedSlots;
  return 1 + Math.floor(free / 2);
}

function selectEquipo(equipo) {
  const formUrl = buildFormUrl(selectedMesa, equipo);
  // console.log('URL generada:', formUrl);
  // alert(`Equipo seleccionado: ${equipo.nombre}\n\nURL del formulario:\n${formUrl}`);
  // window.location.href = formUrl; // Descomentar para redirigir al formulario
}

function buildFormUrl(mesa, equipo) {
  const baseUrl = 'https://forms.office.com/Pages/ResponsePage.aspx';
  const params = new URLSearchParams({
    // 'mesa': mesa.mesa,
    'id': "t3MfOZClrUOY8IsFCYrMyJ0kez3gW0dBm3VfYHvC51hUMzc4OEtNN1RMNlcyNjNURVJQVDIxM0RGUi4u",
    'r54c22649fe74475ca36d0589c07c95d5': encodeURIComponent(equipo.nombre),
    'rf5b8727fc3ae40ceaca472193b0b4332': "Si",
  });
  console.log(params.toString());
  return `${baseUrl}?${params.toString()}`;
}

mq.addEventListener('change', () => {
  if (selectedMesa) {
    const gridContainer = cardList.querySelector(`#grid-${selectedMesa.id}`);
    if (gridContainer) {
      applyLayout(gridContainer, selectedMesa.distrib);
    }
  }
});

// Event delegation para cerrar expansión al hacer click fuera
document.addEventListener('click', (e) => {
  if (selectedMesa && !e.target.closest('.card') && !e.target.closest('.equipos-expandidos')) {
    if (!e.target.closest('.card-equipo')) {
      hideMesaDetail(selectedMesa.id);
    }
  }
});

loadData();
