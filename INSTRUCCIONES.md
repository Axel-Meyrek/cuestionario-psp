# Guardar los resultados en Google Sheets

Configuración única, unos 5 minutos.

## 1. Crear la hoja y el script

1. Entra a <https://sheets.new> y ponle un nombre a la hoja (ej. "Resultados PSP").
2. Menú **Extensiones → Apps Script**.
3. Borra el código que aparece y pega todo el contenido de `apps-script/Code.gs`.
4. Guarda (ícono de disco o `Cmd + S`).

## 2. Publicarlo como aplicación web

1. Botón **Implementar → Nueva implementación**.
2. En el engrane de "Seleccionar tipo", elige **Aplicación web**.
3. Configura:
   - **Ejecutar como:** Yo
   - **Quién tiene acceso:** Cualquier usuario
4. Pulsa **Implementar** y autoriza los permisos con tu cuenta de Google
   (si aparece "Google no verificó esta app": *Configuración avanzada → Ir a … (no seguro)*;
   es tu propio script).
5. Copia la **URL de la aplicación web** (termina en `/exec`).

## 3. Conectar la página

Abre `config.js` y pega la URL:

```js
const SCRIPT_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";
```

## 4. Subir la página a internet

Sube estos archivos: `index.html`, `styles.css`, `config.js`, `preguntas.js`, `app.js`.
La opción más rápida: <https://app.netlify.com/drop> → arrastra la carpeta completa
y te da un enlace para compartir. También sirve GitHub Pages.

## Uso

- Cada persona que termina la prueba agrega una fila a la pestaña **Resultados** de tu hoja
  (nombre, fecha, aciertos, tiempo y la respuesta de cada pregunta).
- Los resultados se consultan directamente en la hoja de Google; la página no los muestra.
- Para borrar resultados, elimina las filas directamente en la hoja (no borres la fila de encabezados).
- Si cambias el código del script, usa **Implementar → Gestionar implementaciones → Editar →
  Versión: nueva** para que la URL siga siendo la misma.
