const STORAGE_KEY = "psp-resultados";
const LETRAS = ["a", "b", "c", "d"];

const $ = (id) => document.getElementById(id);

let estado = null;

// ---------- Navegación ----------
function mostrar(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo(0, 0);
}

// ---------- Almacenamiento ----------
const EN_LINEA = typeof SCRIPT_URL === "string" && SCRIPT_URL.trim() !== "";
const PENDIENTES_KEY = "psp-pendientes";

function leerLista(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function escribirLista(key, lista) {
  try {
    localStorage.setItem(key, JSON.stringify(lista));
    return true;
  } catch {
    return false;
  }
}

function cargarResultados() {
  return leerLista(STORAGE_KEY);
}

// Siempre guarda una copia local; si hay SCRIPT_URL, además la envía a Google Sheets.
// Se puede llamar varias veces con el mismo resultado (reintentos) sin duplicarlo.
async function guardarResultado(resultado) {
  const locales = cargarResultados();
  if (!locales.some((r) => r.id === resultado.id)) escribirLista(STORAGE_KEY, [...locales, resultado]);
  if (!EN_LINEA) return "local";
  const pendientes = leerLista(PENDIENTES_KEY).filter((r) => r.id !== resultado.id);
  try {
    await enviarEnLinea(resultado);
    escribirLista(PENDIENTES_KEY, pendientes);
    return "online";
  } catch {
    escribirLista(PENDIENTES_KEY, [...pendientes, resultado]);
    return "error";
  }
}

async function enviarEnLinea(resultado) {
  // Sin cabeceras personalizadas (text/plain) para evitar el preflight CORS de Apps Script.
  const res = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(resultado) });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "error");
}

// Reintenta los resultados que no se pudieron enviar antes (el servidor ignora duplicados).
async function reenviarPendientes() {
  if (!EN_LINEA) return;
  const pendientes = leerLista(PENDIENTES_KEY);
  if (!pendientes.length) return;
  const fallidos = [];
  for (const r of pendientes) {
    try {
      await enviarEnLinea(r);
    } catch {
      fallidos.push(r);
    }
  }
  escribirLista(PENDIENTES_KEY, fallidos);
}

// ---------- Prueba ----------
function iniciar(nombre) {
  estado = {
    nombre,
    inicio: Date.now(),
    indice: 0,
    aciertos: 0,
    respuestas: [],
  };
  mostrar("screen-quiz");
  mostrarPregunta();
}

function mostrarPregunta() {
  const p = PREGUNTAS[estado.indice];
  $("q-counter").textContent = `${estado.indice + 1} / ${PREGUNTAS.length}`;
  $("q-score").textContent = `${estado.aciertos} correctas`;
  $("progress-bar").style.width = `${(estado.indice / PREGUNTAS.length) * 100}%`;
  $("q-text").textContent = p.pregunta;
  $("feedback").classList.add("hidden");

  const cont = $("answers");
  cont.innerHTML = "";
  p.opciones.forEach((texto, i) => {
    const btn = document.createElement("button");
    btn.className = "answer";
    btn.innerHTML = `<span class="letter">${LETRAS[i].toUpperCase()}</span><span></span>`;
    btn.lastChild.textContent = texto;
    btn.addEventListener("click", () => responder(i));
    cont.appendChild(btn);
  });
}

function responder(elegida) {
  const p = PREGUNTAS[estado.indice];
  const correcta = elegida === p.correcta;
  if (correcta) estado.aciertos++;

  estado.respuestas.push({
    pregunta: p.pregunta,
    elegida: LETRAS[elegida],
    textoElegida: p.opciones[elegida],
    correcta: LETRAS[p.correcta],
    textoCorrecta: p.opciones[p.correcta],
    acierto: correcta,
  });

  document.querySelectorAll(".answer").forEach((btn, i) => {
    btn.disabled = true;
    if (i === p.correcta) btn.classList.add("correct");
    else if (i === elegida) btn.classList.add("wrong");
    else btn.classList.add("dim");
  });

  $("feedback-text").textContent = correcta ? "✓ Correcto" : "✗ Incorrecto";
  $("q-score").textContent = `${estado.aciertos} correctas`;
  $("progress-bar").style.width = `${((estado.indice + 1) / PREGUNTAS.length) * 100}%`;
  $("next-btn").textContent = estado.indice === PREGUNTAS.length - 1 ? "Ver resultado" : "Siguiente";
  $("feedback").classList.remove("hidden");
  $("next-btn").focus({ preventScroll: true });
}

function siguiente() {
  estado.indice++;
  if (estado.indice < PREGUNTAS.length) mostrarPregunta();
  else terminar();
}

function terminar() {
  const duracion = Math.round((Date.now() - estado.inicio) / 1000);
  estado.resultado = {
    id: Date.now(),
    nombre: estado.nombre,
    fecha: new Date().toISOString(),
    aciertos: estado.aciertos,
    total: PREGUNTAS.length,
    duracion,
    respuestas: estado.respuestas,
  };
  $("end-name").textContent = estado.nombre;
  $("end-correct").textContent = `${estado.aciertos}/${PREGUNTAS.length}`;
  $("end-pct").textContent = `${Math.round((estado.aciertos / PREGUNTAS.length) * 100)}%`;
  $("end-time").textContent = formatoDuracion(duracion);
  $("save-status").textContent = "";
  $("send-btn").disabled = false;
  $("send-btn").textContent = "Enviar respuestas";
  $("send-btn").classList.remove("hidden");
  $("sent-ok").classList.add("hidden");
  mostrar("screen-end");
}

async function enviar() {
  const btn = $("send-btn");
  btn.disabled = true;
  btn.textContent = "Enviando…";
  $("save-status").textContent = "";

  const modo = await guardarResultado(estado.resultado);
  if (modo === "error") {
    btn.disabled = false;
    btn.textContent = "Enviar respuestas";
    $("save-status").textContent = "No se pudieron enviar. Revisa tu conexión e inténtalo de nuevo.";
    return;
  }
  btn.classList.add("hidden");
  $("sent-ok").classList.remove("hidden");
}

function reintentar() {
  iniciar(estado.nombre);
}

// ---------- Utilidades ----------
function formatoDuracion(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

// ---------- Eventos ----------
$("start-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const nombre = $("player-name").value.trim();
  if (nombre) iniciar(nombre);
});
$("next-btn").addEventListener("click", siguiente);
$("send-btn").addEventListener("click", enviar);
$("retry-btn").addEventListener("click", reintentar);

reenviarPendientes();
