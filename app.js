let mesasData = [];
let equiposData = [];
let selectedMesa = null;

const cardList = document.getElementById('card-list');
const detailSection = document.getElementById('detail-section');
const detailTitle = document.getElementById('detail-title');
const detailDescription = document.getElementById('detail-description');
const backButton = document.getElementById('back-button');

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
  detailSection.classList.add('hidden');
  selectedMesa = null;

  mesasData.forEach((mesa) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.dataset.mesaId = mesa.id;
    card.innerHTML = `
      <h2>${mesa.mesa}</h2>
      <p><strong>Posiciones:</strong> ${mesa.posiciones}</p>
      <p><strong>Distribución:</strong> ${mesa.distrib}</p>
    `;

    card.addEventListener('click', () => showMesaDetail(mesa));
    cardList.appendChild(card);
  });
}

function showMesaDetail(mesa) {
  selectedMesa = mesa;
  
  const equiposRelacionados = equiposData.filter(
    (equipo) => equipo.mesaId === mesa.id && equipo.activo === true
  );

  detailTitle.textContent = `${mesa.mesa} - Equipos (${equiposRelacionados.length})`;
  
  let detailHTML = `
    <div class="mesa-info">
      <p><strong>Posiciones:</strong> ${mesa.posiciones}</p>
      <p><strong>Distribución:</strong> ${mesa.distrib}</p>
    </div>
    <div id="equipos-container" class="card-list-secondary"></div>
  `;
  
  detailDescription.innerHTML = detailHTML;
  detailSection.classList.remove('hidden');

  const equiposContainer = document.getElementById('equipos-container');
  equiposRelacionados.forEach((equipo) => {
    const equipoCard = document.createElement('button');
    equipoCard.type = 'button';
    equipoCard.className = 'card card-secondary';
    equipoCard.dataset.equipoId = equipo.id;
    equipoCard.innerHTML = `
      <h3>${equipo.nombre}</h3>
      <p><strong>Posición:</strong> ${equipo.posicion}</p>
    `;

    equipoCard.addEventListener('click', () => selectEquipo(equipo));
    equiposContainer.appendChild(equipoCard);
  });

  window.scrollTo({ top: detailSection.offsetTop - 24, behavior: 'smooth' });
}

function selectEquipo(equipo) {
  const formUrl = buildFormUrl(selectedMesa, equipo);
  console.log('URL generada:', formUrl);
  alert(`Equipo seleccionado: ${equipo.nombre}\n\nURL del formulario:\n${formUrl}`);
  // window.location.href = formUrl; // Descomentar para redirigir al formulario
}

function buildFormUrl(mesa, equipo) {
  const baseUrl = 'https://forms.microsoft.com/Pages/ResponsePage.aspx'; // Reemplazar con URL real
  const params = new URLSearchParams({
    'mesa': mesa.mesa,
    'nombre_equipo': equipo.nombre,
    'posicion': equipo.posicion,
    'fecha': new Date().toISOString().split('T')[0],
  });
  return `${baseUrl}?${params.toString()}`;
}

backButton.addEventListener('click', () => {
  detailSection.classList.add('hidden');
  selectedMesa = null;
});

loadData();
