/* ===================================================
   UrbanMap Joinville — app.js
   Mapa interativo de ruas com Leaflet + PolylineDecorator
   =================================================== */

// ── Configuração geral ──────────────────────────────
const CONFIG = {
  centro:  [-26.3044, -48.8487],
  zoom:    15,
  geojson: 'data/ruas.geojson',

  estilos: {
    normal: {
      color:   '#4a90d9',
      weight:  3,
      opacity: 0.75,
      lineCap: 'round',
      lineJoin:'round',
    },
    hover: {
      color:   '#1a73e8',
      weight:  4,
      opacity: 0.9,
    },
    ativo: {
      color:   '#1a73e8',
      weight:  5,
      opacity: 1,
    },
  },
};

// ── Dados embutidos (fallback quando aberto via file://) ──
const RUAS_FALLBACK = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        nome:      'Rua XV de Novembro',
        sentido:   'pedestrian',
        tipo:      'Calçadão',
        descricao: 'Calçadão histórico do centro de Joinville, espaço de convivência e comércio.',
        imagem:    'streetmix/rua-xv.svg',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-48.8545, -26.3028],
          [-48.8515, -26.3026],
          [-48.8485, -26.3024],
          [-48.8455, -26.3022],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        nome:      'Rua Princesa Isabel',
        sentido:   'oneway',
        tipo:      'Via coletora',
        descricao: 'Via coletora com ciclofaixa e calçadas arborizadas.',
        imagem:    'streetmix/rua-princesa-isabel.svg',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-48.8487, -26.2988],
          [-48.8487, -26.3010],
          [-48.8487, -26.3044],
          [-48.8487, -26.3080],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        nome:      'Avenida Beira Rio',
        sentido:   'twoway',
        tipo:      'Avenida',
        descricao: 'Avenida marginal ao Rio Cachoeira com ciclovia e canteiro central.',
        imagem:    'streetmix/rua-beira-rio.svg',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-48.8570, -26.3110],
          [-48.8535, -26.3085],
          [-48.8500, -26.3060],
          [-48.8465, -26.3042],
          [-48.8435, -26.3030],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        nome:      'Rua João Pessoa',
        sentido:   'oneway',
        tipo:      'Via local',
        descricao: 'Via local de acesso residencial com estacionamento lateral.',
        imagem:    'streetmix/rua-joao-pessoa.svg',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-48.8462, -26.2992],
          [-48.8460, -26.3020],
          [-48.8458, -26.3055],
          [-48.8456, -26.3085],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        nome:      'Av. Hermann August Lepper',
        sentido:   'twoway',
        tipo:      'Avenida',
        descricao: 'Avenida estrutural com quatro faixas e canteiro central ajardinado.',
        imagem:    'streetmix/rua-lepper.svg',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-48.8525, -26.2965],
          [-48.8518, -26.2995],
          [-48.8510, -26.3025],
          [-48.8502, -26.3055],
          [-48.8494, -26.3085],
        ],
      },
    },
  ],
};

// ── Estado da aplicação ─────────────────────────────
const estado = {
  map:         null,
  camadaAtiva: null,   // layer selecionada
  decorator:   null,   // PolylineDecorator atual
  ruaAtual:    null,   // props da rua aberta no painel
};

// Map de layers por firestoreId para remoção precisa
const layersPorId = new Map();

// Imagens personalizadas por nome de rua (sessão local)
const imagensPersonalizadas = new Map();

// Índice de busca: { nome, tipo, sentido, layer, props }[]
const indiceBusca = [];

// ── Inicialização ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  inicializarMapa();
  document.getElementById('close-panel').addEventListener('click', fecharPainel);
  inicializarPesquisa();
  inicializarImportacao();
  inicializarAdicionarRua();
  inicializarDelete();
  inicializarLightbox();
  inicializarListaPanel();
});

function inicializarMapa() {
  estado.map = L.map('map', {
    center:      CONFIG.centro,
    zoom:        CONFIG.zoom,
    zoomControl: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(estado.map);

  L.control.zoom({ position: 'bottomright' }).addTo(estado.map);

  // Inicia listener em tempo real do Firestore
  iniciarListenerFirestore();
}

// ── Firestore: listener em tempo real ───────────────
function iniciarListenerFirestore() {
  // Mostra indicador de carregamento inicial
  document.getElementById('streets-list').innerHTML =
    '<li class="list-empty">Conectando à nuvem…</li>';

  window.db.collection('ruas')
    .orderBy('criadoEm', 'asc')
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            adicionarRuaDoFirestore(change.doc);
          }
          if (change.type === 'removed') {
            removerRuaDoMapa(change.doc.id);
          }
          if (change.type === 'modified') {
            removerRuaDoMapa(change.doc.id);
            adicionarRuaDoFirestore(change.doc);
          }
        });
        renderizarListaRuas();
      },
      async (erro) => {
        console.warn('Firestore indisponível, usando dados locais.', erro);
        // Fallback offline: carrega dados embutidos
        await carregarRuasLocais();
      }
    );
}

function adicionarRuaDoFirestore(doc) {
  const dados = doc.data();
  let geometry;
  try {
    geometry = JSON.parse(dados.geometriaJson);
  } catch {
    return;
  }

  const props = {
    firestoreId: doc.id,
    nome:        dados.nome    || '',
    bairro:      dados.bairro  || '',
    tipo:        dados.tipo    || 'Via local',
    sentido:     dados.sentido || 'twoway',
    descricao:   dados.descricao || '',
    imagem:      dados.imagem  || '',
  };

  const feature = { type: 'Feature', properties: props, geometry };

  const layer = L.geoJSON(feature, {
    style:         () => CONFIG.estilos.normal,
    onEachFeature: configurarEventos,
  }).addTo(estado.map);

  layersPorId.set(doc.id, layer);

  layer.eachLayer(l => {
    indiceBusca.push({ nome: props.nome, tipo: props.tipo, sentido: props.sentido, layer: l, props });
  });
}

function removerRuaDoMapa(firestoreId) {
  const layer = layersPorId.get(firestoreId);
  if (!layer) return;

  estado.map.removeLayer(layer);
  layersPorId.delete(firestoreId);

  // Remove do índice de busca
  const idx = indiceBusca.findIndex(r => r.props.firestoreId === firestoreId);
  if (idx !== -1) indiceBusca.splice(idx, 1);

  // Fecha painel se era a rua aberta
  if (estado.ruaAtual?.firestoreId === firestoreId) {
    fecharPainel();
  }
}

// Fallback offline — carrega dados embutidos sem Firestore
async function carregarRuasLocais() {
  let data;
  try {
    const resp = await fetch(CONFIG.geojson);
    if (!resp.ok) throw new Error();
    data = await resp.json();
  } catch {
    data = RUAS_FALLBACK;
  }

  data.features.forEach(feature => {
    const props = { ...feature.properties, firestoreId: null };
    const layer = L.geoJSON({ ...feature, properties: props }, {
      style:         () => CONFIG.estilos.normal,
      onEachFeature: configurarEventos,
    }).addTo(estado.map);

    layer.eachLayer(l => {
      indiceBusca.push({ nome: props.nome, tipo: props.tipo, sentido: props.sentido, layer: l, props });
    });
  });
  renderizarListaRuas();
}

// ── Eventos por feature ─────────────────────────────
function configurarEventos(feature, layer) {
  const props = feature.properties;

  // Tooltip com nome + bairro
  const tooltipContent = props.bairro
    ? `<strong>${props.nome}</strong><br><span style="font-size:11px;opacity:.75">${props.bairro}</span>`
    : props.nome;
  layer.bindTooltip(tooltipContent, {
    permanent:  false,
    sticky:     true,
    direction:  'top',
    className:  'rua-tooltip',
    offset:     [0, -6],
  });

  layer.on({
    click:     (e) => aoClicar(e, layer, props),
    mouseover: (e) => aoPassarMouse(e, layer),
    mouseout:  (e) => aoSairMouse(e, layer),
  });
}

// ── Click: selecionar rua ───────────────────────────
function aoClicar(e, layer, props) {
  if (e.originalEvent) L.DomEvent.stopPropagation(e);

  // Desfaz seleção anterior
  if (estado.camadaAtiva && estado.camadaAtiva !== layer) {
    estado.camadaAtiva.setStyle(CONFIG.estilos.normal);
  }

  // Remove decorator anterior
  removerDecorator();

  // Aplica estilo ativo
  layer.setStyle(CONFIG.estilos.ativo);
  layer.bringToFront();
  estado.camadaAtiva = layer;

  // Adiciona setas de direção
  adicionarSetas(layer, props.sentido);

  // Abre painel lateral
  abrirPainel(props);
}

// ── Hover ───────────────────────────────────────────
function aoPassarMouse(e, layer) {
  if (layer !== estado.camadaAtiva) {
    layer.setStyle(CONFIG.estilos.hover);
    layer.bringToFront();
  }
  estado.map.getContainer().style.cursor = 'pointer';
}

function aoSairMouse(e, layer) {
  if (layer !== estado.camadaAtiva) {
    layer.setStyle(CONFIG.estilos.normal);
  }
  estado.map.getContainer().style.cursor = '';
}

// ── Setas de direção (PolylineDecorator) ────────────
function adicionarSetas(layer, sentido) {
  if (sentido === 'pedestrian') return; // calçadão não tem setas

  const arrowOpts = {
    pixelSize:   18,
    polygon:     false,
    pathOptions: {
      color:   '#e53935',
      weight:  4,
      opacity: 1,
    },
  };

  let patterns = [];

  if (sentido === 'oneway') {
    patterns = [
      {
        offset:  '10%',
        repeat:  '18%',
        symbol:  L.Symbol.arrowHead({ ...arrowOpts }),
      },
    ];
  } else if (sentido === 'twoway') {
    // Setas para frente
    patterns = [
      {
        offset:  '10%',
        repeat:  '22%',
        symbol:  L.Symbol.arrowHead({ ...arrowOpts }),
      },
    ];
  }

  if (patterns.length > 0) {
    estado.decorator = L.polylineDecorator(layer, { patterns }).addTo(estado.map);
  }
}

function removerDecorator() {
  if (estado.decorator) {
    estado.map.removeLayer(estado.decorator);
    estado.decorator = null;
  }
}

// ── Painel lateral ──────────────────────────────────
function abrirPainel(props) {
  estado.ruaAtual = props;

  // Nome
  document.getElementById('panel-street-name').textContent = props.nome;

  // Badge de sentido
  const badge = document.getElementById('panel-badge');
  badge.className = 'panel-badge ' + props.sentido;
  badge.textContent = traduzirSentido(props.sentido);

  // Informações
  document.getElementById('info-sentido').textContent   = traduzirSentido(props.sentido);
  document.getElementById('info-tipo').textContent      = props.tipo      || '—';
  document.getElementById('info-bairro').textContent    = props.bairro    || '—';
  document.getElementById('info-descricao').textContent = props.descricao || '—';

  // Usa imagem personalizada se existir, senão usa a padrão
  const srcImagem = imagensPersonalizadas.get(props.nome) || props.imagem;
  document.getElementById('path-input').value = imagensPersonalizadas.has(props.nome) ? '' : (props.imagem || '');
  carregarImagem(srcImagem, props.nome);

  // Marca item ativo na lista e abre painel
  atualizarItemAtivo(props.nome);
  document.getElementById('side-panel').classList.add('open');
  document.body.classList.add('panel-open');
}

function fecharPainel() {
  document.getElementById('side-panel').classList.remove('open');
  document.body.classList.remove('panel-open');
  ocultarConfirmDelete();
  atualizarItemAtivo('');

  // Desfaz seleção no mapa
  if (estado.camadaAtiva) {
    estado.camadaAtiva.setStyle(CONFIG.estilos.normal);
    estado.camadaAtiva = null;
  }
  removerDecorator();
}

// ── Carregamento de imagem ──────────────────────────
function carregarImagem(src, nome) {
  const img    = document.getElementById('street-image');
  const spin   = document.getElementById('img-spinner');
  const err    = document.getElementById('img-error');

  // Reset estado
  img.classList.add('loading');
  spin.classList.remove('hidden');
  err.classList.add('hidden');
  img.src = '';

  const tempImg = new Image();

  tempImg.onload = () => {
    img.src = src;
    img.alt = `Seção transversal — ${nome}`;
    img.classList.remove('loading');
    spin.classList.add('hidden');
  };

  tempImg.onerror = () => {
    spin.classList.add('hidden');
    err.classList.remove('hidden');
    img.classList.add('loading');
  };

  tempImg.src = src;
}

// ── Adicionar rua por nome (OSM) ────────────────────
const novaRua = {
  osmId:        null,   // OSM way ID selecionado
  coordenadas:  null,   // [[lng, lat], …]
  nome:         '',
  bairro:       '',
  tipo:         '',
  sentido:      'twoway',
  imagemDataURL:null,
  previewLayer: null,   // L.Polyline de preview no mapa
};

const TIPO_OSM = {
  residential:  { tipo: 'Via residencial',   sentido: 'twoway'     },
  primary:      { tipo: 'Via primária',       sentido: 'twoway'     },
  secondary:    { tipo: 'Via secundária',     sentido: 'twoway'     },
  tertiary:     { tipo: 'Via terciária',      sentido: 'twoway'     },
  unclassified: { tipo: 'Via local',          sentido: 'twoway'     },
  living_street:{ tipo: 'Via de convivência', sentido: 'twoway'     },
  service:      { tipo: 'Via de serviço',     sentido: 'twoway'     },
  pedestrian:   { tipo: 'Calçadão',           sentido: 'pedestrian' },
  footway:      { tipo: 'Calçada',            sentido: 'pedestrian' },
  path:         { tipo: 'Caminho',            sentido: 'pedestrian' },
  cycleway:     { tipo: 'Ciclovia',           sentido: 'bike'       },
  trunk:        { tipo: 'Via expressa',       sentido: 'twoway'     },
  motorway:     { tipo: 'Rodovia',            sentido: 'oneway'     },
};

function inicializarAdicionarRua() {
  document.getElementById('btn-adicionar-rua').addEventListener('click', abrirModalAdicionar);
  document.getElementById('modal-close').addEventListener('click',    fecharModalAdicionar);
  document.getElementById('modal-cancelar').addEventListener('click', fecharModalAdicionar);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) fecharModalAdicionar();
  });
  document.getElementById('modal-salvar').addEventListener('click', salvarNovaRua);
  document.getElementById('btn-trocar-rua').addEventListener('click', voltarStep1);

  // Busca com debounce
  let debounce;
  document.getElementById('osm-search-input').addEventListener('input', (e) => {
    clearTimeout(debounce);
    const q = e.target.value.trim();
    if (q.length < 3) { document.getElementById('osm-results').classList.add('hidden'); return; }
    debounce = setTimeout(() => buscarNominatim(q), 420);
  });

  // Import de imagem
  const fileInput = document.getElementById('nova-imagem-file');
  document.getElementById('nova-btn-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const arq = fileInput.files[0];
    if (!arq) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      novaRua.imagemDataURL = ev.target.result;
      mostrarPreviewModal(ev.target.result);
      document.getElementById('nova-imagem-path').value = arq.name;
    };
    reader.readAsDataURL(arq);
    fileInput.value = '';
  });
  document.getElementById('nova-imagem-path').addEventListener('blur', () => {
    const c = document.getElementById('nova-imagem-path').value.trim();
    if (c && !novaRua.imagemDataURL) mostrarPreviewModal(c);
  });
}

function abrirModalAdicionar() {
  resetarModalStep1();
  document.getElementById('modal-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('osm-search-input').focus(), 80);
}

function fecharModalAdicionar() {
  document.getElementById('modal-overlay').classList.add('hidden');
  removerPreviewRua();
  Object.assign(novaRua, { osmId: null, coordenadas: null, nome: '', bairro: '', tipo: '', sentido: 'twoway', imagemDataURL: null });
}

function resetarModalStep1() {
  document.getElementById('modal-step-1').classList.remove('hidden');
  document.getElementById('modal-step-2').classList.add('hidden');
  document.getElementById('modal-salvar').classList.add('hidden');
  document.getElementById('modal-title').textContent = 'Adicionar Rua';
  document.getElementById('osm-search-input').value = '';
  document.getElementById('osm-results').classList.add('hidden');
  document.getElementById('osm-results').innerHTML = '';
}

function voltarStep1() {
  removerPreviewRua();
  resetarModalStep1();
  setTimeout(() => document.getElementById('osm-search-input').focus(), 80);
}

// Bbox de Joinville para filtrar a busca no Overpass
const JOINVILLE_BBOX = '-26.60,-49.10,-26.10,-48.55';

// ── Passo 1: autocomplete via Nominatim ─────────────
async function buscarNominatim(query) {
  const spinner = document.getElementById('osm-search-spinner');
  const ul      = document.getElementById('osm-results');
  spinner.classList.remove('hidden');
  ul.classList.add('hidden');

  try {
    const url = `https://nominatim.openstreetmap.org/search`
      + `?q=${encodeURIComponent(query + ' Joinville Santa Catarina')}`
      + `&format=json&addressdetails=1&limit=20&countrycodes=br`;
    const resp  = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
    const itens = await resp.json();

    // Filtra apenas vias e deduplica pelo nome da rua
    const nomesVistos = new Set();
    const ruas = [];
    for (const i of itens) {
      if (i.class !== 'highway') continue;
      const addr   = i.address || {};
      const nome   = addr.road || addr.pedestrian || addr.cycleway || i.display_name.split(',')[0].trim();
      if (!nome || nomesVistos.has(nome.toLowerCase())) continue;
      nomesVistos.add(nome.toLowerCase());
      const bairro = addr.suburb || addr.neighbourhood || addr.city_district || '';
      ruas.push({ nome, bairro, osmType: i.osm_type });
    }

    renderizarResultadosOSM(ruas, ul);
  } catch {
    ul.innerHTML = '<li class="osm-result-erro">Falha na busca. Verifique sua conexão.</li>';
    ul.classList.remove('hidden');
  } finally {
    spinner.classList.add('hidden');
  }
}

function renderizarResultadosOSM(ruas, ul) {
  ul.innerHTML = '';
  if (ruas.length === 0) {
    ul.innerHTML = '<li class="osm-result-erro">Nenhuma rua encontrada em Joinville.</li>';
    ul.classList.remove('hidden');
    return;
  }
  ruas.forEach(r => {
    const li = document.createElement('li');
    li.className = 'osm-result-item';
    li.innerHTML = `
      <span class="osm-result-nome">${r.nome}</span>
      ${r.bairro ? `<span class="osm-result-sub">${r.bairro}</span>` : ''}`;
    li.addEventListener('click', () => selecionarRuaOSM(r.nome, r.bairro));
    ul.appendChild(li);
  });
  ul.classList.remove('hidden');
}

// ── Passo 2: busca RUA COMPLETA via Overpass ─────────
async function selecionarRuaOSM(nome, bairro) {
  document.getElementById('osm-results').classList.add('hidden');
  document.getElementById('osm-search-spinner').classList.remove('hidden');

  try {
    const { coordenadas, tipoDetectado, sentidoDetectado } = await obterRuaCompletaOverpass(nome);

    novaRua.coordenadas   = coordenadas;
    novaRua.nome          = nome;
    novaRua.bairro        = bairro;
    novaRua.tipo          = tipoDetectado;
    novaRua.sentido       = sentidoDetectado;
    novaRua.imagemDataURL = null;

    // Preview no mapa como MultiPolyline (todos os segmentos juntos)
    removerPreviewRua();
    const latlngs = coordenadas.map(seg => seg.map(([lng, lat]) => [lat, lng]));
    novaRua.previewLayer = L.polyline(latlngs, {
      color: '#f59e0b', weight: 4, dashArray: '10,6', opacity: .9, interactive: false,
    }).addTo(estado.map);
    estado.map.fitBounds(novaRua.previewLayer.getBounds(), { padding: [60, 60], maxZoom: 17 });

    irParaStep2();
  } catch (err) {
    const ul = document.getElementById('osm-results');
    ul.innerHTML = `<li class="osm-result-erro">Erro: ${err.message}</li>`;
    ul.classList.remove('hidden');
  } finally {
    document.getElementById('osm-search-spinner').classList.add('hidden');
  }
}

// Servidores Overpass (tenta em ordem até um funcionar)
const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

// Busca TODOS os segmentos da rua no Overpass e mescla numa geometria completa
async function obterRuaCompletaOverpass(nome) {
  const nomeEsc = nome.replace(/"/g, '\\"');
  const query   = `[out:json][timeout:30];`
    + `way["name"="${nomeEsc}"](${JOINVILLE_BBOX});`
    + `out geom;`;

  let resp, ultimoErro;
  for (const servidor of OVERPASS_SERVERS) {
    try {
      resp = await fetch(`${servidor}?data=${encodeURIComponent(query)}`);
      if (resp.ok) break;
    } catch (e) {
      ultimoErro = e;
    }
  }
  if (!resp?.ok) throw new Error('Todos os servidores Overpass estão indisponíveis. Tente novamente em instantes.');
  const data = await resp.json();

  if (!data.elements?.length) throw new Error('Rua não encontrada no OSM.');

  // Extrai todos os segmentos como [[lng,lat],…]
  const segmentos = data.elements.map(way =>
    way.geometry.map(n => [n.lon, n.lat])
  );

  // Detecta tipo e sentido predominante
  const tipos = data.elements.map(w => w.tags?.highway || '').filter(Boolean);
  const tipoMaisComum = modoArray(tipos);
  const { tipo, sentido } = TIPO_OSM[tipoMaisComum] || { tipo: 'Via local', sentido: 'twoway' };

  // Mescla segmentos em uma linha contínua
  const mesclado = mesclarSegmentos(segmentos);

  return { coordenadas: mesclado, tipoDetectado: tipo, sentidoDetectado: sentido };
}

// Ordena e conecta segmentos de linha em uma sequência contínua.
// Retorna array de segmentos já ordenados (compatível com MultiPolyline e GeoJSON MultiLineString).
function mesclarSegmentos(segmentos) {
  if (segmentos.length === 0) return [];
  if (segmentos.length === 1) return [segmentos[0]];

  const TOL = 0.00015; // ~15m — tolerância para conectar pontas
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  const conecta = (a, b) => dist(a, b) < TOL;

  // Trabalha com cópias mutáveis
  const rest = segmentos.map(s => [...s]);
  let atual  = rest.shift();
  const resultado = [atual];

  let semProgresso = 0;

  while (rest.length > 0) {
    const primAtual = atual[0];
    const ultAtual  = atual[atual.length - 1];
    let encontrou   = false;

    for (let i = 0; i < rest.length; i++) {
      const seg = rest[i];
      const sf  = seg[0];
      const sl  = seg[seg.length - 1];

      if (conecta(ultAtual, sf)) {
        // Encadeia ao final (mesma direção)
        atual.push(...seg.slice(1));
        rest.splice(i, 1); encontrou = true; break;
      }
      if (conecta(ultAtual, sl)) {
        // Encadeia ao final (invertido)
        atual.push(...[...seg].reverse().slice(1));
        rest.splice(i, 1); encontrou = true; break;
      }
      if (conecta(primAtual, sl)) {
        // Encadeia ao início (mesma direção)
        atual.unshift(...seg.slice(0, -1));
        rest.splice(i, 1); encontrou = true; break;
      }
      if (conecta(primAtual, sf)) {
        // Encadeia ao início (invertido)
        atual.unshift(...[...seg].reverse().slice(0, -1));
        rest.splice(i, 1); encontrou = true; break;
      }
    }

    if (!encontrou) {
      semProgresso++;
      // Não conecta a atual — inicia novo segmento separado
      atual = rest.shift();
      resultado.push(atual);
      semProgresso = 0;
    }

    if (semProgresso > rest.length) break; // evita loop infinito
  }

  return resultado;
}

// Valor mais frequente em um array
function modoArray(arr) {
  if (!arr.length) return '';
  const freq = {};
  let max = 0, modo = arr[0];
  for (const v of arr) {
    freq[v] = (freq[v] || 0) + 1;
    if (freq[v] > max) { max = freq[v]; modo = v; }
  }
  return modo;
}

function irParaStep2() {
  document.getElementById('modal-step-1').classList.add('hidden');
  document.getElementById('modal-step-2').classList.remove('hidden');
  document.getElementById('modal-salvar').classList.remove('hidden');
  document.getElementById('modal-title').textContent = 'Confirmar Rua';

  // Preenche o card de preview
  document.getElementById('selected-nome').textContent   = novaRua.nome;
  document.getElementById('selected-bairro').textContent = novaRua.bairro || '';

  // Preenche os campos
  document.getElementById('nova-tipo').value        = novaRua.tipo;
  document.getElementById('nova-sentido').value     = novaRua.sentido;
  document.getElementById('nova-descricao').value   = '';
  document.getElementById('nova-imagem-path').value = '';
  document.getElementById('nova-img-preview-wrap').classList.add('hidden');
}

function removerPreviewRua() {
  if (novaRua.previewLayer) {
    estado.map.removeLayer(novaRua.previewLayer);
    novaRua.previewLayer = null;
  }
}

function mostrarPreviewModal(src) {
  const wrap = document.getElementById('nova-img-preview-wrap');
  const img  = document.getElementById('nova-img-preview');
  img.onload  = () => wrap.classList.remove('hidden');
  img.onerror = () => wrap.classList.add('hidden');
  img.src = src;
}

async function salvarNovaRua() {
  if (!novaRua.coordenadas) return;

  const tipo    = document.getElementById('nova-tipo').value.trim()    || novaRua.tipo || 'Via local';
  const sentido = document.getElementById('nova-sentido').value;
  const desc    = document.getElementById('nova-descricao').value.trim();
  const caminho = document.getElementById('nova-imagem-path').value.trim();
  const { nome, bairro } = novaRua;

  // Imagens base64 ficam só neste dispositivo; paths vão para a nuvem
  const imagemNuvem = novaRua.imagemDataURL ? '' : (caminho || '');
  if (novaRua.imagemDataURL) imagensPersonalizadas.set(nome, novaRua.imagemDataURL);

  const coords = novaRua.coordenadas;
  const geometry = coords.length === 1
    ? { type: 'LineString',      coordinates: coords[0] }
    : { type: 'MultiLineString', coordinates: coords };

  const btnSalvar = document.getElementById('modal-salvar');
  btnSalvar.disabled    = true;
  btnSalvar.textContent = 'Salvando…';

  try {
    await window.db.collection('ruas').add({
      nome, bairro, tipo, sentido,
      descricao:     desc,
      imagem:        imagemNuvem,
      geometriaJson: JSON.stringify(geometry),
      criadoEm:      firebase.firestore.FieldValue.serverTimestamp(),
    });
    // onSnapshot adiciona automaticamente ao mapa para todos
    removerPreviewRua();
    fecharModalAdicionar();
  } catch (err) {
    alert('Erro ao salvar na nuvem: ' + err.message);
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerHTML = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 8l4 4L13 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg> Adicionar ao mapa`;
  }
}

// ── Painel esquerdo: lista de ruas ──────────────────
function inicializarListaPanel() {
  const input     = document.getElementById('list-filter');
  const clearBtn  = document.getElementById('list-filter-clear');

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearBtn.classList.toggle('hidden', q === '');
    renderizarListaRuas(q);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    renderizarListaRuas('');
    input.focus();
  });
}

function renderizarListaRuas(filtro = '') {
  const ul    = document.getElementById('streets-list');
  const count = document.getElementById('list-count');
  const q     = filtro.toLowerCase();

  const itens = q
    ? indiceBusca.filter(r =>
        r.nome.toLowerCase().includes(q) ||
        (r.props.bairro || '').toLowerCase().includes(q)
      )
    : [...indiceBusca];

  count.textContent = indiceBusca.length;
  ul.innerHTML = '';

  if (itens.length === 0) {
    ul.innerHTML = `<li class="${filtro ? 'list-no-result' : 'list-empty'}">${
      filtro ? `Nenhuma rua encontrada` : 'Nenhuma rua cadastrada'
    }</li>`;
    return;
  }

  const nomeAtivo = estado.ruaAtual?.nome;

  itens.forEach(r => {
    const li   = document.createElement('li');
    li.className = 'street-list-item' + (r.nome === nomeAtivo ? ' active' : '');
    li.dataset.nome = r.nome;

    const nomeHL   = q ? destacarTexto(r.nome,              q) : r.nome;
    const bairroHL = q ? destacarTexto(r.props.bairro || '', q) : (r.props.bairro || '');

    li.innerHTML = `
      <div class="sli-dot"></div>
      <div class="sli-text">
        <span class="sli-name">${nomeHL}</span>
        ${bairroHL ? `<span class="sli-bairro">${bairroHL}</span>` : ''}
      </div>`;

    li.addEventListener('click', () => selecionarRuaPorBusca(r));
    ul.appendChild(li);
  });
}

function destacarTexto(texto, query) {
  if (!query || !texto) return texto;
  const idx = texto.toLowerCase().indexOf(query);
  if (idx === -1) return texto;
  return texto.slice(0, idx)
    + '<mark>' + texto.slice(idx, idx + query.length) + '</mark>'
    + texto.slice(idx + query.length);
}

// Marca o item ativo na lista
function atualizarItemAtivo(nome) {
  document.querySelectorAll('.street-list-item').forEach(el => {
    el.classList.toggle('active', el.dataset.nome === nome);
  });
}

// ── Apagar rua ─────────────────────────────────────
function inicializarDelete() {
  document.getElementById('btn-delete-street').addEventListener('click', mostrarConfirmDelete);
  document.getElementById('confirm-delete-yes').addEventListener('click', confirmarDelete);
  document.getElementById('confirm-delete-no').addEventListener('click', ocultarConfirmDelete);
}

function mostrarConfirmDelete() {
  document.getElementById('delete-confirm').classList.remove('hidden');
}

function ocultarConfirmDelete() {
  document.getElementById('delete-confirm').classList.add('hidden');
}

async function confirmarDelete() {
  if (!estado.ruaAtual) return;

  const firestoreId = estado.ruaAtual.firestoreId;
  const nome        = estado.ruaAtual.nome;

  removerDecorator();
  ocultarConfirmDelete();

  if (firestoreId) {
    // Rua da nuvem: apaga do Firestore (onSnapshot remove do mapa para todos)
    try {
      await window.db.collection('ruas').doc(firestoreId).delete();
    } catch (err) {
      alert('Erro ao apagar: ' + err.message);
      return;
    }
  } else {
    // Rua local (fallback offline): remove só do mapa
    if (estado.camadaAtiva) estado.map.removeLayer(estado.camadaAtiva);
    const idx = indiceBusca.findIndex(r => r.nome === nome);
    if (idx !== -1) indiceBusca.splice(idx, 1);
    imagensPersonalizadas.delete(nome);
    renderizarListaRuas();
    fecharPainel();
  }

  estado.camadaAtiva = null;
  estado.ruaAtual    = null;
}

// ── Lightbox da imagem ──────────────────────────────
function inicializarLightbox() {
  const img     = document.getElementById('street-image');
  const lb      = document.getElementById('lightbox');
  const lbClose = document.getElementById('lightbox-close');
  const lbBack  = document.getElementById('lightbox-backdrop');

  img.addEventListener('click', () => {
    if (!img.src || img.classList.contains('loading')) return;
    document.getElementById('lightbox-img').src       = img.src;
    document.getElementById('lightbox-caption').textContent = estado.ruaAtual?.nome || '';
    lb.classList.remove('hidden');
    document.addEventListener('keydown', fecharLightboxEsc);
  });

  function fecharLightbox() {
    lb.classList.add('hidden');
    document.removeEventListener('keydown', fecharLightboxEsc);
  }

  function fecharLightboxEsc(e) {
    if (e.key === 'Escape') fecharLightbox();
  }

  lbClose.addEventListener('click', fecharLightbox);
  lbBack.addEventListener('click', fecharLightbox);
}

// ── Pesquisa de ruas ────────────────────────────────
function inicializarPesquisa() {
  const input      = document.getElementById('search-input');
  const clearBtn   = document.getElementById('search-clear');
  const dropdown   = document.getElementById('search-dropdown');
  const container  = document.getElementById('search-container');
  let focusedIndex = -1;

  function abrirDropdown() { container.classList.add('dropdown-open'); dropdown.classList.remove('hidden'); }
  function fecharDropdown() { container.classList.remove('dropdown-open'); dropdown.classList.add('hidden'); focusedIndex = -1; }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearBtn.classList.toggle('hidden', q === '');
    if (!q) { fecharDropdown(); return; }
    renderizarDropdown(q);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    fecharDropdown();
    input.focus();
  });

  // Navegação por teclado
  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.search-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
      atualizarFoco(items, focusedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, 0);
      atualizarFoco(items, focusedIndex);
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      items[focusedIndex]?.click();
    } else if (e.key === 'Escape') {
      fecharDropdown();
      input.blur();
    }
  });

  // Fecha ao clicar fora
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) fecharDropdown();
  });

  function atualizarFoco(items, idx) {
    items.forEach((el, i) => el.classList.toggle('focused', i === idx));
    items[idx]?.scrollIntoView({ block: 'nearest' });
  }

  function renderizarDropdown(query) {
    const q = query.toLowerCase();
    const resultados = indiceBusca.filter(r => r.nome.toLowerCase().includes(q));

    dropdown.innerHTML = '';

    if (resultados.length === 0) {
      dropdown.innerHTML = `<li class="search-no-result">Nenhuma rua encontrada para "<strong>${query}</strong>"</li>`;
      abrirDropdown();
      return;
    }

    resultados.forEach((r, i) => {
      const li = document.createElement('li');
      li.className = 'search-item';
      li.innerHTML = `
        <div class="search-item-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="7" width="14" height="2.5" rx="1.25" fill="#1a73e8"/>
          </svg>
        </div>
        <div class="search-item-text">
          <span class="search-item-name">${destacar(r.nome, q)}</span>
          <span class="search-item-sub">${r.tipo} · ${traduzirSentido(r.sentido)}</span>
        </div>`;

      li.addEventListener('click', () => {
        input.value = r.nome;
        clearBtn.classList.remove('hidden');
        fecharDropdown();
        selecionarRuaPorBusca(r);
      });

      dropdown.appendChild(li);
    });

    focusedIndex = -1;
    abrirDropdown();
  }

  function destacar(texto, query) {
    const idx = texto.toLowerCase().indexOf(query);
    if (idx === -1) return texto;
    return texto.slice(0, idx) + '<mark>' + texto.slice(idx, idx + query.length) + '</mark>' + texto.slice(idx + query.length);
  }
}

// Seleciona rua a partir do resultado de busca
function selecionarRuaPorBusca(resultado) {
  const { layer, props } = resultado;

  // Resetar seleção anterior
  if (estado.camadaAtiva && estado.camadaAtiva !== layer) {
    estado.camadaAtiva.setStyle(CONFIG.estilos.normal);
  }
  removerDecorator();

  // Aplica estilo ativo
  layer.setStyle(CONFIG.estilos.ativo);
  layer.bringToFront();
  estado.camadaAtiva = layer;

  // Zoom para a rua selecionada
  estado.map.fitBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 17 });

  // Setas de direção
  adicionarSetas(layer, props.sentido);

  // Abre painel
  abrirPainel(props);
}

// ── Importação de imagem ────────────────────────────
function inicializarImportacao() {
  const fileInput  = document.getElementById('file-import');
  const btnImport  = document.getElementById('btn-import-file');
  const pathInput  = document.getElementById('path-input');
  const btnApply   = document.getElementById('btn-path-apply');

  // Clique no botão abre seletor de arquivo
  btnImport.addEventListener('click', () => fileInput.click());

  // Arquivo selecionado
  fileInput.addEventListener('change', () => {
    const arquivo = fileInput.files[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataURL = e.target.result;
      if (estado.ruaAtual) {
        imagensPersonalizadas.set(estado.ruaAtual.nome, dataURL);
        carregarImagem(dataURL, estado.ruaAtual.nome);
        // Mostra o nome do arquivo no campo de texto como feedback
        pathInput.value = arquivo.name;
        pathInput.title = arquivo.name;
      }
    };
    reader.readAsDataURL(arquivo);
    // Limpa para permitir reimportar o mesmo arquivo
    fileInput.value = '';
  });

  // Aplicar caminho digitado manualmente
  btnApply.addEventListener('click', aplicarCaminho);
  pathInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') aplicarCaminho(); });

  function aplicarCaminho() {
    const caminho = pathInput.value.trim();
    if (!caminho || !estado.ruaAtual) return;
    imagensPersonalizadas.set(estado.ruaAtual.nome, caminho);
    carregarImagem(caminho, estado.ruaAtual.nome);
  }
}

// ── Utilitários ─────────────────────────────────────
function traduzirSentido(sentido) {
  const map = {
    oneway:     '→ Mão única',
    twoway:     '⇆ Mão dupla',
    pedestrian: '🚶 Calçadão',
    bike:       '🚲 Ciclovia',
  };
  return map[sentido] || sentido;
}
