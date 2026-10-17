# Audio de frases

Sube una lista de frases en PDF (3 columnas: número, idioma 1, idioma 2) y, opcionalmente, su audio.
Genera un MP3 nuevo con las frases seleccionadas y las repeticiones que indiques por idioma.

- **Con audio:** todo se procesa en el navegador.
- **Sin audio:** la voz sale del texto del PDF con voces neuronales de Microsoft (gratis, vía `/api/tts`) o con ElevenLabs (con tu clave).

## Estructura

```
api/tts.js                 función de Vercel: texto -> MP3 con voces de Microsoft
package.json               dependencia de la función (msedge-tts)
vercel.json                despliegue: publica /public, límites de la función, cabeceras
public/                    lo que se sirve al navegador
  index.html               estructura de la página
  favicon.svg / .png       icono
  css/styles.css           estilos
  js/core/audio-engine.js  dominio: segmentación, voces, emparejado, MP3/ZIP (sin DOM)
  js/app/                  interfaz y flujo (orden de carga en index.html)
    config.js              ELEVEN = true/false
    version.js             versión visible en la cabecera (la actualiza npm run release)
    state.js               estado compartido y utilidades
    prefs.js               preferencias locales
    i18n.js                interfaz en español / inglés (diccionario + t('clave'))
    theme.js               tema claro / oscuro
    dropzones.js           carga de archivos
    pdf-parser.js          lectura del PDF
    audio-loader.js        decodificación del audio
    phrase-table.js        tabla de frases
    generator.js           generación del audio
    voice-browser.js       paneles de voz y voz del navegador
    voice-microsoft.js     cliente de la voz Microsoft (/api/tts)
    voice-elevenlabs.js    ElevenLabs y ensamblado del audio sintetizado
    player.js              reproductor del resultado
    save.js                guardado
    bootstrap.js           arranque
```

## Desarrollo local

```
npm install
vercel dev
```

`vercel dev` sirve la página y la función `/api/tts` juntas. Sin Vercel, `npx serve public` sirve solo la página;
en ese caso la voz Microsoft usa el programa de `voz-local` si está abierto.

## Desplegar

```
vercel --prod
```

## Notas

- `/api/tts` solo acepta llamadas desde el propio sitio. Para permitir otros orígenes, define la variable
  `TTS_ALLOWED_ORIGINS` (lista separada por comas) en el proyecto de Vercel.
- La voz Microsoft usa un servicio no oficial: puede dejar de funcionar si Microsoft cambia su protocolo.
- La clave de ElevenLabs se guarda solo en el navegador de quien la escribe.

## Idioma y tema

- Idioma de la interfaz (ES/EN): botones de la cabecera; se recuerda la elección y, la primera vez, se usa el idioma del navegador.
  Para añadir o corregir un texto: `public/js/app/i18n.js` (mismas claves en `es` y `en`); en el HTML, atributo `data-i18n="clave"`.
- Tema claro/oscuro: botón de la cabecera; sin elección guardada se sigue el del sistema.

## Publicar con versión

```
npm run release -- 1.3.0 "Motivo del cambio"
```
Actualiza `version.js` y `package.json` y ejecuta `vercel --prod` con `--meta version=… --meta description=…`.
