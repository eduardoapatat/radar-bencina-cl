<astro-guide>

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

</astro-guide>

<project-guide>

# Radar Bencina (`radar-bencina-cl`)

## 1. La idea

Sitio web que muestra **dónde conviene cargar bencina en Chile**. Usa los precios oficiales que publica la Comisión Nacional de Energía (CNE), los mismos de la app Bencina en Línea.

- **Para quién:** cualquier persona que quiera saber qué región, comuna o estación es más barata.
- **Qué se ve:**
  - un mapa de Chile coloreado por precio;
  - al entrar a una región, su mapa de comunas;
  - al entrar a una comuna, sus estaciones ordenadas de la más barata a la más cara, con botones para llegar por Waze o Google Maps.
- **Combustibles:** 93, 95, 97 y diésel, con un selector que recolorea todo.
- **Por qué existe:** es un proyecto personal de portafolio para **demostrar Astro**, con foco en diseño, animaciones y manejo de datos. Se prioriza que se vea bien y esté bien hecho, más que agregar funciones.

Repositorio: https://github.com/eduardoapatat/radar-bencina-cl (rama `main`, público).

## 2. Estado actual (2026-09-28)

**Funciona:**

- Datos reales de la CNE para todo Chile: unas 1.760 estaciones.
- 362 páginas estáticas:
  - `/`: portada nacional;
  - `/[region]/`: 16 regiones (la RM es `/metropolitana/`);
  - `/[region]/[comuna]/`: 345 comunas.
- Portada:
  - título y filtros Región → Provincia → Comuna arriba, centrados;
  - debajo, el mapa de Chile a lo largo a la izquierda y "Precio promedio por región" a la derecha, con el filtro de combustible encima.
- Región: mapa de comunas, tótem de precios con el más barato por combustible y ranking de comunas.
- Comuna: silueta con sus estaciones como puntos, resumen de precios y lista de estaciones con "cómo llegar".
- Tooltip en los mapas; en celular, el primer toque muestra el tooltip y un enlace.
- Zoom animado del mapa a la comuna con view transitions.
- El combustible elegido se recuerda entre páginas.

**Pendiente (en este orden):**

1. **Interfaz de datos:**
   - etiqueta "autoservicio" en los precios que lo sean;
   - precios de más de 30 días en gris con su fecha (hoy solo se cuentan como "sin precio reciente");
   - fecha de los datos visible en la portada.
2. **Decidir con el usuario** si las páginas de región y comuna pasan de **mediana** a **promedio**, como la portada.
3. **Hosting y actualización diaria:**
   - GitHub Action que ejecuta `pnpm data:fetch`, guarda el historial de cambios de precio y redespliega;
   - credenciales de la CNE como secrets;
   - elegir hosting: GitHub Pages, Cloudflare Pages o Netlify.
4. **Calles de OpenStreetMap** dentro de la comuna, dibujadas con animación y cargadas bajo demanda.
5. **Pulido:** gráficos de historial, detección de precios dudosos, SEO e imágenes OG, y accesibilidad del mapa.

**Fuera de alcance por ahora:** geolocalización ("cerca de mí"), cuentas de usuario y alertas.

## 3. Cómo ejecutarlo

Requisitos:

- **Node** `^22.22.3 || ^24.16.0 || >=26.3.0`. Se usa Node 24 porque los scripts importan `.ts` directamente.
- **pnpm 12**. Es obligatorio: `devEngines` hace que npm falle a propósito.

```sh
pnpm install
pnpm dev            # o: astro dev --background
pnpm build          # corre astro check y luego astro build
pnpm check && pnpm lint && pnpm format:check   # los tres deben pasar antes de cada commit
```

Datos:

```sh
pnpm data:fetch       # descarga precios reales de la CNE (necesita .env)
pnpm data:mock        # alternativa sin credenciales: datos falsos de la RM, con aviso en el sitio
pnpm data:boundaries  # regenera los límites desde la BCN (solo si cambian)
pnpm data:explore     # imprime la forma real de la respuesta de la API CNE
```

**`.env`** en la raíz. No se sube a git, y un agente **no debe leerlo ni editarlo**; lo crea el usuario:

```env
CNE_EMAIL=correo-registrado-en-api.cne.cl
CNE_PASSWORD=clave
```

La cuenta se crea gratis en https://api.cne.cl. Los scripts cargan el archivo con `node --env-file=.env` y nunca imprimen credenciales ni el token.

## 4. Arquitectura

- **Sitio 100% estático:** `output: "static"`, sin adapter, sin base de datos ni servidor.
- **Flujo de datos:**
  1. `scripts/fetch-prices.mjs` descarga los precios, los valida y escribe `src/data/prices.json` y `src/data/prices.meta.json`.
  2. Ambos archivos se commitean en el repo.
  3. Astro los lee al construir el sitio, mediante la content collection `stations`.
  4. En el futuro, un GitHub Action repetirá esto cada día.
- **Mapas:** SVG propio con `d3-geo` y `topojson-client`, **generado en el build**, en el frontmatter. El HTML llega con el mapa dibujado y sin JavaScript. No se usa MapLibre, React ni Vue.
- **JavaScript del cliente:** mínimo, en `src/scripts/`, sin d3 y sin Zod:
  - `fuel-selector.ts`: el combustible activo, en todas las páginas;
  - `region-map.ts`: tooltip, resaltado y zoom de los mapas;
  - `location-picker.ts`: los selects en cascada de la portada.

### Carpetas clave

| Ruta | Qué es |
|---|---|
| `src/lib/schema.ts` | Contrato de datos con Zod (desde `astro/zod`): `Station`, `FuelPrice`, `PricesMeta`. Lo usan el sitio y los scripts. |
| `src/lib/fuels.ts` | Constantes de combustible sin Zod, para el cliente. |
| `src/lib/prices.ts` | Mediana, promedio, precios recientes, las 5 clases de color, etiquetas y formato CLP. |
| `src/lib/geo.ts` | Carga de límites, simplificación según escala, proyección de región, de comuna y de Chile completo. |
| `src/lib/region.ts` | Datos por región con caché (`getRegionData(code)`); las comunas se comparan con la mediana regional. |
| `src/lib/national.ts` | Datos nacionales para la portada: cada región contra el **promedio** nacional. |
| `src/lib/regions.ts` | Las 16 regiones con código, slug, nombre y frase ("la Región del Biobío"). |
| `src/lib/slug.ts` | `slugify` ("Ñuñoa" → `nunoa`), `regionHref` y `comunaHref`. |
| `src/components/` | `ChileMap`, `RegionMap`, `RegionRanking`, `ComunaRanking`, `PriceBoard` (tótem), `FuelTabs`, `LocationPicker` y `MapLegend`. |
| `src/pages/` | `index.astro`, `[region]/index.astro` y `[region]/[comuna].astro`. |
| `src/data/` | `chile.topo.json` (límites, unos 1,7 MB, solo para el build), `prices.json` y `prices.meta.json`. |
| `scripts/` | Scripts de datos en `.mjs` (ver sección 3). |
| `data/raw/` | Descargas de trabajo (shapefile de la BCN, muestra de la CNE). Está en `.gitignore`. |

## 5. Decisiones importantes (y por qué)

### Datos

- **Precio por combustible:** `{ price, selfService, updatedAt }`. La CNE separa asistido (`93`, `95`, `97`, `DI`) y autoservicio (`A93`, `A95`, `A97`, `ADI`). Se usa **el menor de los precios recientes**, de modo que un autoservicio viejo nunca le gana a un asistido actual.
- **Precios de más de 30 días**, contados desde la descarga y no desde el build, así el resultado es reproducible: se guardan, pero no entran en medianas, promedios, colores ni "más barata".
- **Precios fuera de $300–$5.000:** se descarta solo ese precio, no la estación. Las coordenadas con coma decimal se corrigen.
- **Si la API falla o no queda ninguna estación válida,** el script termina con error **sin sobrescribir** los datos anteriores.
- **Las estadísticas no se guardan:** se calculan en el build a partir de las estaciones.
- **Comparaciones:**
  - en la portada, cada región contra el **promedio nacional**;
  - en una región, cada comuna contra la **mediana regional**;
  - el cambio de la región y la comuna a promedio está pendiente de decisión (sección 2).

### Límites geográficos

- **Fuente:** shapefile de comunas de la Biblioteca del Congreso Nacional, que exige citar la fuente. Se convierte a TopoJSON con mapshaper.
- **Códigos:** CUT a 5 dígitos con cero a la izquierda (`01101`) y región a 2 dígitos (`01`), igual que la CNE. Todas las estaciones calzan con una comuna.
- **Comunas:** son 345, porque la BCN no incluye Antártica (12202), que no tiene estaciones.
- **Islas:** se eliminan las menores a 5 km² (eso quita las Desventuradas). Rapa Nui y Juan Fernández (`INSULAR_COMUNAS`) no se dibujan en el mapa de Valparaíso, pero tienen recuadros propios en el mapa de Chile.
- **Detalle según escala:** `topojson-simplify` sobre toda la topología, con un umbral según los grados por píxel de cada mapa. Sin esto, Aysén y Magallanes pesaban más de 1 MB por página.

### Visual (tema: bencinera chilena)

- **Estilo:** oscuro, pensado primero para celular.
- **Colores:** tokens en `src/styles/global.css`: asfalto (fondo), vereda, pintura vial (texto), **LED ámbar** para precios y **verde de señal vial** para lo seleccionado.
- **Tipografía:** Barlow Condensed para títulos y cifras, y Barlow para texto, con la Fonts API de Astro.
- **Tótem de precios** (`PriceBoard.astro`): dígitos LED con "8.888" apagado detrás. Solo va en las páginas de región, **no en la portada**.
- **Color de los mapas:** escala **divergente** de 5 clases según la diferencia con la referencia (±$10 y ±$30): azul más barato, gris cerca de la referencia y ámbar más caro. Validada para daltonismo y contraste.
- **Maquetación de la portada,** tal como la pidió el usuario:
  1. título y filtros de ubicación arriba, independientes y centrados;
  2. debajo, **centrados como pareja**, el mapa de Chile entero en una columna a la izquierda y solo el ranking "Precio promedio por región" a la derecha, angosto, con el filtro de combustible encima;
  3. el mapa de Chile no destaca ninguna región de entrada.
- **En celular** no debe haber scroll horizontal: la columna derecha lleva `min-w-0` y las pestañas hacen salto de línea.

### Técnicas (fáciles de romper sin querer)

- **Por combustible:** un contenedor raíz lleva `data-fuel`. Lo que depende del combustible se renderiza para los 4 con `data-for-fuel` (acepta lista: `"93 95"`), y `global.css` muestra solo el activo. Cada elemento del mapa trae `data-class-<fuel>`, y el script copia la clase del combustible elegido a `data-class`.
- **SVG no tiene z-index:** el borde de resaltado se dibuja en un `<path>` aparte, al final del SVG. Si se pintara sobre la comuna misma, las vecinas taparían la mitad.
- **El foco de los enlaces SVG** dibuja un rectángulo; se reemplaza por el resaltado con la forma de la comuna.
- **Zoom con view transition:** un `<path>` SVG no sirve como elemento compartido. Antes de navegar se crea un `<div>` HTML con la silueta encima de la comuna y `view-transition-name: comuna-shape`, que coincide con la silueta de la página de la comuna.
- **Selects:** se llenan desde un JSON incrustado, porque Safari ignora `hidden` en `<option>`.
- **Scripts y view transitions:** con `ClientRouter`, los scripts corren una sola vez; la inicialización va en `astro:page-load`. Los listeners de `document` se limpian con `AbortController` en `astro:before-swap`.
- **Servidor de desarrollo:** si se importa un JSON que se genera después, hay que reiniciarlo, porque deja el error en caché.

## 6. API de la CNE

- **Login:** `POST https://api.cne.cl/api/login` con `{ "email", "password" }` → `{ "token" }`. El token dura unas 1 h.
- **Estaciones:** `GET https://api.cne.cl/api/v4/estaciones` con `Authorization: Bearer <token>`. Una sola llamada trae todo Chile (unas 1.830 estaciones).
- **Campos útiles:**
  - `codigo`;
  - `distribuidor.marca`: las mayúsculas se normalizan;
  - `ubicacion.codigo_comuna`: es el CUT;
  - `ubicacion.latitud` y `ubicacion.longitud`: vienen como texto;
  - `precios.<código>.precio`: texto como `"1443.000"`;
  - `fecha_actualizacion` y `hora_actualizacion`: hora de Chile sin zona horaria;
  - `en_mantenimiento`.
- **Fuera de alcance:** `KE`, `AKE`, `GLP` y `GNC`.
- **Exactitud:** la CNE aclara que la exactitud de cada precio es responsabilidad de la estación que lo informa. La API ya cambió de versión (v3 → v4).

## 7. Forma de trabajo y preferencias del usuario

- **Idioma:** responder siempre en **español** y explicar simple. Definir cada término técnico la primera vez y no mezclar herramientas que no se eligieron. Por ejemplo, si se usa Drizzle, no hablar de Prisma.
- **Ritmo:** avanzar **muy de a poco**, un paso chico a la vez: se implementa, se verifica (check, lint, format y build) y se muestra. Antes de cambios grandes, **proponer un plan breve y esperar confirmación**.
- **Maquetación:** seguir la descripción del usuario **al pie de la letra**. Si hay dudas, preguntar con un esquema ASCII antes de construir. Ya se descartaron varias propuestas propias.
- **Commits:**
  - solo cuando el usuario los aprueba;
  - formato Conventional Commits, **en inglés** (como el historial), una línea corta en imperativo y un cuerpo opcional que explica el porqué;
  - **sin `Co-Authored-By` ni menciones a Claude**;
  - nunca push, `--amend` ni `--no-verify` salvo pedido explícito.
- **`.env`:** no leerlo ni modificarlo. Indicar la variable y el valor, y el usuario la edita.
- **Paquetes:** usar pnpm. Respetar la regla de antigüedad mínima de versiones: no agregar excepciones, sino usar una versión anterior. No subir versiones mayores sin preguntar. TypeScript está fijado en `~6.0` porque `typescript-eslint` aún no soporta la 7.
- **Editor:** no crear `.vscode/settings.json` ni recomendaciones de extensiones; el usuario los tiene en su perfil.
- **Entorno del usuario:** Windows, con comandos por Git Bash; PowerShell solo para cosas propias de Windows.

</project-guide>
