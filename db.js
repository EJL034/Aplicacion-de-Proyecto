// db.js
// -----------------------------------------------------------------------------
// Capa de "base de datos" para Pollerya Manager.
//
// Por qué un archivo JSON y no MySQL/Postgres/SQL Server:
//  - Es cero-configuración: no requiere instalar ni levantar un motor aparte,
//    lo que hace que el proyecto piloto (Sprint 21-22) se pueda instalar en
//    un solo comando en la computadora del restaurante.
//  - Cada "colección" vive en su propio archivo /data/<coleccion>.json y se
//    accede siempre a través de las funciones de este módulo, así que
//    cambiar el motor de almacenamiento en el futuro (por ejemplo a SQLite o
//    a un servidor MySQL real) solo implica reescribir este archivo: ninguna
//    ruta ni ningún script del frontend tiene que cambiar.
//
// Cada colección se maneja como un arreglo de objetos con un campo "id".
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function rutaColeccion(nombre) {
    return path.join(DATA_DIR, `${nombre}.json`);
}

// Crea el archivo de la colección con datos semilla si todavía no existe.
function asegurarColeccion(nombre, semilla) {
    const ruta = rutaColeccion(nombre);
    if (!fs.existsSync(ruta)) {
        fs.writeFileSync(ruta, JSON.stringify(semilla, null, 2), 'utf-8');
    }
}

function leerColeccion(nombre) {
    const ruta = rutaColeccion(nombre);
    if (!fs.existsSync(ruta)) return [];
    const contenido = fs.readFileSync(ruta, 'utf-8').trim();
    if (!contenido) return [];
    return JSON.parse(contenido);
}

function escribirColeccion(nombre, datos) {
    fs.writeFileSync(rutaColeccion(nombre), JSON.stringify(datos, null, 2), 'utf-8');
}

function generarId(prefijo) {
    return `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Genera un id numérico autoincremental para una colección (lo usa Personal,
// porque el frontend ya existente lo escribe directo en un onclick="...(${id})"
// y necesita ser un número, no un string con guiones).
function generarIdNumerico(nombreColeccion, campoId) {
    const registros = leerColeccion(nombreColeccion);
    const maximo = registros.reduce((max, r) => Math.max(max, Number(r[campoId]) || 0), 0);
    return maximo + 1;
}

function hashPin(pin) {
    return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

// ------------------------- SEMILLA INICIAL (datos de ejemplo) --------------

asegurarColeccion('tickets_cocina', [
    { id: '105', items: ['2x Pollo Grande (Frito)', '1x Porción Patacones'], tiempo: 2, estado: 'espera' },
    { id: '106', items: ['3x Combo Personal Pieza / Papa'], tiempo: 1, estado: 'espera' },
    { id: '103', items: ['1x Pollo Familiar (8 pzs)', '1x Papas Supremas Grandes'], tiempo: 9, estado: 'proceso' },
    { id: '104', items: ['2x Pollo Grande Crispy'], tiempo: 8, estado: 'proceso' },
    { id: '101', items: ['1x Combo Alitas Bufalo (12 uds)', '1x Bebida Gigante'], tiempo: 15, estado: 'listo' }
]);

asegurarColeccion('historial_cocina', []);

asegurarColeccion('cierres_caja', []);

asegurarColeccion('inventario', [
    { id: 'inv-01', nombre: 'Pollo Entero Limpio', categoria: 'Carnes y Proteínas', actual: 15, minimo: 30, unidad: 'unds', estado: 'critico', consumidoHoy: 0 },
    { id: 'inv-02', nombre: 'Aceite de Freír Premium', categoria: 'Abarrotes / Líquidos', actual: 40, minimo: 50, unidad: 'Litros', estado: 'moderado', consumidoHoy: 0 },
    { id: 'inv-03', nombre: 'Papas Prefritas Corte Fino', categoria: 'Congelados', actual: 120, minimo: 80, unidad: 'Kg', estado: 'optimo', consumidoHoy: 0 },
    { id: 'inv-04', nombre: 'Harina Aliñada Receta Secreta', categoria: 'Secos / Especias', actual: 60, minimo: 40, unidad: 'Kg', estado: 'optimo', consumidoHoy: 0 }
]);

asegurarColeccion('equipos', [
    { id: 'eq-01', nombre: 'Freidora Automática P1', tipo: 'Cocción Básica', ultimaRevision: '2026-05-10', detalles: 'Filtro de aceite saturado', estado: 'moderado' },
    { id: 'eq-02', nombre: 'Mantenedor de Calor Industrial', tipo: 'Exhibición / Servicio', ultimaRevision: '2026-06-01', detalles: 'Temperatura estable a 68°C', estado: 'optimo' },
    { id: 'eq-03', nombre: 'Cámara Frigorífica Principal', tipo: 'Conservación', ultimaRevision: '2026-04-15', detalles: 'Falla severa en compresor de gas', estado: 'critico' },
    { id: 'eq-04', nombre: 'Freidora de Alta Presión P2', tipo: 'Cocción Rápida', ultimaRevision: '2026-05-28', detalles: 'Empaques nuevos en tapa', estado: 'optimo' }
]);

asegurarColeccion('menu', [
    { id: 'prod-01', nombre: 'Combo Familiar (8 Piezas)', categoria: 'Combos', precio: 12500, icono: '🍗', estado: 'activo' },
    { id: 'prod-02', nombre: 'Combo Personal + Papas', categoria: 'Combos', precio: 3800, icono: '🍟', estado: 'activo' },
    { id: 'prod-03', nombre: 'Pieza de Pechuga Suelta', categoria: 'Piezas sueltas', precio: 1200, icono: '🍗', estado: 'activo' },
    { id: 'prod-04', nombre: 'Porción Extra de Patacones', categoria: 'Acompañamientos', precio: 1500, icono: '🍌', estado: 'suspendido' },
    { id: 'prod-05', nombre: 'Refresco Grande 32oz', categoria: 'Bebidas', precio: 1100, icono: '🥤', estado: 'activo' }
]);

// Un solo empleado = una sola fuente de verdad para Personal y Asistencia.
// id_personal es numérico porque personal.html ya lo inserta directo en un
// onclick="eliminarEmpleado(${id})" (sin comillas), así que debe ser un número.
asegurarColeccion('empleados', [
    { id_personal: 1, nombre: 'Emanuel López', puesto: 'Administrador General', turno: 'Tarde', salarioBruto: 650000, faltas: 0, estado: 'Presente' },
    { id_personal: 2, nombre: 'Valeria Chaves', puesto: 'Jefa de Cocina', turno: 'Tarde', salarioBruto: 480000, faltas: 1, estado: 'Presente' },
    { id_personal: 3, nombre: 'Anthony Grant', puesto: 'Encargado de Caja', turno: 'Tarde', salarioBruto: 420000, faltas: 2, estado: 'Falta' },
    { id_personal: 4, nombre: 'María Rojas', puesto: 'Cajera', turno: 'Tarde', salarioBruto: 380000, faltas: 0, estado: 'Presente' },
    { id_personal: 5, nombre: 'Andrés Chaves', puesto: 'Cocinero Principal', turno: 'Tarde', salarioBruto: 430000, faltas: 0, estado: 'Presente' },
    { id_personal: 6, nombre: 'Carlos Solano', puesto: 'Ayudante de Cocina', turno: 'Tarde', salarioBruto: 360000, faltas: 0, estado: 'Presente' }
]);

// Registros de marcado (entrada/salida) y de faltas, por fecha
asegurarColeccion('asistencia', []);

asegurarColeccion('ventas', [
    { id: 'v-1', monto: 12500, canal: 'mostrador', fecha: new Date().toISOString() },
    { id: 'v-2', monto: 3800, canal: 'express', fecha: new Date().toISOString() },
    { id: 'v-3', monto: 7600, canal: 'auto', fecha: new Date().toISOString() }
]);

asegurarColeccion('configuracion', [{
    id: 'config-general',
    nombreLocal: 'Pollerya Central Costa Rica',
    cedulaJuridica: '3-101-758492',
    ivaPorcentaje: 13,
    limiteEsperaCocina: 10,
    toleranciaRetrasoPersonal: 15,
    pinGerencialHash: hashPin('2580'),
    impresoraActiva: 'boca-cocina'
}]);

module.exports = {
    leerColeccion,
    escribirColeccion,
    generarId,
    generarIdNumerico,
    hashPin
};
