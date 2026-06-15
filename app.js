/* ===================================================
   UrbanMap Joinville — app.js
   Mapa interativo de ruas com Leaflet + PolylineDecorator
   =================================================== */

// ── Configuração geral ──────────────────────────────
const CONFIG = {
  centro:  [-26.3044, -48.8487],
  zoom:    15,
  geojson: 'data/ruas.geojson',
};

// Cores por classificação de via
const CORES_TIPO = {
  // Nomes novos
  'Arterial':           '#f44336',
  'Coletora':           '#ff9800',
  'Trânsito rápido':    '#e91e63',
  'Rural':              '#ffc107',
  'Local':              '#9c27b0',
  'Calçadão':           '#795548',
  'Ciclovia':           '#4caf50',
  // Nomes antigos (compatibilidade com Firestore existente)
  'Via arterial':       '#f44336',
  'Via coletora':       '#ff9800',
  'Via primária':       '#f44336',
  'Via secundária':     '#ff9800',
  'Via terciária':      '#9c27b0',
  'Via local':          '#9c27b0',
  'Via residencial':    '#9c27b0',
  'Via de convivência': '#9c27b0',
  'Via de serviço':     '#9c27b0',
  'Via expressa':       '#e91e63',
  'Rodovia':            '#ffc107',
  'Calçada':            '#795548',
  'Caminho':            '#795548',
};

function corPorTipo(tipo) {
  return CORES_TIPO[tipo] || '#4a90d9';
}

function estiloNormal(tipo) {
  return { color: corPorTipo(tipo), weight: 3, opacity: 0.85, lineCap: 'round', lineJoin: 'round' };
}
function estiloHover(tipo) {
  return { color: corPorTipo(tipo), weight: 5, opacity: 1 };
}
function estiloAtivo(tipo) {
  return { color: corPorTipo(tipo), weight: 6, opacity: 1 };
}

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

// ── Catálogo local de imagens PNG (pasta feito/) ────
// Arquivos "limpos" (sem sufixo numérico) ficam primeiro para prioridade no match
const CATALOGO_ARQUIVOS = [
  '3-de-maio', '6-de-janeiro', '9-de-marco',
  'abdon-batista', 'agostinho-dos-santos', 'alfredo-marquardt',
  'americo-vespucio', 'anemonas', 'anemonas-trecho-novo', 'anitapolis',
  'antonio-carlos-americo-vespucio', 'antonio-goncalves',
  'antonio-jose-da-costa-ayrton-senna', 'arno-waldemar-dohler',
  'aube', 'augusto-bruno-nielson', 'augusto-schmidt',
  'avenida-aluisio-pires-condeixa', 'avenida-doutor-paulo-medeiros',
  'avenida-edmundo-doubrawa', 'avenida-firmino-da-silva',
  'avenida-firmino-da-silva-trecho-novo', 'avenida-francisco-alves',
  'avenida-hermann-august-lepper', 'avenida-jupiter', 'avenida-kurt-meinert',
  'avenida-marcos-welmuth', 'avenida-marques-de-olinda',
  'avenida-odilon-rocha-ferreira', 'avenida-paulo-schroeder',
  'avenida-presidente-juscelino-kubitschek', 'avenida-urano',
  'baercker-wagner', 'barra-velha', 'benicio-felipe-da-silva',
  'benjamin-constant', 'bento-torquato-da-rocha', 'brasilia-cerro-azul',
  'callisto', 'camelo-pardalis-tucana', 'canis-vinati-crux',
  'carlos-frederico-adolfo-schneider', 'cidade-de-barreto',
  'comandante-eugenio-lepper', 'complexo-helmuth-miers',
  'conselheiro-pedreira', 'copacabana', 'coronel-francisco-gomes',
  'coronel-procopio-gomes', 'coronel-vieira',
  'da-independencia', 'das-purpuratas', 'david-thomas-pereira',
  'do-principe', 'dona-francisca-joinville',
  'dos-aimores', 'dos-bororos', 'dos-portugueses', 'dos-suicos',
  'doutor-placido-olimpio-de-oliveira',
  'emilio-landmann', 'engenheiro-niemeyer', 'esteves-junior',
  'estrada-da-arataca', 'estrada-do-oeste-trecho-novo', 'estrada-fazenda',
  'estrada-sai-estrada-timbe', 'estrada-timbe',
  'estrada-werne-weiss-trecho-novo', 'etiene-arnaldo-douat-trecho-novo',
  'eugenio-moreira', 'evaristo-da-veiga', 'expedicionario-amandos-miers',
  'florianopolis', 'francisco-alves', 'general-valgas-neves',
  'guanabara', 'guaruja', 'guilherme-krueger',
  'helena-casagrande-ramos', 'humberto-pinheiro-vieira-trecho-novo',
  'iririu', 'iririu-e-albano-schmidt', 'ivora.',
  'jacinto-machado-trecho-novo', 'jacobus-felthaus',
  'jaroslau-clemente-pesch-trecho-novo', 'jeronimo-coelho',
  'joao-da-costa-junior', 'joao-eberhardt', 'joao-filete-de-oliveira',
  'joinville-e-conselheiro-pedreira', 'jorge-augusto-emilio-muller',
  'jorge-mayerle', 'jose-moreira', 'julio-de-mesquita-filho',
  'leopoldo-beninca', 'marconi',
  'maria-de-lurdes-bachtold', 'maria-julia-pereira-da-costa',
  'marinho-garcia', 'marinho-lobo', 'menez-de-oliveira',
  'ministro-calogeras', 'montezuma-de-carvalho', 'nacar',
  'norberto-bachmann', 'norberto-haritsch', 'nossa-senhora-de-belem',
  'olavo-bilac', 'osvaldo-altino-doria-trecho-novo',
  'otto-pfuetzenreuter', 'ottokar-doerfel', 'padre-antonio-vieira',
  'paulo-schneider', 'ponte-anemonas', 'ponte-aube', 'ponte-joinville',
  'ponte-nacar', 'porto-belo-trecho-novo', 'porto-rico',
  'presidente-affonso-penna', 'professor-clemens-schmidt',
  'rio-velho-renato-caetano-da-silva-filho', 'rodovia-do-arroz',
  'rolando-gurske', 'rua-alfredo-wersdoerfer', 'rua-colon',
  'rua-conselheiro-arp', 'rua-machado-de-assis', 'rua-nacoes-unidas',
  'rua-timbo', 'rudolf-baumer', 'rui-barbosa-trecho-novo',
  'santa-catarina', 'santo-agostinho', 'sao-borja', 'sao-francisco',
  'sao-joaquim', 'sao-leopoldo', 'sao-paulo-guaruja-simao-krueger',
  'senador-rodrigo-lobo', 'sete-de-setembro',
  'simao-kruger-jornalista-hilario-muller-caravelas',
  'suburbana', 'tatuape', 'tenente-paulo-lopes-xavier-arp-papa-joao-xxiii',
  'teresopolis',
  'trecho-novo-486-zona-industrial', 'trecho-novo-alvino-souza-do-nascimento-estrada-timbe',
  'trecho-novo-jativoca-trecho-novo', 'trecho-novo-jose-menestrina',
  'trecho-novo-manoel-wermutt-de-moura', 'trecho-novo-modelo',
  'trecho-novo-pio-s-santana', 'trecho-novo-rolf-brumer',
  'trecho-novo-valdemar-medeiros',
  'tupy', 'valenca', 'valter-karman', 'vereador-guilherme-zuege',
  'visconde-de-taunay', 'waldemiro-rosa',
  // Variantes numeradas (mesma rua, seção diferente)
  'almirante-jaceguay-342', 'almirante-jaceguay-479',
  'anita-garibaldi-414', 'anita-garibaldi-415', 'anita-garibaldi-433', 'anita-garibaldi-514',
  'avenida-antonio-ramos-alvim-103', 'avenida-antonio-ramos-alvim-55',
  'avenida-hermann-august-lepper-659', 'avenida-hermann-august-lepper-660',
  'avenida-jose-vieira-455', 'avenida-presidente-juscelino-kubitschek sentido unico',
  'avenida-santos-dumont-344', 'boehmerwald-112', 'boehmerwald-124',
  'dona-francisca-133134', 'dona-francisca-343608609',
  'getulio-vargas-18', 'getulio-vargas-418',
  'guaira-138', 'guaira-532', 'iririu-447',
  'joao-da-silva-137', 'joao-da-silva-434', 'joao-tomas-da-silva-426',
  'julio-de-mesquita-filho-437', 'marcone-509', 'maria-regina-klock-russi-477',
  'max-colin-457', 'max-colin-459', 'max-colin-496',
  'olavo-bilac-12', 'padre-antonio-vieira-359', 'peixes-475', 'peixes-476',
  'prefeito-baltazar-buschle-429', 'prefeito-baltazar-buschle-430', 'prefeito-baltazar-buschle-529',
  'rio-branco-129', 'rio-branco-130', 'rio-branco-74',
  'rua-rio-grande-do-norte-leite-ribeiro-e-eugenio-moreira (1)',
  'saguacu-pastor-guilherme-rau (1)',
  'trecho-novo-100', 'trecho-novo-101', 'trecho-novo-102', 'trecho-novo-105',
  'trecho-novo-106', 'trecho-novo-111', 'trecho-novo-118', 'trecho-novo-119',
  'trecho-novo-13', 'trecho-novo-145 (1)', 'trecho-novo-149', 'trecho-novo-19',
  'trecho-novo-32', 'trecho-novo-494', 'trecho-novo-611', 'trecho-novo-86',
  'trecho-novo-9', 'trecho-novo-99',
  'trecho-novo-emilia-silvia-denk (1)',
  'trecho-novo-funchal-aguas-de-chapeco-elis-regina-professor-clemens-schmidt (1)',
  'trecho-novo-pio-s-santana-139',
  'tuiuti-443', 'tuiuti-444588',
  'waldemiro-jose-borges-378-e-631', 'waldemiro-jose-borges-393',
  'xv-de-novembro-363-370', 'xv-de-novembro-461',
  'xv-de-novembro-462463', 'xv-de-novembro-490492575',
];

// Converte filename do catálogo em nome para busca OSM
function arquivoParaBusca(arquivo) {
  let nome = arquivo
    .replace(/\s*\(\d+\)\s*$/, '')          // remove "(1)" do final
    .replace(/\s+sentido\s+unico\s*$/i, '') // remove "sentido unico"
    .trim();

  if (!nome.toLowerCase().startsWith('trecho-novo-')) {
    nome = nome.replace(/-trecho-novo$/i, ''); // remove variante -trecho-novo
    // Remove sufixos numéricos ou "-e" iterativamente
    let anterior;
    do {
      anterior = nome;
      nome = nome.replace(/-(?:\d+|e)$/, '');
    } while (nome !== anterior);
  }

  const artigos = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'em', 'por', 'ao', 'na', 'no']);
  return nome.split('-')
    .map((p, i) => {
      const pl = p.toLowerCase();
      return (i > 0 && artigos.has(pl)) ? pl : p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ');
}

// Normaliza string para comparação (remove acentos, prefixos de tipo, espaços extras)
function normalizarParaComparacao(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\b(rua|avenida|av|estrada|rodovia|travessa|alameda|ponte)\b\.?\s*/gi, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Encontra a melhor imagem do catálogo para um nome de rua do OSM
function encontrarImagemCatalogo(nomeOsm) {
  const alvo = normalizarParaComparacao(nomeOsm);
  if (!alvo) return null;

  let melhor = null;
  let melhorScore = 0;

  for (const arquivo of CATALOGO_ARQUIVOS) {
    const busca = normalizarParaComparacao(arquivoParaBusca(arquivo));
    let score = 0;

    if (alvo === busca) {
      score = 1000 + busca.length; // match exato, prefere mais específico
    } else if (busca.length >= 4 && (alvo.includes(busca) || busca.includes(alvo))) {
      score = Math.min(alvo.length, busca.length); // match parcial
    }

    if (score > melhorScore) {
      melhorScore = score;
      melhor = arquivo;
    }
  }

  return melhor ? `feito/${melhor.replace(/ /g, '%20')}.png` : null;
}

// Gera o path de imagem para um arquivo do catálogo
function pathImagem(arquivo) {
  return `feito/${arquivo.replace(/ /g, '%20')}.png`;
}

// ── Estado da aplicação ─────────────────────────────
const estado = {
  map:         null,
  camadaAtiva: null,
  ruaAtual:    null,
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
    style:         (f) => estiloNormal(f.properties.tipo),
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
      style:         (f) => estiloNormal(f.properties.tipo),
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
    const tipoAnterior = estado.ruaAtual?.tipo || '';
    estado.camadaAtiva.setStyle(estiloNormal(tipoAnterior));
  }

  // Remove decorator anterior
  removerDecorator();

  // Aplica estilo ativo
  layer.setStyle(estiloAtivo(props.tipo));
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
    const tipo = indiceBusca.find(r => r.layer === layer)?.tipo || '';
    layer.setStyle(estiloHover(tipo));
    layer.bringToFront();
  }
  estado.map.getContainer().style.cursor = 'pointer';
}

function aoSairMouse(e, layer) {
  if (layer !== estado.camadaAtiva) {
    const tipo = indiceBusca.find(r => r.layer === layer)?.tipo || '';
    layer.setStyle(estiloNormal(tipo));
  }
  estado.map.getContainer().style.cursor = '';
}

function adicionarSetas() {}
function removerDecorator() {}

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

// ── Edição inline de informações da via ─────────────
function abrirEdicao() {
  if (!estado.ruaAtual) return;
  const p = estado.ruaAtual;
  document.getElementById('edit-nome').value     = p.nome      || '';
  document.getElementById('edit-sentido').value  = p.sentido   || 'twoway';
  document.getElementById('edit-tipo').value     = p.tipo      || 'Local';
  document.getElementById('edit-bairro').value   = p.bairro    || '';
  document.getElementById('edit-descricao').value= p.descricao || '';
  document.getElementById('info-view').classList.add('hidden');
  document.getElementById('info-edit').classList.remove('hidden');
  document.getElementById('btn-edit-street').style.display = 'none';
}

function cancelarEdicao() {
  document.getElementById('info-view').classList.remove('hidden');
  document.getElementById('info-edit').classList.add('hidden');
  document.getElementById('btn-edit-street').style.display = '';
}

async function salvarEdicao(e) {
  e.preventDefault();
  if (!estado.ruaAtual?.firestoreId) return;

  const dados = {
    nome:      document.getElementById('edit-nome').value.trim(),
    sentido:   document.getElementById('edit-sentido').value,
    tipo:      document.getElementById('edit-tipo').value,
    bairro:    document.getElementById('edit-bairro').value.trim(),
    descricao: document.getElementById('edit-descricao').value.trim(),
  };

  const btn = document.querySelector('.btn-salvar-edit');
  btn.textContent = 'Salvando…';
  btn.disabled = true;

  try {
    await window.db.collection('ruas').doc(estado.ruaAtual.firestoreId).update(dados);

    // Atualiza estado local
    Object.assign(estado.ruaAtual, dados);

    // Atualiza visual do painel
    document.getElementById('panel-street-name').textContent = dados.nome;
    document.getElementById('info-sentido').textContent   = traduzirSentido(dados.sentido);
    document.getElementById('info-tipo').textContent      = dados.tipo;
    document.getElementById('info-bairro').textContent    = dados.bairro    || '—';
    document.getElementById('info-descricao').textContent = dados.descricao || '—';
    const badge = document.getElementById('panel-badge');
    badge.className = 'panel-badge ' + dados.sentido;
    badge.textContent = traduzirSentido(dados.sentido);

    // Atualiza cor da linha no mapa
    if (estado.camadaAtiva) {
      estado.camadaAtiva.setStyle(estiloAtivo(dados.tipo));
    }

    // Atualiza sentido/tipo no índice e redesenha seta da rua ativa
    const firestoreId = estado.ruaAtual.firestoreId;
    for (const r of indiceBusca) {
      if (r.props.firestoreId === firestoreId) {
        r.sentido = dados.sentido;
        r.props.sentido = dados.sentido;
        r.tipo = dados.tipo;
        r.props.tipo = dados.tipo;
      }
    }
    if (estado.camadaAtiva) {
      adicionarSetas(estado.camadaAtiva, dados.sentido);
    }

    cancelarEdicao();
  } catch(err) {
    alert('Erro ao salvar: ' + err.message);
  } finally {
    btn.textContent = 'Salvar';
    btn.disabled = false;
  }
}

function fecharPainel() {
  cancelarEdicao();
  document.getElementById('side-panel').classList.remove('open');
  document.body.classList.remove('panel-open');
  ocultarConfirmDelete();
  atualizarItemAtivo('');

  // Desfaz seleção no mapa
  if (estado.camadaAtiva) {
    estado.camadaAtiva.setStyle(estiloNormal(estado.ruaAtual?.tipo || ''));
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
  residential:  { tipo: 'Local',          sentido: 'twoway'     },
  primary:      { tipo: 'Arterial',        sentido: 'twoway'     },
  secondary:    { tipo: 'Coletora',        sentido: 'twoway'     },
  tertiary:     { tipo: 'Coletora',        sentido: 'twoway'     },
  unclassified: { tipo: 'Local',           sentido: 'twoway'     },
  living_street:{ tipo: 'Local',           sentido: 'twoway'     },
  service:      { tipo: 'Local',           sentido: 'twoway'     },
  pedestrian:   { tipo: 'Calçadão',        sentido: 'pedestrian' },
  footway:      { tipo: 'Calçadão',        sentido: 'pedestrian' },
  path:         { tipo: 'Calçadão',        sentido: 'pedestrian' },
  cycleway:     { tipo: 'Ciclovia',        sentido: 'bike'       },
  trunk:        { tipo: 'Trânsito rápido', sentido: 'twoway'     },
  motorway:     { tipo: 'Rural',           sentido: 'oneway'     },
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
  const { tipo, sentido: sentidoBase } = TIPO_OSM[tipoMaisComum] || { tipo: 'Via local', sentido: 'twoway' };
  const onewayCount = data.elements.filter(w => w.tags?.oneway === 'yes' || w.tags?.oneway === '1').length;
  const sentido = (onewayCount > data.elements.length / 2) ? 'oneway' : sentidoBase;

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
  document.getElementById('nova-img-preview-wrap').classList.add('hidden');

  // Auto-preenche imagem do catálogo se disponível
  const imagemCat = encontrarImagemCatalogo(novaRua.nome);
  if (imagemCat) {
    novaRua.imagemDataURL = null;
    document.getElementById('nova-imagem-path').value = imagemCat;
    mostrarPreviewModal(imagemCat);
    // Mostra badge indicando que veio do catálogo
    const labelImg = document.querySelector('#modal-step-2 .form-group:last-child label');
    if (labelImg && !labelImg.querySelector('.catalogo-badge')) {
      const badge = document.createElement('span');
      badge.className = 'catalogo-badge';
      badge.textContent = '✓ catálogo';
      labelImg.appendChild(badge);
    }
  } else {
    document.getElementById('nova-imagem-path').value = '';
    // Remove badge se não encontrou
    document.querySelector('.catalogo-badge')?.remove();
  }
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

  document.getElementById('btn-importar-catalogo').addEventListener('click', importarCatalogoBatch);
  document.getElementById('catalogo-progress-cancel').addEventListener('click', () => {
    importacaoCancelada = true;
  });

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
  document.getElementById('btn-edit-street').addEventListener('click', abrirEdicao);
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
    estado.camadaAtiva.setStyle(estiloNormal(estado.ruaAtual?.tipo || ''));
  }
  removerDecorator();

  // Aplica estilo ativo
  layer.setStyle(estiloAtivo(props.tipo));
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

// ── Importação em lote do catálogo (download único) ─
let importacaoCancelada = false;

// Mapa de nomes OSM corretos do catálogo (arquivo → nome real com acentos)
const CATALOGO_NOMES = new Map([
  ['3-de-maio','Rua 3 de Maio'],['6-de-janeiro','Rua 6 de Janeiro'],
  ['9-de-marco','Rua 9 de Março'],['abdon-batista','Rua Abdon Batista'],
  ['agostinho-dos-santos','Rua Agostinho dos Santos'],
  ['alfredo-marquardt','Rua Alfredo Marquardt'],
  ['almirante-jaceguay-342','Avenida Almirante Jaceguay'],
  ['americo-vespucio','Rua Américo Vespúcio'],
  ['anemonas','Rua Anêmonas'],['anitapolis','Rua Anitápolis'],
  ['anita-garibaldi-414','Rua Anita Garibaldi'],
  ['antonio-goncalves','Rua Antônio Gonçalves'],
  ['arno-waldemar-dohler','Rua Arno Waldemar Döhler'],
  ['aube','Rua Aube'],['augusto-bruno-nielson','Rua Augusto Bruno Nielson'],
  ['augusto-schmidt','Rua Augusto Schmidt'],
  ['avenida-aluisio-pires-condeixa','Avenida Aluísio Pires Condeixa'],
  ['avenida-antonio-ramos-alvim-103','Avenida Antônio Ramos Alvim'],
  ['avenida-doutor-paulo-medeiros','Avenida Doutor Paulo Medeiros'],
  ['avenida-edmundo-doubrawa','Avenida Edmundo Doubrawa'],
  ['avenida-firmino-da-silva','Avenida Firmino da Silva'],
  ['avenida-francisco-alves','Avenida Francisco Alves'],
  ['avenida-hermann-august-lepper','Avenida Hermann August Lepper'],
  ['avenida-jose-vieira-455','Avenida José Vieira'],
  ['avenida-jupiter','Avenida Júpiter'],
  ['avenida-kurt-meinert','Avenida Kurt Meinert'],
  ['avenida-marcos-welmuth','Avenida Marcos Welmuth'],
  ['avenida-marques-de-olinda','Avenida Marquês de Olinda'],
  ['avenida-odilon-rocha-ferreira','Avenida Odilon Rocha Ferreira'],
  ['avenida-paulo-schroeder','Avenida Paulo Schroeder'],
  ['avenida-presidente-juscelino-kubitschek','Avenida Presidente Juscelino Kubitschek'],
  ['avenida-santos-dumont-344','Avenida Santos Dumont'],
  ['avenida-urano','Avenida Urano'],
  ['baercker-wagner','Rua Baercker Wagner'],['barra-velha','Rua Barra Velha'],
  ['benicio-felipe-da-silva','Rua Benício Felipe da Silva'],
  ['benjamin-constant','Rua Benjamin Constant'],
  ['bento-torquato-da-rocha','Rua Bento Torquato da Rocha'],
  ['boehmerwald-112','Rua Boehmerwald'],
  ['callisto','Rua Callisto'],
  ['carlos-frederico-adolfo-schneider','Rua Carlos Frederico Adolfo Schneider'],
  ['cidade-de-barreto','Rua Cidade de Barreto'],
  ['comandante-eugenio-lepper','Rua Comandante Eugênio Lepper'],
  ['conselheiro-pedreira','Rua Conselheiro Pedreira'],
  ['copacabana','Rua Copacabana'],
  ['coronel-francisco-gomes','Rua Coronel Francisco Gomes'],
  ['coronel-procopio-gomes','Rua Coronel Procópio Gomes'],
  ['coronel-vieira','Rua Coronel Vieira'],
  ['da-independencia','Rua da Independência'],
  ['das-purpuratas','Rua das Purpuratas'],
  ['david-thomas-pereira','Rua David Thomas Pereira'],
  ['do-principe','Rua do Príncipe'],
  ['dona-francisca-joinville','Rua Dona Francisca'],
  ['dos-aimores','Rua dos Aimorés'],['dos-bororos','Rua dos Bororós'],
  ['dos-portugueses','Rua dos Portugueses'],['dos-suicos','Rua dos Suíços'],
  ['doutor-placido-olimpio-de-oliveira','Rua Doutor Plácido Olímpio de Oliveira'],
  ['emilio-landmann','Rua Emílio Landmann'],
  ['engenheiro-niemeyer','Rua Engenheiro Niemeyer'],
  ['esteves-junior','Rua Esteves Júnior'],
  ['estrada-da-arataca','Estrada da Arataca'],
  ['estrada-fazenda','Estrada Fazenda'],['estrada-timbe','Estrada Timbé'],
  ['eugenio-moreira','Rua Eugênio Moreira'],
  ['evaristo-da-veiga','Rua Evaristo da Veiga'],
  ['expedicionario-amandos-miers','Rua Expedicionário Amandos Miers'],
  ['florianopolis','Rua Florianópolis'],['francisco-alves','Rua Francisco Alves'],
  ['general-valgas-neves','Rua General Valgas Neves'],
  ['getulio-vargas-18','Rua Getúlio Vargas'],
  ['guaira-138','Rua Guaíra'],['guanabara','Rua Guanabara'],
  ['guaruja','Rua Guarujá'],['guilherme-krueger','Rua Guilherme Krüger'],
  ['helena-casagrande-ramos','Rua Helena Casagrande Ramos'],
  ['iririu','Rua Iririu'],['iririu-447','Rua Iririu'],
  ['jacobus-felthaus','Rua Jacobus Felthaus'],
  ['jeronimo-coelho','Rua Jerônimo Coelho'],
  ['joao-da-costa-junior','Rua João da Costa Júnior'],
  ['joao-da-silva-137','Rua João da Silva'],
  ['joao-eberhardt','Rua João Eberhardt'],
  ['joao-filete-de-oliveira','Rua João Filete de Oliveira'],
  ['joao-tomas-da-silva-426','Rua João Tomás da Silva'],
  ['jorge-augusto-emilio-muller','Rua Jorge Augusto Emílio Müller'],
  ['jorge-mayerle','Rua Jorge Mayerle'],['jose-moreira','Rua José Moreira'],
  ['julio-de-mesquita-filho','Rua Doutor Júlio de Mesquita Filho'],
  ['leopoldo-beninca','Rua Leopoldo Beninca'],
  ['marconi','Rua Marconi'],['marcone-509','Rua Marconi'],
  ['maria-de-lurdes-bachtold','Rua Maria de Lurdes Bachtold'],
  ['maria-julia-pereira-da-costa','Rua Maria Júlia Pereira da Costa'],
  ['maria-regina-klock-russi-477','Rua Maria Regina Klock Russi'],
  ['marinho-garcia','Rua Marinho Garcia'],['marinho-lobo','Rua Doutor Marinho Lobo'],
  ['max-colin-457','Rua Max Colin'],
  ['menez-de-oliveira','Rua Menez de Oliveira'],
  ['ministro-calogeras','Rua Ministro Calogeras'],
  ['montezuma-de-carvalho','Rua Montezuma de Carvalho'],
  ['nacar','Rua Nácar'],['norberto-bachmann','Rua Norberto Bachmann'],
  ['norberto-haritsch','Rua Norberto Haritsch'],
  ['nossa-senhora-de-belem','Rua Nossa Senhora de Belém'],
  ['olavo-bilac','Rua Olavo Bilac'],
  ['otto-pfuetzenreuter','Rua Otto Pfützenreuter'],
  ['ottokar-doerfel','Rua Ottokar Doerfel'],
  ['padre-antonio-vieira','Rua Padre Antônio Vieira'],
  ['paulo-schneider','Rua Paulo Schneider'],['peixes-475','Rua Peixes'],
  ['ponte-anemonas','Ponte Anêmonas'],['ponte-aube','Ponte Albertinho Bornschein'],
  ['ponte-joinville','Ponte Joinville'],['ponte-nacar','Ponte Harald Karmann'],
  ['porto-rico','Rua Porto Rico'],
  ['prefeito-baltazar-buschle-429','Rua Prefeito Baltazar Buschle'],
  ['presidente-affonso-penna','Rua Presidente Affonso Penna'],
  ['professor-clemens-schmidt','Rua Professor Clemens Schmidt'],
  ['rio-branco-129','Rua Rio Branco'],['rodovia-do-arroz','Rodovia Rodolfo Jahn'],
  ['rolando-gurske','Rua Rolando Gurske'],
  ['rua-alfredo-wersdoerfer','Rua Alfredo Wersdoerfer'],
  ['rua-colon','Rua Colón'],['rua-conselheiro-arp','Rua Conselheiro Arp'],
  ['rua-machado-de-assis','Rua Machado de Assis'],
  ['rua-nacoes-unidas','Rua Nações Unidas'],['rua-timbo','Rua Timbó'],
  ['rudolf-baumer','Rua Rudolf Bäumer'],
  ['santa-catarina','Rua Santa Catarina'],['santo-agostinho','Rua Santo Agostinho'],
  ['sao-borja','Rua São Borja'],['sao-francisco','Rua São Francisco'],
  ['sao-joaquim','Rua São Joaquim'],['sao-leopoldo','Rua São Leopoldo'],
  ['senador-rodrigo-lobo','Rua Senador Rodrigo Lobo'],
  ['sete-de-setembro','Rua Sete de Setembro'],
  ['suburbana','Rua Suburbana'],['tatuape','Rua Tatuapé'],
  ['teresopolis','Rua Teresópolis'],['tuiuti-443','Rua Tuiuti'],
  ['tupy','Rua Tupy'],['valenca','Rua Valença'],['valter-karman','Rua Walter Karman'],
  ['vereador-guilherme-zuege','Rua Vereador Guilherme Zuege'],
  ['visconde-de-taunay','Rua Visconde de Taunay'],
  ['waldemiro-jose-borges-393','Rua Waldemiro José Borges'],
  ['waldemiro-rosa','Rua Waldemiro Rosa'],
  ['xv-de-novembro-363-370','Rua XV de Novembro'],
]);

async function importarCatalogoBatch() {
  const progressEl  = document.getElementById('catalogo-progress');
  const progressBar = document.getElementById('catalogo-progress-bar');
  const progressTxt = document.getElementById('catalogo-progress-text');
  const progressSts = document.getElementById('catalogo-progress-stats');

  const confirmar = confirm(
    'Importar catálogo de ruas?\n\n' +
    '1. Baixa todas as ruas de Joinville em 1 request (~20s)\n' +
    '2. Salva automaticamente no mapa\n\nContinuar?'
  );
  if (!confirmar) return;

  progressEl.classList.remove('hidden');
  importacaoCancelada = false;
  document.getElementById('btn-importar-catalogo').disabled = true;

  // ── Passo 1: baixa TODAS as ruas de Joinville de uma vez ──
  progressTxt.textContent = 'Baixando mapa de Joinville (1 request)…';
  progressSts.textContent = 'Aguarde ~20 segundos';
  progressBar.style.width = '5%';

  const query = `[out:json][timeout:120];way["highway"]["name"](${JOINVILLE_BBOX});out geom;`;
  let osmData = null;
  for (const servidor of OVERPASS_SERVERS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 90000);
      const resp = await fetch(`${servidor}?data=${encodeURIComponent(query)}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (resp.ok) { osmData = await resp.json(); break; }
    } catch(e) { /* tenta próximo */ }
  }

  if (!osmData?.elements?.length) {
    progressEl.classList.add('hidden');
    document.getElementById('btn-importar-catalogo').disabled = false;
    alert('Falha ao baixar dados do OpenStreetMap.\nVerifique a conexão e tente novamente.');
    return;
  }

  // ── Passo 2: indexa por nome normalizado ──
  progressTxt.textContent = 'Indexando…';
  progressBar.style.width = '15%';

  const normLocal = s => (s||'').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();

  const porNome = new Map();
  for (const way of osmData.elements) {
    const nome = way.tags?.name; if (!nome) continue;
    const k = normLocal(nome);
    if (!porNome.has(k)) porNome.set(k, { nome, ways: [] });
    porNome.get(k).ways.push(way);
  }

  // ── Passo 3: monta fila deduplicated ──
  const visto = new Set(), fila = [];
  for (const [arq, nomeOsm] of CATALOGO_NOMES) {
    const k = normLocal(nomeOsm);
    if (visto.has(k)) continue;
    visto.add(k);
    const jaNoMapa = indiceBusca.some(r => normLocal(r.nome) === k);
    if (!jaNoMapa) fila.push({ arq, nomeOsm, k });
  }

  if (fila.length === 0) {
    progressEl.classList.add('hidden');
    document.getElementById('btn-importar-catalogo').disabled = false;
    alert('Todas as ruas do catálogo já estão no mapa!');
    return;
  }

  // ── Passo 4: salva no Firestore ──
  const total = fila.length;
  let sucesso = 0, erros = 0;

  for (let i = 0; i < fila.length; i++) {
    if (importacaoCancelada) break;
    const { arq, nomeOsm, k } = fila[i];

    progressTxt.textContent = `${i+1}/${total} — ${nomeOsm}`;
    progressBar.style.width = `${15 + Math.round((i / total) * 83)}%`;
    progressSts.textContent = `✓ ${sucesso}  ✗ ${erros}`;

    // Match exato, depois parcial
    let match = porNome.get(k);
    if (!match) {
      for (const [chave, val] of porNome) {
        if (chave.includes(k) || k.includes(chave)) { match = val; break; }
      }
    }

    if (!match) { erros++; continue; }

    try {
      const segs    = match.ways.map(w => w.geometry.map(n => [n.lon, n.lat]));
      const tipos   = match.ways.map(w => w.tags?.highway || '').filter(Boolean);
      const { tipo, sentido: sentidoBase } = TIPO_OSM[modoArray(tipos)] || { tipo: 'Via local', sentido: 'twoway' };
      const onewayCount = match.ways.filter(w => w.tags?.oneway === 'yes' || w.tags?.oneway === '1').length;
      const sentido = (onewayCount > match.ways.length / 2) ? 'oneway' : sentidoBase;
      const coords  = mesclarSegmentos(segs);
      const geometry = coords.length === 1
        ? { type: 'LineString', coordinates: coords[0] }
        : { type: 'MultiLineString', coordinates: coords };

      await window.db.collection('ruas').add({
        nome: match.nome, bairro: '', tipo, sentido, descricao: '',
        imagem: pathImagem(arq),
        geometriaJson: JSON.stringify(geometry),
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      });
      sucesso++;
    } catch(e) { erros++; }

    if (i % 10 === 9) await new Promise(r => setTimeout(r, 200));
  }

  progressBar.style.width = '100%';
  progressEl.classList.add('hidden');
  document.getElementById('btn-importar-catalogo').disabled = false;

  alert(importacaoCancelada
    ? `Cancelado.\n✓ ${sucesso} salvas  ✗ ${erros} não encontradas`
    : `Concluído!\n✓ ${sucesso} ruas adicionadas\n✗ ${erros} não encontradas no OSM`
  );
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
