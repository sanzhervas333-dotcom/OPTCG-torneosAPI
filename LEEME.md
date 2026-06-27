# OP Torneos — Tu app de torneos de One Piece TCG

## 1. Qué te llevas en este paquete

- `index.html`, `app.js`, `leaders.js`, `manifest.json`, `sw.js`, `icons/` →
  esto es tu app web completa (funciona ya mismo si abres `index.html`
  en el navegador de tu ordenador o móvil).
- Esta guía, para convertirla en un `.apk` instalable en Android.

La app ya tiene:
- Estadísticas globales (eventos, partidas, winrate total, winrate yendo
  1º/2º, winrate de dado, posición media) — igual que tu foto 1.
- Selector de líder con base de datos inicial + botón para sincronizar
  online TODOS los líderes oficiales con imagen (ver paso 0).
- Creación de torneos: eliges tu líder, añades rondas, y en cada ronda
  marcas dado ganado/perdido, orden (1º/2º), resultado, rival y notas —
  igual que tu foto 2.
- Apartado para añadir líderes a mano si falta alguno.
- Copia de seguridad (exportar/importar) y todo se guarda en el propio
  móvil (no hace falta internet para usarla, solo para sincronizar
  líderes).

---

## Paso 0 (opcional pero recomendado): clave gratuita para la base de líderes

Para tener TODOS los líderes oficiales con su imagen:
1. Ve a **apitcg.com/platform** y crea una cuenta gratuita.
2. Copia tu "API key".
3. Dentro de la app, ve a **Ajustes → API Key** y pégala.
4. Ve a **Líderes → Actualizar online**. Se descargará la lista completa.

Si no quieres hacer esto, la app funciona igual con una lista inicial de
líderes conocidos, y puedes añadir cualquier otro a mano con el botón
"Añadir manual".

---

## Paso 1: prueba la app antes de convertirla

1. Descomprime la carpeta `optcg-app`.
2. Haz doble clic en `index.html` (se abre en tu navegador).
3. Pruébala: crea un torneo de prueba, añade rondas, mira el resumen.

Si todo se ve bien, pasamos a convertirla en `.apk`.

---

## Paso 2: sube la app a internet (necesario para los dos métodos siguientes)

Necesitas que la carpeta esté accesible por una URL (no vale "abrir el
archivo" desde el disco para generar el APK). La forma más fácil y
gratuita es **GitHub Pages**:

1. Crea una cuenta gratis en **github.com** si no tienes.
2. Crea un repositorio nuevo, por ejemplo `op-torneos`.
3. Sube todos los archivos de la carpeta `optcg-app` (botón "Add file" →
   "Upload files", arrastra todo el contenido — index.html, app.js,
   leaders.js, manifest.json, sw.js y la carpeta icons).
4. Ve a **Settings → Pages**, en "Source" elige la rama `main` y carpeta
   `/ (root)`, y guarda.
5. En unos minutos tendrás una URL tipo:
   `https://tu-usuario.github.io/op-torneos/`
6. Ábrela en el navegador y comprueba que funciona igual que en local.

(Alternativa sin GitHub: **Netlify Drop** — netlify.com/drop — arrastras
la carpeta y te da una URL al instante, sin necesidad de cuenta.)

---

## Paso 3: convertir esa web en un APK real

### Opción A — PWABuilder (la más fácil, sin instalar nada)

1. Ve a **pwabuilder.com** desde tu ordenador.
2. Pega la URL de tu app (la de GitHub Pages o Netlify) y pulsa "Start".
3. PWABuilder analizará tu app (gracias al `manifest.json` y `sw.js` que
   ya están incluidos, debería sacar buena puntuación).
4. Pulsa en **"Package for stores"** → elige **Android**.
5. Déjalo con las opciones por defecto (puedes poner tu propio nombre de
   paquete, ej. `com.tuusuario.optorneos`) y pulsa **Generate**.
6. Se descargará un `.zip`. Dentro encontrarás un archivo
   `app-release-signed.apk` (o similar) listo para instalar.

### Opción B — Capacitor (un poco más técnica, pero genera una app nativa "de verdad")

Necesitas tener instalado **Node.js** y **Android Studio** en tu
ordenador.

```bash
npm install -g @capacitor/cli
npx cap init "OP Torneos" "com.tuusuario.optorneos"
# copia tus archivos (index.html, app.js, etc.) dentro de una carpeta "www"
npx cap add android
npx cap copy android
npx cap open android
```

Esto abrirá Android Studio con tu proyecto. Desde ahí:
`Build → Build Bundle(s) / APK(s) → Build APK(s)`.
El APK aparecerá en `android/app/build/outputs/apk/`.

---

## Paso 4: instalar el APK en tu móvil

1. Pasa el archivo `.apk` a tu móvil Android (por cable, Google Drive,
   Telegram a ti mismo, etc.).
2. Ábrelo desde el móvil. Si Android te avisa de "origen desconocido",
   permite la instalación (solo la primera vez, es normal al no venir de
   Google Play).
3. ¡Listo! Ya tienes tu app de torneos en el cajón de aplicaciones.

---

## Ideas para ampliar más adelante

- Gráficas de evolución de winrate por mes.
- Historial de mazos/lista de cartas además del líder.
- Compartir el resumen del torneo como imagen (captura de pantalla del
  resumen funciona perfectamente mientras tanto).
- Subir tus datos a una nube (Firebase, Supabase) si algún día quieres
  tener copia automática o usar la app en varios móviles a la vez.

Cualquier cosa que quieras cambiar del diseño, los textos o añadir
nuevas estadísticas, dímelo y lo ajustamos.
