# Tablero de Producción · Kacrea

Seguimiento de los proyectos por venir. Se abre en el navegador (computadora o teléfono) **sin cuenta de Claude**: link + PIN. Todo lo que cualquiera edita se guarda en la misma base (Firebase) y los demás lo ven en segundos.

Mismo esquema que la app de acreditación del After Run.

---

## ⚠️ Antes de subir nada

**Los datos de los proyectos no van en el repositorio.** Viven en `tablero-produccion-datos.json` (carpeta `tablero-produccion`) y se importan **una sola vez** desde el propio tablero. El `.gitignore` excluye los `.json`: si subes arrastrando archivos a GitHub, **no arrastres ningún .json**.

## Paso 1 — Firebase

`config.js` ya viene apuntando al proyecto Firebase que usaste para el After Run (`after-run-x-polar-light`). Funciona tal cual: el tablero guarda en colecciones propias (`projects`, `config`) y no toca las del evento. No hay que hacer nada en Firebase.

*(Opcional, recomendado a mediano plazo: crear un proyecto Firebase propio `kacrea-produccion` siguiendo el Paso 1 del README del After Run, y pegar sus claves en `config.js`.)*

## Paso 2 — PIN

En `config.js`, campo `pin`. Es el que le pasas al equipo.

## Paso 3 — Subir a GitHub

1. **github.com/new** → nombre `kacrea-produccion` → **Public** → *Create repository*.
2. **uploading an existing file** → arrastra `index.html`, `config.js`, `backend.js`, `firestore.rules`, `README.md`, `.gitignore`.
3. *Commit changes*.
4. **Settings → Pages** → *Deploy from a branch* → `main` / `/ (root)` → **Save**.

En 1–2 minutos queda en `https://velasquez99.github.io/kacrea-produccion/`.

## Paso 4 — Cargar los proyectos (una sola vez)

Abre el link → PIN → aparece un aviso azul “La base está vacía” → **Importar datos** → selecciona `tablero-produccion-datos.json`. Listo: los 22 proyectos quedan en la base compartida.

## Prueba obligatoria

Abre el link en dos equipos, cambia un estatus en uno y verifica que cambia en el otro.

---

## Seguridad — lo que hay que saber

El PIN es una puerta, no una caja fuerte: evita que alguien que reciba el link por error vea el tablero, pero alguien con conocimientos técnicos y el link podría leer la base. Para montos y utilidades de clientes es un riesgo razonable a nivel interno; no publiques el link fuera del equipo y cambia el PIN si alguien sale de Kacrea (cambiar `pin` en `config.js` y volver a subir ese archivo).
