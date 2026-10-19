// Backend del Cuestionario PSP. Pega este código en Extensiones → Apps Script
// de tu hoja de Google y publícalo como aplicación web (ver INSTRUCCIONES.md).

const NOMBRE_HOJA = "Resultados";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const r = JSON.parse(e.postData.contents);
    if (!r || !r.id || !r.nombre || !Array.isArray(r.respuestas)) {
      return json_({ ok: false, error: "datos inválidos" });
    }
    const hoja = hoja_(r.respuestas.length);

    // Evita duplicados si la página reintenta un envío que ya llegó.
    const ids = hoja.getRange(1, 1, hoja.getLastRow(), 1).getValues().flat().map(String);
    if (ids.includes(String(r.id))) return json_({ ok: true, duplicado: true });

    hoja.appendRow([
      String(r.id),
      new Date(r.fecha),
      texto_(r.nombre),
      Number(r.aciertos),
      Number(r.total),
      Number(r.duracion),
      ...r.respuestas.map((x) => `${x.elegida || "-"} ${x.acierto ? "✓" : "✗"}`),
      JSON.stringify(r),
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function hoja_(numPreguntas) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(NOMBRE_HOJA) || ss.insertSheet(NOMBRE_HOJA);
  if (hoja.getLastRow() === 0) {
    const preguntas = Array.from({ length: numPreguntas }, (_, i) => `P${i + 1}`);
    hoja.appendRow(["ID", "Fecha", "Nombre", "Aciertos", "Total", "Duración (s)", ...preguntas, "Detalle"]);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

// Evita que un nombre como "=FORMULA()" se interprete como fórmula.
function texto_(v) {
  const s = String(v).slice(0, 60);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
