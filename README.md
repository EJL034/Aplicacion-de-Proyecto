# Pollerya Manager — Backend + Frontend integrado

## Cómo correrlo

```bash
npm install
npm start
```

Abrí `http://localhost:3000` en el navegador. El PIN gerencial por defecto es **2580**
(ya no vive en `localStorage`: se valida contra un hash guardado en el servidor).

No necesitás instalar MySQL, Postgres ni SQL Server: los datos se guardan en
archivos JSON dentro de `/data` (se crean solos la primera vez que arrancás el
servidor, con datos de ejemplo). Ver el comentario al inicio de `db.js` para
la razón de esta decisión y cómo migrar a un motor SQL real más adelante sin
tocar ninguna ruta ni ningún script del frontend.

## Qué se resolvió en esta vuelta

- **Servidor real** (`server.js`): Express + Socket.io sirviendo el frontend
  y exponiendo la API que antes no existía.
- **Base de datos** (`db.js` + `/data/*.json`): antes estaba vacío.
- **Todos los módulos ahora hablan con el servidor** en vez de datos fijos o
  `localStorage`: Cocina, Inventario, Equipos, Menú, Personal/Asistencia,
  Configuración, Reportes.
- **Tiempo real de verdad**: cambiar un ticket en Cocina, ajustar stock en
  Inventario, marcar asistencia, etc., ahora se transmite por Socket.io a
  todas las pantallas conectadas (antes solo había un `alert()` de ejemplo).
- **Integración entre módulos**: al despachar un ticket en Cocina, se
  descuenta pollo real del Inventario (antes cada módulo vivía aislado).
- **`reportes.js`**: no existía; los KPIs y gráficos de `reportes.html`
  estaban siempre en cero.
- **Módulo de Personal/Asistencia real**: marcar entrada/salida y faltas
  quedan guardados en el servidor, ya no son un calendario decorativo.
- **Cálculo de planilla y cargas sociales (CCSS)** (`planilla.js`): nuevo,
  con desglose de deducciones obreras y cargas patronales por colaborador
  y totales de planilla. Visible desde el botón "Planilla / CCSS" en
  Personal.
- **Seguridad del PIN**: se guarda como hash (SHA-256) en el servidor y se
  verifica ahí mismo; ya no se compara en el navegador contra un valor en
  texto plano en `localStorage`.
- **Limpieza de archivos muertos**: se unificó `main.js` (antes la misma
  función de resaltar el menú estaba copiada y pegada en 6 archivos
  distintos) y se eliminaron duplicados sin usar (`client.js`,
  `personal.js` viejo).

## Lo que sigue pendiente (del plan de sprints original)

- **Pruebas unitarias y de carga** (Sprint 7, ID 16-19): no incluidas en
  esta vuelta.
- **Piloto en sitio y capacitación** (Sprint 9-10, ID 21-25): depende de
  instalar esto en la computadora real del restaurante.
- **TLS/HTTPS** (ID 20): el cifrado en tránsito depende de dónde se
  despliegue (ej. un certificado con Let's Encrypt si corre en un dominio
  público); el PIN ya no viaja ni se guarda en texto plano, pero la
  conexión en sí no tiene TLS configurado todavía.
- **`asistencia.html`** quedó como página huérfana: nadie la enlaza desde
  el menú, porque su función ya la cubre la sección "Control de Asistencia"
  dentro de `personal.html`. Se puede borrar con confianza, o decime si la
  querés conservar y la conecto al backend también.
- **Top productos en Reportes** usa el precio del menú como aproximación
  de popularidad, porque todavía no existe un detalle de items por venta
  en el punto de venta. Cuando haya un POS real registrando qué productos
  se vendieron en cada ticket, hay que reemplazar esa parte en
  `routes/reportes.js`.

## Estructura

```
server.js              -> arranca Express + Socket.io
db.js                   -> capa de datos (JSON en /data)
planilla.js             -> cálculo de planilla y CCSS
routes/                 -> un archivo por módulo (cocina, inventario, equipos,
                            menu, personal, reportes, configuracion)
public/                 -> todo el frontend (html + js), servido como estático
data/                   -> se genera solo al arrancar por primera vez
```
