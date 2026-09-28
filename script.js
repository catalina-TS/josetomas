// Dirección de mi backend (bit-cora-backend, corriendo con "node index.js").
// Todo fetch() de este archivo apunta acá. El día que lo suba a internet
// (Render u otro hosting), esta es la ÚNICA línea que tengo que cambiar.
const API_URL = "https://josetomas-backend.onrender.com";

// ===== CATEGORÍAS =====
// La lista maestra de secciones de mi bitácora. "id" es el valor técnico que
// uso en las URLs del backend y como clave interna; "nombre" es lo que se ve
// en pantalla. Si algún día agrego una categoría nueva, es acá donde la sumo.
const categorias = [
  { id: "peliculas", nombre: "Películas" },
  { id: "juegos",    nombre: "Juegos" },
  { id: "series",    nombre: "Series" },
  { id: "libros",    nombre: "Libros" },
  { id: "mangas",    nombre: "Mangas" },
  { id: "anime",     nombre: "Anime" }
];

// A partir de las categorías armamos los títulos "# películas", "# series"...
// (un objeto {peliculas: "# películas", series: "# series", ...}).
const titulos = {};
categorias.forEach(function (c) { titulos[c.id] = "# " + c.nombre.toLowerCase(); });

// Colores pastel para las etiquetas de género; se van asignando en orden
// a cada etiqueta nueva que se crea (y se repiten en ciclo si hay muchas).
const paletaEtiquetas = ["#cfe8f3", "#ffe3c2", "#d6e0ff", "#ffd3ea", "#ded4ff", "#d8f0d3", "#ffe9a8"];

// ===== CAMPOS "EXTRA" POR CATEGORÍA =====
// Cada categoría puede pedir campos distintos (a un libro no le pido
// "Director/a"). Todos estos campos viven dentro de la columna JSONB
// "detalles" en Postgres (Fase 6) - por eso puedo inventar categorías
// nuevas o cambiarles los campos sin tener que tocar la base de datos.
// Cada campo: "id" (la clave dentro de detalles), "icono" (de
// iconosPropiedad), "etiqueta" (lo que se ve), y opcionalmente
// "tipo": "select" + "opciones" para un desplegable en vez de texto libre.
const camposExtra = {
  peliculas: [
    { id: "director", icono: "persona", etiqueta: "Director/a" },
    { id: "estudio", icono: "edificio", etiqueta: "Estudio" },
    { id: "anio", icono: "calendario", etiqueta: "Fecha de publicación" },
    { id: "pais", icono: "bandera", etiqueta: "País" }
  ],
  libros: [
    { id: "autor", icono: "persona", etiqueta: "Autora/o" },
    { id: "editorial", icono: "edificio", etiqueta: "Editorial" },
    { id: "pais", icono: "bandera", etiqueta: "País" },
    { id: "paginas", icono: "texto", etiqueta: "Páginas" },
    { id: "primeraEdicion", icono: "calendario", etiqueta: "Fecha de publicación (1ª edición)" },
    { id: "edicionLeida", icono: "calendario", etiqueta: "Fecha de la edición que leí" },
    { id: "formato", icono: "etiqueta", etiqueta: "Formato", tipo: "select", opciones: ["Físico", "Digital"] }
  ]
};
// Devuelve los campos extra de una categoría, o los de "peliculas" si
// todavía no la personalicé (series, juegos, mangas, anime, por ahora).
function camposExtraDe(categoria) {
  return camposExtra[categoria] || camposExtra.peliculas;
}

// Etiqueta para "¿cuándo la consumí?" - cambia según la categoría (una
// película se "ve", un libro se "lee"). Si alguna categoría no necesita
// esta pregunta para nada, se le pone "null" y esa fila directamente no
// aparece (ni en la ficha ni en el formulario).
const etiquetaFechaVista = {
  peliculas: "Fecha en que la vi",
  libros: "Fecha en que lo leí"
};
// Devuelve la etiqueta de esta categoría, o "Fecha en que la vi" si todavía
// no la personalicé (series, juegos, mangas, anime, por ahora).
function etiquetaFechaVistaDe(categoria) {
  return etiquetaFechaVista.hasOwnProperty(categoria) ? etiquetaFechaVista[categoria] : "Fecha en que la vi";
}

// ===== GUARDADO: YA NO ES localStorage =====
// Antes acá vivían "datosPorDefecto" y la función guardar() que escribía en
// localStorage (el cajón secreto de CADA navegador). Se borraron a propósito:
// ahora la única fuente de verdad son mi base de datos Postgres (en Neon) y
// mi servidor Express (bit-cora-backend). Todo se pide/guarda con fetch(),
// nunca con localStorage. Así puedo entrar desde cualquier compu y ver lo mismo.

// Busca una etiqueta de género por nombre (sin importar mayúsculas) en la
// lista que YA traje del backend (generosDisponibles). Si no existe, la creo
// en el backend con el siguiente color de la paleta, y la agrego a mi copia
// local (generosDisponibles) para no tener que volver a pedirla.
async function obtenerOCrearGenero(nombre) {
  const limpio = (nombre || "").trim();
  if (!limpio) return null;
  let tag = generosDisponibles.find(function (g) { return g.nombre.toLowerCase() === limpio.toLowerCase(); });
  if (!tag) {
    const respuesta = await fetch(API_URL + "/generos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // "categoria" es la que hace que esta etiqueta quede propia de acá -
      // el mismo nombre creado en otra categoría sería una fila aparte.
      body: JSON.stringify({ nombre: limpio, color: paletaEtiquetas[generosDisponibles.length % paletaEtiquetas.length], categoria: categoriaActual })
    });
    tag = await respuesta.json();
    generosDisponibles.push(tag);
  }
  return tag;
}

// Escapa comillas y "&" para poder meter texto dentro de value="...".
// Sin esto, si un título tuviera comillas, rompería el HTML del input.
function escaparAtributo(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// Íconos chicos para cada fila del formulario (estilo lista de propiedades).
// Son SVG escritos a mano para no depender de ninguna librería de íconos externa.
const iconosPropiedad = {
  texto: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="#141414" stroke-width="1.5" stroke-linecap="round"><line x1="3" y1="4" x2="15" y2="4"/><line x1="3" y1="9" x2="15" y2="9"/><line x1="3" y1="14" x2="10" y2="14"/></svg>',
  persona: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="#141414" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="3"/><path d="M3 16c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/></svg>',
  edificio: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"><rect x="4" y="3" width="10" height="14" rx="1"/><rect x="6.5" y="6" width="2" height="2"/><rect x="10" y="6" width="2" height="2"/><rect x="6.5" y="10" width="2" height="2"/><rect x="10" y="10" width="2" height="2"/></svg>',
  calendario: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="#141414" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="12" height="11" rx="1.5"/><line x1="3" y1="7.5" x2="15" y2="7.5"/><line x1="6" y1="2.3" x2="6" y2="5"/><line x1="12" y1="2.3" x2="12" y2="5"/></svg>',
  bandera: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="#141414" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="2" x2="4" y2="16"/><path d="M4 3 h9 l-2.3 3 L13 9 H4"/></svg>',
  estrella: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="#141414" stroke-width="1.4" stroke-linejoin="round"><path d="M9 2.3 11 6.7 15.7 7.4 12.3 10.7 13.1 15.4 9 13.1 4.9 15.4 5.7 10.7 2.3 7.4 7 6.7Z"/></svg>',
  etiqueta: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="#141414" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M9 3 h4 l4 4-6.5 6.5-4-4V3Z"/><circle cx="10.6" cy="6.4" r="0.9" fill="#141414" stroke="none"/></svg>',
  parrafo: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="#141414" stroke-width="1.5" stroke-linecap="round"><line x1="3" y1="4" x2="15" y2="4"/><line x1="3" y1="8" x2="15" y2="8"/><line x1="3" y1="12" x2="11" y2="12"/><line x1="3" y1="16" x2="13" y2="16"/></svg>',
  comentario: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"><path d="M3 4 h12 v8 H8 l-3 3 v-3 H3 Z"/></svg>',
  imagen: '<svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="#141414" stroke-width="1.5" stroke-linejoin="round"><rect x="3" y="3" width="12" height="12" rx="1.5"/><circle cx="7" cy="7" r="1.2" fill="#141414" stroke="none"/><path d="M4 13 l3.5-4 2.5 3 2-2.5 2.5 3.5" stroke-linecap="round"/></svg>'
};

// Arma una fila "ícono + etiqueta + valor" del formulario (una por cada
// campo: Título, Director/a, Género, etc.). La uso una vez por cada input
// para no repetir el mismo HTML de envoltorio catorce veces.
function filaPropiedad(icono, etiqueta, valorHtml) {
  return '<div class="propiedad">'
    + '<span class="propiedad-icono">' + iconosPropiedad[icono] + '</span>'
    + '<span class="propiedad-label">' + etiqueta + '</span>'
    + '<div class="propiedad-valor">' + valorHtml + '</div>'
    + '</div>';
}

// ===== ELEMENTOS DEL HTML Y ESTADO GLOBAL =====
// Referencias a los elementos del HTML que voy a estar reescribiendo todo
// el tiempo. Las guardo una sola vez acá para no llamar getElementById en
// cada función.
const galeria = document.getElementById("galeria");
const tituloCategoria = document.getElementById("titulo-categoria");
const contadorEntradas = document.getElementById("contador-entradas");
const listaCategorias = document.getElementById("lista-categorias");

// Variables de estado: van cambiando mientras uso la app, y varias funciones
// las leen/escriben. No son datos que se guarden en ningún lado - son solo
// "en qué pantalla/paso estoy ahora mismo".
let categoriaActual = null;  // categoría abierta (ej: "peliculas")
let fichaActual = null;      // índice (en entradasActuales) de la película abierta en su ficha
let portadaSubida = "";      // imagen subida desde el computador (mientras el formulario está abierto)
let indiceEditando = null;   // índice de la ficha que se está editando (null = ficha nueva)
let estrellasFormulario = 0; // calificación elegida en el formulario, con clic directo
let generosSeleccionados = []; // nombres de las etiquetas elegidas en el formulario actual
let indiceArrastrado = null; // índice de la tarjeta que se está arrastrando en la grilla
let entradasActuales = [];   // lo que trajo el backend de la categoría abierta ahora mismo
                              // (se llena en recargarEntradasActuales(); YA NO es data[categoriaActual])
let generosDisponibles = []; // lista de etiquetas de género que trajo el backend
                              // (se llena en cargarGeneros(); YA NO es data.generos)

// ===== SIDEBAR: lista de categorías ("ARCHIVO") =====
// Un ícono de línea por categoría (estilo Feather), 18x18, mismo trazo para todos.
const iconosCategoria = {
  peliculas: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#141414" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>',
  juegos: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#141414" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="20" height="10" rx="5"/><line x1="7" y1="11" x2="7" y2="15"/><line x1="5" y1="13" x2="9" y2="13"/><circle cx="16" cy="11" r="0.8" fill="#141414" stroke="none"/><circle cx="18.5" cy="14" r="0.8" fill="#141414" stroke="none"/></svg>',
  series: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#141414" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>',
  libros: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#141414" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  mangas: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#141414" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  anime: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#141414" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'
};

// Ícono de papelera para el botón "Eliminar" de la ficha (usa currentColor
// para heredar el rojo definido en .btn-eliminar).
const iconoPapelera = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

// Dibuja la lista "ARCHIVO" del sidebar a partir de "categorias", y le
// engancha un clic a cada una para abrirla. Se llama una sola vez al arrancar.
function construirSidebar() {
  listaCategorias.innerHTML = categorias.map(function (c) {
    return '<li class="cat-item" data-cat="' + c.id + '">'
      + '<span class="cat-icono">' + iconosCategoria[c.id] + '</span>' + titulos[c.id] + '</li>';
  }).join("");

  listaCategorias.querySelectorAll(".cat-item").forEach(function (li) {
    li.addEventListener("click", function () { abrirCategoria(li.dataset.cat); });
  });
}

// Marca en negrita (clase "activa") la categoría abierta dentro del sidebar,
// y se la quita a todas las demás.
function marcarCategoriaActiva() {
  listaCategorias.querySelectorAll(".cat-item").forEach(function (li) {
    li.classList.toggle("activa", li.dataset.cat === categoriaActual);
  });
}

// ===== ESTRELLAS =====
// Estrella dibujada a mano (no el carácter "★" de la fuente): así conozco
// su geometría exacta y el recorte al 50% cae justo en la mitad real de la
// figura, en vez de la mitad "visual" del cajón de texto (que con la fuente
// dejaba la estrella casi completa en vez de a la mitad).
const SVG_ESTRELLA = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>';

// Dibuja 5 estrellas de solo lectura; cada una se llena 100%, 50% o 0%
// según la nota "n". La uso en las tarjetas de la galería.
function estrellasHTML(n) {
  let s = '<span class="estrellas-cont">';
  for (let i = 1; i <= 5; i++) {
    let ancho = 0;
    if (n >= i) ancho = 100;              // estrella entera
    else if (n >= i - 0.5) ancho = 50;    // media estrella
    s += '<span class="estrella"><span class="e-fondo">' + SVG_ESTRELLA + '</span>'
       + '<span class="e-frente" style="width:' + ancho + '%">' + SVG_ESTRELLA + '</span></span>';
  }
  return s + '</span>';
}
// Igual que la anterior, pero agrega dos zonas clickeables por estrella:
// la mitad izquierda vale i-0.5 y la derecha vale i. La uso en el formulario
// y en la ficha, donde sí se puede calificar haciendo clic.
function estrellasEditablesHTML(n) {
  let s = '<span class="estrellas-cont editable">';
  for (let i = 1; i <= 5; i++) {
    let ancho = 0;
    if (n >= i) ancho = 100;
    else if (n >= i - 0.5) ancho = 50;
    s += '<span class="estrella">'
       +   '<span class="e-fondo">' + SVG_ESTRELLA + '</span>'
       +   '<span class="e-frente" style="width:' + ancho + '%">' + SVG_ESTRELLA + '</span>'
       +   '<span class="zona izq" data-val="' + (i - 0.5) + '"></span>'
       +   '<span class="zona der" data-val="' + i + '"></span>'
       + '</span>';
  }
  return s + '</span>';
}

// ===== ETIQUETAS DE GÉNERO =====
// Lectura (ficha): pastillas de color, sin interacción. "nombres" es el
// arreglo de nombres de género que trae la entrada (viene ya armado desde
// el backend, ver adaptarEntrada más abajo).
function etiquetasHTML(nombres) {
  if (!nombres || nombres.length === 0) return "—";
  return nombres.map(function (n) {
    const tag = generosDisponibles.find(function (g) { return g.nombre === n; });
    const color = tag ? tag.color : "#e5e5e5";   // por si el género se borró y ya no está en la lista
    return '<span class="etiqueta-genero" style="background:' + color + '">' + n + '</span>';
  }).join(" ");
}
// Edición (formulario): todas las etiquetas existentes, marcando las elegidas.
// Cada una trae su "×" para poder eliminarla del todo (no solo desmarcarla).
function renderEtiquetasFormulario() {
  const cont = document.getElementById("f-etiquetas");
  if (!cont) return;   // el formulario todavía no está en pantalla
  cont.innerHTML = generosDisponibles.map(function (g) {
    const activa = generosSeleccionados.indexOf(g.nombre) !== -1;
    return '<span class="etiqueta-genero' + (activa ? " activa" : " inactiva") + '" data-genero="'
      + g.nombre + '" style="background:' + g.color + '">' + g.nombre
      + '<span class="etiqueta-quitar" data-quitar="' + g.nombre + '" title="Eliminar etiqueta">×</span>'
      + '</span>';
  }).join("");
}

// Borra una etiqueta de género DE RAÍZ en el backend (no solo la desmarca
// acá). Gracias al ON DELETE CASCADE de la tabla puente, el backend ya se
// encarga de sacarla de cualquier entrada que la tuviera puesta.
async function eliminarGenero(nombre) {
  const tag = generosDisponibles.find(function (g) { return g.nombre === nombre; });
  if (!tag) return;
  await fetch(API_URL + "/generos/" + tag.id, { method: "DELETE" });
  await cargarGeneros();   // refresco mi copia local con la lista real, ya sin esa etiqueta
  const pos = generosSeleccionados.indexOf(nombre);
  if (pos !== -1) generosSeleccionados.splice(pos, 1);   // por si estaba elegida en el formulario abierto
  renderEtiquetasFormulario();
}

// ===== ABRIR CATEGORÍA Y GALERÍA =====
// Se llama al hacer clic en una categoría del sidebar.
async function abrirCategoria(cat) {
  categoriaActual = cat;
  marcarCategoriaActiva();
  // Los géneros son independientes por categoría (Libros no ve las
  // etiquetas de Películas, ni al revés) - por eso hay que volver a
  // pedirlos cada vez que cambio de categoría, no solo una vez al arrancar.
  await cargarGeneros();
  mostrarGaleria();
}

// "Traductor" entre lo que devuelve Postgres y lo que espera mi HTML:
// - Postgres usa snake_case (titulo_es, fecha_vista) -> yo uso camelCase.
// - "detalles" (JSONB) lo dejo tal cual, como un objeto - ya no lo "aplano"
//   en propiedades fijas como director/estudio, porque cada categoría tiene
//   sus propias claves ahí adentro (ver camposExtra, más arriba).
function adaptarEntrada(fila) {
  return {
    id: fila.id,
    titulo: fila.titulo,
    tituloEs: fila.titulo_es,
    detalles: fila.detalles || {},
    generos: fila.generos || [],           // ya viene armado por el backend (JOIN + json_agg)
    estrellas: Number(fila.estrellas) || 0,
    sinopsis: fila.sinopsis,
    comentario: fila.comentario,
    portada: fila.portada,
    fechaVista: fila.fecha_vista,
    orden: fila.orden,
    // != null (no ===) para no confundir "0" (una posición válida, el borde
    // de la imagen) con "no tiene valor todavía" - con || 50 el 0 se hubiera
    // perdido, porque en JS "0" cuenta como falso.
    posicionX: fila.posicion_x != null ? Number(fila.posicion_x) : 50,
    posicionY: fila.posicion_y != null ? Number(fila.posicion_y) : 50
  };
}

// Le pregunta al backend todas las entradas de la categoría abierta y las
// guarda (ya traducidas) en entradasActuales. La llamo cada vez que necesito
// que la pantalla refleje lo último que hay en la base de datos.
async function recargarEntradasActuales() {
  const respuesta = await fetch(API_URL + "/entradas/" + categoriaActual);
  const filas = await respuesta.json();
  entradasActuales = filas.map(adaptarEntrada);
}

// Le pregunta al backend SOLO los géneros de la categoría abierta ahora
// mismo (ya no son compartidos entre todas) y los guarda en generosDisponibles.
async function cargarGeneros() {
  const respuesta = await fetch(API_URL + "/generos/" + categoriaActual);
  generosDisponibles = await respuesta.json();
}

// Dibuja la galería de tarjetas de la categoría abierta. Es "async" porque
// tiene que ESPERAR la respuesta del backend (fetch) antes de poder mostrar
// nada real - por eso el mensaje "Cargando..." que se ve un instante primero.
async function mostrarGaleria() {
  portadaEnModoMover = null;   // se va a redibujar todo: no queda ninguna portada "en modo"
  tituloCategoria.textContent = titulos[categoriaActual];
  galeria.innerHTML = '<p class="vacio">Cargando...</p>';

  await recargarEntradasActuales();

  contadorEntradas.textContent = "Entradas: [" + entradasActuales.length + "]";
  let html = '<button class="btn-retro" id="btn-agregar">+ agregar</button>';

  if (entradasActuales.length === 0) {
    html += '<p class="vacio">Todavía no hay nada aquí. ¡Pronto!</p>';
  } else {
    // El "subtítulo" de la tarjeta (bajo el título) es el PRIMER campo extra
    // de esta categoría - director para películas, autor para libros, etc.
    // Se calcula una sola vez acá afuera porque es el mismo para todas las
    // tarjetas de esta pasada (no cambia de una a otra, solo el valor).
    const campoSubtitulo = camposExtraDe(categoriaActual)[0];
    // Misma etiqueta que ya usan la ficha y el formulario ("vi" para
    // películas, "leí" para libros) - antes acá quedó fija por error.
    const etiquetaFV = etiquetaFechaVistaDe(categoriaActual);
    html += '<div class="grid-cards">' + entradasActuales.map(function (p, i) {
      // data-index nos permite saber qué película se clickeó (es la posición
      // dentro de entradasActuales, no el id real de la base de datos).
      // Cuando hay foto, apilo DOS fondos en la misma declaración (separados
      // por coma): el punteado va PRIMERO en la lista (queda arriba, semi-
      // transparente gracias al rgba) y la foto real va SEGUNDA (queda
      // debajo, se ve a través del punteado). Cada valor de
      // background-size/position "hace pareja" con la imagen de fondo que
      // está en su mismo orden dentro de la lista.
      // Mismo posicionX/posicionY que la ficha (antes era "center" fijo acá).
      const fondo = p.portada
        ? 'style="background-image:radial-gradient(rgba(20,20,20,0.18) 1.1px, transparent 1.3px), url(\'' + p.portada + '\');background-size:5px 5px, cover;background-position:0 0, ' + p.posicionX + '% ' + p.posicionY + '%"'
        : '';
      const valorSubtitulo = campoSubtitulo ? p.detalles[campoSubtitulo.id] : "";
      const autor = valorSubtitulo ? '<p class="card-autor">' + valorSubtitulo + '</p>' : '';
      const sinopsis = p.sinopsis ? '<p class="card-sinopsis">' + p.sinopsis + '</p>' : '';
      const fechaVista = (p.fechaVista && etiquetaFV) ? '<p class="card-fecha-vista">' + etiquetaFV + ': ' + p.fechaVista + '</p>' : '';
      // La portada es "draggable=false" para que arrastrar el ícono (para
      // reposicionar la foto) no dispare el arrastre nativo que reordena la
      // tarjeta entera (ver "ARRASTRAR Y SOLTAR TARJETAS" más abajo).
      return '<div class="card" data-index="' + i + '" draggable="true">'
        + '<div class="portada" draggable="false" ' + fondo + '>' + iconoMoverPortadaHTML(p) + '</div>'
        + '<div class="card-info"><p class="card-titulo">' + p.titulo + '</p>'
        + autor + sinopsis
        + '<div class="estrellas">' + estrellasHTML(p.estrellas) + '</div>'
        + fechaVista
        + '</div></div>';
    }).join("") + '</div>';
  }

  galeria.innerHTML = html;
  document.getElementById("btn-agregar").addEventListener("click", mostrarFormulario);
  // Una portada por tarjeta (las que no tienen foto, activarModoMoverPortada
  // no hace nada con ellas).
  document.querySelectorAll(".card .portada").forEach(function (el) {
    const card = el.closest(".card");
    const p = entradasActuales[parseInt(card.dataset.index)];
    if (p) activarModoMoverPortada(el, p);
  });
}

// Ícono de "mover": solo si hay foto (si no, no hay nada que arrastrar). Un
// clic prende/apaga el "modo mover" (ver activarModoMoverPortada); el
// arrastre de verdad se hace después, sobre la portada. stroke=currentColor
// para poder invertir los colores por CSS cuando el modo está activo
// (.modo-mover .portada-mover). La usan tanto la grilla como la ficha.
function iconoMoverPortadaHTML(p) {
  if (!p.portada) return '';
  return '<span class="portada-mover">'
    + '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">'
    +   '<rect x="4" y="4" width="16" height="16" rx="2"/>'
    + '</svg></span>';
}

// Portada que está "en modo mover" ahora mismo (o null si ninguna). Solo
// puede haber una a la vez: entrar en modo en una desactiva la anterior.
let portadaEnModoMover = null;

function activarModoMover(el) {
  if (portadaEnModoMover && portadaEnModoMover !== el) desactivarModoMover();
  portadaEnModoMover = el;
  el.classList.add("modo-mover");
  // "draggable=false" en la portada no alcanza a bloquear el arrastre
  // nativo de la tarjeta ancestro (es inconsistente entre navegadores) -
  // así que mientras el modo esté prendido, directamente le apago el
  // arrastre a LA TARJETA completa. Así no compite con el arrastre de la
  // foto, que lo maneja este mismo archivo con Pointer Events. La portada
  // de la FICHA no tiene tarjeta alrededor, por eso el chequeo de null.
  const card = el.closest(".card");
  if (card) card.draggable = false;
}
function desactivarModoMover() {
  if (portadaEnModoMover) {
    portadaEnModoMover.classList.remove("modo-mover");
    const card = portadaEnModoMover.closest(".card");
    if (card) card.draggable = true;   // vuelve a poder reordenarse
  }
  portadaEnModoMover = null;
}
// Clic en cualquier lado que NO sea la portada activa -> apaga el modo
// (un solo listener global, no uno por portada).
document.addEventListener("click", function (e) {
  if (portadaEnModoMover && !portadaEnModoMover.contains(e.target)) desactivarModoMover();
});

// Prende el botón/modo "mover" de UNA portada (foto de fondo con
// posicionX/posicionY guardados por entrada). La usan tanto las portadas
// chicas de la grilla como el banner grande de la ficha - "el" es el
// elemento con el fondo (".portada" o ".ficha-portada"), "p" es la
// entrada correspondiente. El iconito solo prende/apaga el modo; el
// arrastre de verdad se hace clickeando y moviendo sobre la portada
// mientras está en modo. Clickear cualquier otra cosa apaga el modo (ver
// el listener de "click" en document, más arriba).
function activarModoMoverPortada(el, p) {
  const manija = el.querySelector(".portada-mover");
  if (!p.portada || !manija) return;   // sin foto, nada que arrastrar

  // El iconito solo prende/apaga el modo, no arrastra nada él mismo. Corta
  // el "pointerdown" para que NUNCA le llegue (por burbujeo) al listener
  // de abajo que arrastra la portada - si no, ese listener capturaba el
  // puntero (setPointerCapture) antes de que el clic del ícono terminara
  // de procesarse, y el apagado no se disparaba bien.
  manija.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
  manija.addEventListener("click", function (e) {
    e.stopPropagation();
    if (portadaEnModoMover === el) desactivarModoMover(); else activarModoMover(el);
  });

  let arrastrando = false, moved = false;
  let inicioX = 0, inicioY = 0;
  let posXInicio = 0, posYInicio = 0;

  el.addEventListener("pointerdown", function (e) {
    if (portadaEnModoMover !== el) return;   // fuera de modo, la portada no hace nada
    arrastrando = true;
    moved = false;
    inicioX = e.clientX;
    inicioY = e.clientY;
    posXInicio = p.posicionX;
    posYInicio = p.posicionY;
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", function (e) {
    if (!arrastrando) return;
    const deltaX = e.clientX - inicioX;
    const deltaY = e.clientY - inicioY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) moved = true;
    let nuevoX = posXInicio - (deltaX / el.offsetWidth) * 100;
    let nuevoY = posYInicio - (deltaY / el.offsetHeight) * 100;
    nuevoX = Math.max(0, Math.min(100, nuevoX));
    nuevoY = Math.max(0, Math.min(100, nuevoY));
    p.posicionX = nuevoX;
    p.posicionY = nuevoY;
    el.style.backgroundPosition = "0 0, " + nuevoX + "% " + nuevoY + "%";
  });

  el.addEventListener("pointerup", async function () {
    if (!arrastrando) return;
    arrastrando = false;
    if (!moved) return;   // fue solo un clic: no le pego al backend por nada
    // La posición queda guardada acá mismo (en el backend), así que la
    // próxima vez que se cargue esta entrada (grilla o ficha) viene con la
    // posición nueva - no hace falta nada más para que sea "permanente".
    // Si el guardado falla, lo dejo bien visible en la consola: si no,
    // quedaría la sensación de que se guardó cuando en realidad se va a
    // perder al recargar.
    const respuesta = await fetch(API_URL + "/entradas/" + categoriaActual + "/" + p.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: p.titulo, tituloEs: p.tituloEs, portada: p.portada,
        estrellas: p.estrellas, sinopsis: p.sinopsis, comentario: p.comentario,
        fechaVista: p.fechaVista, orden: p.orden,
        posicionX: p.posicionX, posicionY: p.posicionY,
        detalles: p.detalles   // ya no hay que armarlo campo por campo: es el mismo objeto que ya tenía
      })
    });
    if (!respuesta.ok) {
      console.error("No se pudo guardar la posición de la portada (respuesta " + respuesta.status + "). Al recargar, va a volver a la posición anterior.");
    }
  });

  // Mientras esté en modo, ningún clic sobre la portada debe hacer su
  // efecto normal (abrir la ficha en la grilla) - se corta acá antes de
  // llegar al detector de clics de la galería.
  el.addEventListener("click", function (e) {
    if (portadaEnModoMover === el) e.stopPropagation();
  });
}

// ===== FICHA (al hacer clic en una película) =====
// Dibuja el detalle completo de una entrada. "i" es su posición dentro de
// entradasActuales (no su id real).
function mostrarFicha(i) {
  portadaEnModoMover = null;   // se va a redibujar todo: no queda ninguna portada "en modo"
  fichaActual = i;
  const p = entradasActuales[i];
  // Mismo truco de "dos fondos apilados" que en la tarjeta de la galería:
  // punteado semitransparente encima, foto real debajo. A diferencia de la
  // tarjeta, acá la posición de la foto NO es fija ("center") - uso
  // posicionX/posicionY, que se ajustan con el mismo botón/modo "mover"
  // que las portadas de la grilla (ver activarModoMoverPortada).
  const fondo = p.portada
    ? 'style="background-image:radial-gradient(rgba(20,20,20,0.18) 1.1px, transparent 1.3px), url(\'' + p.portada + '\');background-size:5px 5px, cover;background-position:0 0, ' + p.posicionX + '% ' + p.posicionY + '%"'
    : '';
  // Una fila "<b>Etiqueta:</b> valor" por cada campo extra de esta
  // categoría (Director/a+Estudio+Fecha+País para películas, Autora/o+
  // Editorial+País+Páginas+Formato para libros, etc.) - "—" si está vacío.
  const filasExtraFicha = camposExtraDe(categoriaActual).map(function (campo) {
    return '<p class="dato"><b>' + campo.etiqueta + ':</b> ' + (p.detalles[campo.id] || "—") + '</p>';
  }).join("");
  // "Fecha en que la vi/leí", con la etiqueta que le toque a esta categoría
  // (o nada, si esa categoría no la usa - ver etiquetaFechaVista).
  const etiquetaFV = etiquetaFechaVistaDe(categoriaActual);
  const filaFechaVista = etiquetaFV
    ? '<p class="dato"><b>' + etiquetaFV + ':</b> ' + (p.fechaVista || "—") + '</p>'
    : "";
  const generosFicha = p.generos || [];
  galeria.innerHTML =
    '<div class="ficha-acciones">'
    +   '<button class="btn-retro" id="btn-volver">← volver</button>'
    +   '<button class="btn-retro" id="btn-editar">Editar</button>'
    +   '<button class="btn-retro btn-eliminar" id="btn-eliminar" title="Eliminar" aria-label="Eliminar">' + iconoPapelera + '</button>'
    + '</div>'
    // La portada ya no va al lado del texto (era chica, 140x200) - ahora es
    // un banner ancho arriba de todo, como una portada de verdad. Por eso
    // salió del <div class="ficha-cabecera"> que las ponía una junto a la
    // otra (ver style.css: esa clase ya no se usa más acá).
    + '<div class="ficha-portada" ' + fondo + '>' + iconoMoverPortadaHTML(p) + '</div>'
    + '<div class="ficha-datos">'
    +     '<h2 class="ficha-titulo">' + p.titulo + '</h2>'
    +     '<p class="ficha-sub">Título en español: ' + (p.tituloEs || "—") + '</p>'
    // Estrellas de SOLO LECTURA acá: la calificación solo se cambia entrando
    // a "Editar" (ver filaPropiedad("estrella", ...) en mostrarFormulario).
    +     '<div class="rating-edit">' + estrellasHTML(p.estrellas) + '</div>'
    +     filasExtraFicha
    +     '<p class="dato"><b>Género:</b> ' + etiquetasHTML(generosFicha) + '</p>'
    +     filaFechaVista
    + '</div>'
    + '<p class="ficha-label">Sinopsis</p>'
    + '<p class="ficha-texto">' + (p.sinopsis || "—") + '</p>'
    + '<details class="ficha-comentario-desplegable">'
    +   '<summary>Mi comentario</summary>'
    +   '<div class="ficha-comentario">&gt; ' + (p.comentario || "—") + '</div>'
    + '</details>';

  const elPortada = document.querySelector(".ficha-portada");
  if (elPortada) activarModoMoverPortada(elPortada, p);
}

// ===== FORMULARIO PARA AGREGAR O EDITAR =====
// Si se pasa "indice", el formulario se precarga con esa ficha (viene de
// entradasActuales) y al guardar se reemplaza en vez de crear una nueva.
function mostrarFormulario(indice) {
  indiceEditando = (typeof indice === "number") ? indice : null;
  const editando = indiceEditando !== null ? entradasActuales[indiceEditando] : null;

  portadaSubida = editando ? (editando.portada || "") : "";
  estrellasFormulario = editando ? (editando.estrellas || 0) : 0;
  generosSeleccionados = editando ? (editando.generos || []).slice() : [];

  const val = function (campo) { return editando ? escaparAtributo(editando[campo]) : ""; };
  const texto = function (campo) { return editando ? (editando[campo] || "") : ""; };
  // Como val()/texto(), pero para leer adentro de "detalles" en vez de
  // directo del objeto (autor, editorial, paginas... ver camposExtra).
  const valDetalle = function (campo) { return editando ? escaparAtributo(editando.detalles[campo]) : ""; };

  // Una fila de formulario por cada campo extra de esta categoría. Si el
  // campo es "select" (como Formato: Físico/Digital), armo un <select> con
  // sus opciones; si no, un <input> de texto normal, igual que los demás.
  const filasExtraForm = camposExtraDe(categoriaActual).map(function (campo) {
    let campoHtml;
    if (campo.tipo === "select") {
      const opcionesHtml = campo.opciones.map(function (op) {
        const marcado = editando && editando.detalles[campo.id] === op ? " selected" : "";
        return '<option value="' + op + '"' + marcado + '>' + op + '</option>';
      }).join("");
      campoHtml = '<select id="f-' + campo.id + '">' + opcionesHtml + '</select>';
    } else {
      campoHtml = '<input id="f-' + campo.id + '" type="text" autocomplete="off" value="' + valDetalle(campo.id) + '">';
    }
    return filaPropiedad(campo.icono, campo.etiqueta, campoHtml);
  }).join("");
  // "Fecha en que la vi/leí": con la etiqueta de esta categoría, o nada si
  // esta categoría no la usa.
  const etiquetaFVForm = etiquetaFechaVistaDe(categoriaActual);
  const filaFechaVistaForm = etiquetaFVForm
    ? filaPropiedad("calendario", etiquetaFVForm, '<input id="f-fechaVista" type="text" autocomplete="off" value="' + val("fechaVista") + '">')
    : "";
  // El link de portada solo se precarga si era un link (no una imagen subida en base64).
  const linkPortada = (editando && editando.portada && editando.portada.indexOf("data:") !== 0)
    ? editando.portada : "";
  // La envuelvo en un <div class="preview-imagen"> porque una <img> sola no
  // puede mostrar un fondo CSS "debajo" de sí misma (ella ocupa todo su
  // propio recuadro) - el punteado semitransparente se dibuja con ::after
  // sobre este contenedor, ver style.css.
  const previewInicial = portadaSubida
    ? '<div class="preview-imagen"><img src="' + portadaSubida + '"></div>'
    : "";

  // autocomplete="off" en cada input/textarea: sin esto, el navegador
  // "recuerda" cosas que escribí antes en campos parecidos y las sugiere -
  // no es un dato mío que quede guardado en ningún lado (eso ya no pasa
  // desde que se borró localStorage), es el propio navegador ofreciéndome
  // autocompletar. Con esto se lo desactivo.
  galeria.innerHTML =
    '<div class="formulario">'
    + filaPropiedad("texto", "Título", '<input id="f-titulo" type="text" autocomplete="off" value="' + val("titulo") + '">')
    + filaPropiedad("texto", "Título en español", '<input id="f-tituloEs" type="text" autocomplete="off" value="' + val("tituloEs") + '">')
    + filasExtraForm
    + filaPropiedad("etiqueta", "Género",
        '<div class="etiquetas-form" id="f-etiquetas"></div>'
        + '<div class="etiqueta-nueva">'
        +   '<input id="f-genero-nuevo" type="text" autocomplete="off" placeholder="nueva etiqueta...">'
        +   '<button type="button" class="btn-retro" id="f-genero-agregar">+ etiqueta</button>'
        + '</div>')
    + filaFechaVistaForm
    + filaPropiedad("estrella", "Calificación", '<div class="rating-edit" id="f-rating">' + estrellasEditablesHTML(estrellasFormulario) + '</div>')
    + filaPropiedad("parrafo", "Sinopsis", '<textarea id="f-sinopsis" rows="3" autocomplete="off">' + texto("sinopsis") + '</textarea>')
    + filaPropiedad("comentario", "Mi comentario", '<textarea id="f-comentario" rows="3" autocomplete="off">' + texto("comentario") + '</textarea>')
    + filaPropiedad("imagen", "Portada",
        '<label class="btn-retro" for="f-archivo">Elegir imagen</label>'
        + (portadaSubida || linkPortada ? ' <button type="button" class="btn-retro btn-eliminar" id="f-quitar-imagen">Quitar imagen</button>' : '')
        + '<input id="f-archivo" type="file" accept="image/*" class="input-archivo-oculto">'
        + '<span class="nombre-archivo" id="f-archivo-nombre">' + (portadaSubida ? "Imagen actual" : "Sin imagen") + '</span>'
        + '<div id="f-preview">' + previewInicial + '</div>'
        + '<input id="f-portada" type="text" autocomplete="off" placeholder="...o pega un link de imagen" value="' + escaparAtributo(linkPortada) + '">')
    + '<p id="f-error" style="color:#a32d2d;font-size:13px;margin:6px 0 0;"></p>'
    + '<div class="form-acciones">'
    +   '<button class="btn-retro" id="f-guardar">Guardar</button>'
    +   '<button class="btn-retro" id="f-cancelar">Cancelar</button>'
    + '</div>'
    + '</div>';

  renderEtiquetasFormulario();

  document.getElementById("f-archivo").addEventListener("change", leerArchivo);
  document.getElementById("f-guardar").addEventListener("click", guardarPelicula);
  document.getElementById("f-cancelar").addEventListener("click", function () {
    if (indiceEditando !== null) mostrarFicha(indiceEditando); else mostrarGaleria();
  });
  document.getElementById("f-genero-nuevo").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();   // que Enter no intente enviar ningún formulario nativo
      document.getElementById("f-genero-agregar").click();
    }
  });
  const btnQuitarImagen = document.getElementById("f-quitar-imagen");
  if (btnQuitarImagen) btnQuitarImagen.addEventListener("click", quitarImagenFormulario);
}

// Borra la portada actual del formulario (subida o por link), sin tocar
// el resto de los datos; recién se guarda de verdad al apretar "Guardar".
function quitarImagenFormulario() {
  portadaSubida = "";
  document.getElementById("f-preview").innerHTML = "";
  document.getElementById("f-portada").value = "";
  document.getElementById("f-archivo").value = "";
  document.getElementById("f-archivo-nombre").textContent = "Sin imagen";
  document.getElementById("f-quitar-imagen").remove();
}

// Lee la imagen elegida y la convierte en texto (base64) para poder
// mandarla al backend igual que cualquier otro campo de texto.
function leerArchivo(e) {
  const archivo = e.target.files[0];        // el archivo que elegí
  if (!archivo) return;
  const lector = new FileReader();          // el "lector de archivos" del navegador
  lector.onload = function () {             // cuando termina de leer...
    portadaSubida = lector.result;          // guardo la imagen convertida en texto
    document.getElementById("f-preview").innerHTML =
      '<div class="preview-imagen"><img src="' + portadaSubida + '"></div>';
    document.getElementById("f-archivo-nombre").textContent = archivo.name;
  };
  lector.readAsDataURL(archivo);            // dispara la lectura (es asíncrona)
}

// Junta todo lo del formulario, lo manda al backend (crear o editar según
// indiceEditando), y sincroniza los géneros elegidos. Es el corazón de
// "Guardar".
async function guardarPelicula() {
  const titulo = document.getElementById("f-titulo").value.trim();
  if (titulo === "") {
    document.getElementById("f-error").textContent = "El título no puede estar vacío.";
    return;
  }
  // Armo "detalles" leyendo, uno por uno, los campos que le tocan a ESTA
  // categoría (ver camposExtra) - así sirve igual para películas, libros, o
  // cualquier categoría nueva que agregue después, sin tener que escribir
  // un bloque de código distinto para cada una.
  const detallesForm = {};
  camposExtraDe(categoriaActual).forEach(function (campo) {
    const el = document.getElementById("f-" + campo.id);
    detallesForm[campo.id] = el ? el.value.trim() : "";
  });
  // El campo "f-fechaVista" a veces ni siquiera existe en el HTML (si esta
  // categoría tiene "null" en etiquetaFechaVista) - por eso el chequeo
  // antes de leer su .value.
  const elFechaVista = document.getElementById("f-fechaVista");

  const entrada = {
    titulo: titulo,
    tituloEs: document.getElementById("f-tituloEs").value.trim(),
    portada: portadaSubida || document.getElementById("f-portada").value.trim(),
    estrellas: estrellasFormulario,     // se elige haciendo clic en las estrellas
    sinopsis: document.getElementById("f-sinopsis").value.trim(),
    comentario: document.getElementById("f-comentario").value.trim(),
    fechaVista: elFechaVista ? elFechaVista.value.trim() : "",
    orden: indiceEditando !== null ? entradasActuales[indiceEditando].orden : null,
    // Igual que "orden": si estoy editando, mantengo la posición de recorte
    // que ya tenía (no quiero que guardar el formulario descentre la foto
    // sin querer); si es una ficha nueva, arranca centrada (50/50).
    posicionX: indiceEditando !== null ? entradasActuales[indiceEditando].posicionX : 50,
    posicionY: indiceEditando !== null ? entradasActuales[indiceEditando].posicionY : 50,
    detalles: detallesForm
  };

  let id;                      // id real de la entrada (lo necesito para conectar géneros)
  let generosAnteriores = [];  // qué géneros tenía ANTES de guardar (solo aplica si estoy editando)

  if (indiceEditando === null) {
    // Ficha nueva: creo la entrada y leo la respuesta para saber qué id le
    // asignó Postgres (todavía no lo sé, porque recién se está creando).
    const respuesta = await fetch(API_URL + "/entradas/" + categoriaActual, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entrada)
    });
    const creada = await respuesta.json();
    id = creada.id;
  } else {
    // Ficha existente: ya sé el id, y guardo qué géneros tenía antes de
    // pisarlos, para poder compararlos más abajo.
    const anterior = entradasActuales[indiceEditando];
    id = anterior.id;
    generosAnteriores = anterior.generos || [];
    await fetch(API_URL + "/entradas/" + categoriaActual + "/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entrada)
    });
  }

  // Sincronizo los géneros comparando "lo que había antes" contra "lo que
  // elegí ahora en el formulario": lo nuevo se conecta, lo que saqué se
  // desconecta. (Uso "for...of" y no ".forEach" porque .forEach no espera
  // los await de adentro - seguiría al siguiente antes de terminar el fetch.)
  for (const nombre of generosSeleccionados) {
    if (generosAnteriores.indexOf(nombre) === -1) {
      const tag = generosDisponibles.find(function (g) { return g.nombre === nombre; });
      if (tag) await fetch(API_URL + "/entradas/" + id + "/generos/" + tag.id, { method: "POST" });
    }
  }
  for (const nombre of generosAnteriores) {
    if (generosSeleccionados.indexOf(nombre) === -1) {
      const tag = generosDisponibles.find(function (g) { return g.nombre === nombre; });
      if (tag) await fetch(API_URL + "/entradas/" + id + "/generos/" + tag.id, { method: "DELETE" });
    }
  }

  mostrarGaleria();
}

// ===== CLICS DENTRO DE LA GALERÍA (un solo detector para todo) =====
// En vez de poner un addEventListener por cada botón/tarjeta (que además se
// re-dibujan todo el tiempo y perderían sus listeners), pongo UN SOLO
// detector en el contenedor "galeria" y me fijo QUÉ se clickeó mirando
// e.target. Es "async" porque varias ramas de acá adentro usan await/fetch.
galeria.addEventListener("click", async function (e) {
  // ¿clic en media/entera estrella? Solo puede venir del formulario: en la
  // ficha las estrellas son de solo lectura (estrellasHTML, sin data-val) -
  // para cambiar la calificación hay que entrar a "Editar".
  const media = e.target.closest("[data-val]");
  if (media) {
    const contenedorForm = media.closest("#f-rating");
    if (contenedorForm) {
      // Solo cambio la variable local, todavía no se manda nada al backend
      // (eso pasa recién al apretar "Guardar").
      estrellasFormulario = parseFloat(media.dataset.val);
      contenedorForm.innerHTML = estrellasEditablesHTML(estrellasFormulario);
    }
    return;
  }
  // ¿clic en la "×" de una etiqueta? -> la borra del todo (con confirmación)
  const quitar = e.target.closest(".etiqueta-quitar");
  if (quitar) {
    const nombre = quitar.dataset.quitar;
    confirmarPersonalizado('¿Eliminar la etiqueta "' + nombre + '"? Se va a sacar de todas las fichas que la tengan.').then(async function (ok) {
      if (ok) await eliminarGenero(nombre);
    });
    return;
  }
  // ¿clic en una etiqueta del formulario? -> la prende/apaga (solo local,
  // todavía no toca el backend - eso pasa al guardar la ficha).
  const etiqueta = e.target.closest(".etiqueta-genero");
  if (etiqueta && document.getElementById("f-etiquetas")) {
    const nombre = etiqueta.dataset.genero;
    const pos = generosSeleccionados.indexOf(nombre);
    if (pos === -1) generosSeleccionados.push(nombre); else generosSeleccionados.splice(pos, 1);
    renderEtiquetasFormulario();
    return;
  }
  // ¿clic en "+ etiqueta"? -> crea (o reutiliza) la etiqueta escrita en el
  // backend y la marca como elegida.
  if (e.target.closest("#f-genero-agregar")) {
    const inputNuevo = document.getElementById("f-genero-nuevo");
    const tag = await obtenerOCrearGenero(inputNuevo.value);
    if (tag) {
      if (generosSeleccionados.indexOf(tag.nombre) === -1) generosSeleccionados.push(tag.nombre);
      inputNuevo.value = "";
      renderEtiquetasFormulario();
    }
    return;
  }
  // ¿clic en "volver"?
  if (e.target.closest("#btn-volver")) { mostrarGaleria(); return; }
  // ¿clic en "editar"? -> abre el formulario precargado con esta ficha
  if (e.target.closest("#btn-editar")) { mostrarFormulario(fichaActual); return; }
  // ¿clic en "eliminar"? -> pide confirmación con el modal propio y borra la
  // ficha DE VERDAD en el backend (no solo de la pantalla).
  if (e.target.closest("#btn-eliminar")) {
    confirmarPersonalizado("¿Eliminar esta ficha? No se puede deshacer.").then(async function (ok) {
      if (!ok) return;
      const id = entradasActuales[fichaActual].id;
      await fetch(API_URL + "/entradas/" + categoriaActual + "/" + id, { method: "DELETE" });
      mostrarGaleria();
    });
    return;
  }
  // ¿clic en una tarjeta? -> abre su ficha (el clic en el iconito de mover
  // la portada nunca llega hasta acá: corta su propia propagación)
  const card = e.target.closest(".card");
  if (card) { mostrarFicha(parseInt(card.dataset.index)); return; }
});

// ===== ARRASTRAR Y SOLTAR TARJETAS (reordenar la grilla) =====
// Las 5 funciones de acá abajo se disparan en distintos momentos del
// arrastre nativo del navegador (drag & drop de HTML5).

// Se dispara al EMPEZAR a arrastrar una tarjeta: anoto cuál es.
galeria.addEventListener("dragstart", function (e) {
  // Si el arrastre empieza dentro de la portada (foto o el iconito de
  // mover), NUNCA es para reordenar la tarjeta - es para reposicionar la
  // foto. "draggable=false" en .portada ya debería bastar, pero esto lo
  // deja garantizado sin depender de esa herencia.
  if (e.target.closest(".portada")) { e.preventDefault(); return; }
  const card = e.target.closest(".card");
  if (!card) return;
  indiceArrastrado = parseInt(card.dataset.index);
  card.classList.add("arrastrando");
  e.dataTransfer.effectAllowed = "move";
});

// Se dispara TODO EL TIEMPO mientras paso arrastrando por encima de una
// tarjeta. e.preventDefault() es obligatorio para que el navegador permita
// soltar ahí (si no, por defecto no deja soltar en ningún lado).
galeria.addEventListener("dragover", function (e) {
  const card = e.target.closest(".card");
  if (!card || indiceArrastrado === null) return;
  e.preventDefault();
  card.classList.add("sobre-destino");
});

// Se dispara al salir de encima de una tarjeta sin soltar ahí todavía.
galeria.addEventListener("dragleave", function (e) {
  const card = e.target.closest(".card");
  if (card) card.classList.remove("sobre-destino");
});

// Se dispara al SOLTAR la tarjeta: acá es donde de verdad cambia el orden.
// Es "async" porque después de reordenar localmente, tengo que avisarle al
// backend la nueva posición de cada entrada, una por una.
galeria.addEventListener("drop", async function (e) {
  const card = e.target.closest(".card");
  if (!card || indiceArrastrado === null) return;
  e.preventDefault();
  const indiceDestino = parseInt(card.dataset.index);
  if (indiceDestino !== indiceArrastrado) {
    // Reordeno el arreglo local primero (igual que antes de conectar el
    // backend): saco la tarjeta de donde estaba y la meto en su lugar nuevo.
    const [movida] = entradasActuales.splice(indiceArrastrado, 1);
    entradasActuales.splice(indiceDestino, 0, movida);

    // Ahora recorro TODA la lista y le mando a cada entrada su nueva
    // posición (su índice "i") como valor de "orden", para que el orden
    // quede guardado de verdad en la base de datos y no solo en pantalla.
    for (let i = 0; i < entradasActuales.length; i++) {
      const p = entradasActuales[i];
      const entrada = {
        titulo: p.titulo, tituloEs: p.tituloEs, portada: p.portada,
        estrellas: p.estrellas, sinopsis: p.sinopsis, comentario: p.comentario,
        fechaVista: p.fechaVista, orden: i,
        posicionX: p.posicionX, posicionY: p.posicionY,
        detalles: p.detalles
      };
      await fetch(API_URL + "/entradas/" + categoriaActual + "/" + p.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entrada)
      });
    }
    await mostrarGaleria();
  }
  indiceArrastrado = null;
});

// Se dispara SIEMPRE al terminar el arrastre (se haya soltado bien o no).
// Limpia las clases visuales por si el drop no llegó a completarse (se
// soltó afuera de cualquier tarjeta, se canceló, etc.).
galeria.addEventListener("dragend", function () {
  galeria.querySelectorAll(".arrastrando, .sobre-destino").forEach(function (el) {
    el.classList.remove("arrastrando", "sobre-destino");
  });
  indiceArrastrado = null;
});

// ===== MODAL DE CONFIRMACIÓN (reemplaza el confirm() nativo del navegador) =====
// Devuelve una promesa que resuelve en true/false según el botón que
// clickeé, para poder usar ".then(...)" (o "await") en vez del feo
// confirm() del navegador, y que combine con el estilo retro de la página.
function confirmarPersonalizado(mensaje) {
  return new Promise(function (resolve) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML =
      '<div class="modal-caja">'
      +   '<p class="modal-mensaje">' + mensaje + '</p>'
      +   '<div class="modal-acciones">'
      +     '<button class="btn-retro" id="modal-cancelar">Cancelar</button>'
      +     '<button class="btn-retro btn-eliminar" id="modal-confirmar">Eliminar</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(overlay);

    function cerrar(resultado) {
      overlay.remove();
      resolve(resultado);   // acá es donde el .then(function(ok) {...}) recibe el true/false
    }
    overlay.querySelector("#modal-cancelar").addEventListener("click", function () { cerrar(false); });
    overlay.querySelector("#modal-confirmar").addEventListener("click", function () { cerrar(true); });
    // Clic afuera de la caja también cancela.
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) cerrar(false);
    });
  });
}

// ===== ARRANQUE =====
// Tiene que ser async porque cargarGeneros() usa fetch/await: necesito
// esperar a tener los géneros ANTES de dibujar cualquier ficha o formulario
// que los use (si no, generosDisponibles estaría vacío la primera vez).
async function iniciar() {
  construirSidebar();
  // abrirCategoria ya se encarga de pedir los géneros de esa categoría -
  // antes esta línea llamaba cargarGeneros() ella misma, pero en ese
  // momento categoriaActual todavía era null (se define recién adentro de
  // abrirCategoria), así que hubiera pedido "/generos/null".
  await abrirCategoria(categorias[0].id);  // la página carga directo en la primera categoría
}
iniciar();
