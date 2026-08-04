const express = require('express');
const db = require('../db');
const { calcularPlanillaIndividual, calcularPlanillaGeneral } = require('../planilla');

function hoyISO() {
    return new Date().toISOString().slice(0, 10);
}

module.exports = function (io) {
    const router = express.Router();

    // -------------------- EMPLEADOS (contrato usado por personal.html) --------------------

    // GET /api/personal -> lista completa de colaboradores
    router.get('/', (req, res) => {
        res.json(db.leerColeccion('empleados'));
    });

    // POST /api/personal { nombre, puesto, salarioBruto? } -> crea un colaborador nuevo
    router.post('/', (req, res) => {
        const { nombre, puesto, salarioBruto, turno } = req.body;
        if (!nombre || !puesto) {
            return res.status(400).json({ status: 'error', error: 'nombre y puesto son requeridos' });
        }

        const empleados = db.leerColeccion('empleados');
        const nuevo = {
            id_personal: db.generarIdNumerico('empleados', 'id_personal'),
            nombre, puesto,
            turno: turno || 'Tarde',
            salarioBruto: Number(salarioBruto) || 0,
            faltas: 0,
            estado: 'Presente'
        };
        empleados.push(nuevo);
        db.escribirColeccion('empleados', empleados);
        io.emit('cambio_personal', { tipo: 'nuevo', empleado: nuevo });
        res.json(nuevo);
    });

    // DELETE /api/personal { id_personal } -> elimina un colaborador
    router.delete('/', (req, res) => {
        const { id_personal } = req.body;
        if (id_personal === undefined) {
            return res.status(400).json({ status: 'error', error: 'id_personal es requerido' });
        }
        let empleados = db.leerColeccion('empleados');
        const existia = empleados.some(e => Number(e.id_personal) === Number(id_personal));
        empleados = empleados.filter(e => Number(e.id_personal) !== Number(id_personal));
        db.escribirColeccion('empleados', empleados);

        if (!existia) return res.status(404).json({ status: 'error', error: 'Colaborador no encontrado' });

        io.emit('cambio_personal', { tipo: 'eliminado', id_personal });
        res.json({ status: 'success' });
    });

    // -------------------- ASISTENCIA / MARCADO --------------------

    // POST /api/personal/marcar { id_personal, tipo: 'entrada'|'salida' }
    router.post('/marcar', (req, res) => {
        const { id_personal, tipo } = req.body;
        if (id_personal === undefined || !['entrada', 'salida'].includes(tipo)) {
            return res.status(400).json({ status: 'error', error: 'id_personal y tipo (entrada|salida) son requeridos' });
        }

        const empleados = db.leerColeccion('empleados');
        const empleado = empleados.find(e => Number(e.id_personal) === Number(id_personal));
        if (!empleado) return res.status(404).json({ status: 'error', error: 'Colaborador no encontrado' });

        empleado.estado = tipo === 'entrada' ? 'Presente' : 'Fuera de turno';
        db.escribirColeccion('empleados', empleados);

        const ahora = new Date();
        const registros = db.leerColeccion('asistencia');
        registros.push({
            id: db.generarId('asis'),
            id_personal,
            nombre: empleado.nombre,
            fecha: ahora.toISOString().slice(0, 10),
            hora: ahora.toTimeString().slice(0, 5),
            tipo
        });
        db.escribirColeccion('asistencia', registros);

        io.emit('cambio_personal', { tipo: 'marcado', empleado });
        res.json({ status: 'success', empleado });
    });

    // POST /api/personal/falta { id_personal, fecha? } -> registra una falta (la marca el gerente)
    router.post('/falta', (req, res) => {
        const { id_personal, fecha } = req.body;
        const empleados = db.leerColeccion('empleados');
        const empleado = empleados.find(e => Number(e.id_personal) === Number(id_personal));
        if (!empleado) return res.status(404).json({ status: 'error', error: 'Colaborador no encontrado' });

        empleado.faltas = (empleado.faltas || 0) + 1;
        empleado.estado = 'Falta';
        db.escribirColeccion('empleados', empleados);

        const registros = db.leerColeccion('asistencia');
        registros.push({
            id: db.generarId('asis'),
            id_personal,
            nombre: empleado.nombre,
            fecha: fecha || hoyISO(),
            hora: null,
            tipo: 'falta'
        });
        db.escribirColeccion('asistencia', registros);

        io.emit('cambio_personal', { tipo: 'falta', empleado });
        res.json({ status: 'success', empleado });
    });

    // GET /api/personal/asistencia?mes=2026-07 -> historial de marcado/faltas del mes
    router.get('/asistencia', (req, res) => {
        const { mes } = req.query;
        let registros = db.leerColeccion('asistencia');
        if (mes) registros = registros.filter(r => r.fecha.startsWith(mes));
        res.json(registros);
    });

    // -------------------- PLANILLA / CCSS --------------------

    // GET /api/personal/planilla -> desglose de planilla y cargas sociales de TODOS
    router.get('/planilla', (req, res) => {
        const empleados = db.leerColeccion('empleados').map(e => ({ id: e.id_personal, nombre: e.nombre, puesto: e.puesto, salarioBruto: e.salarioBruto }));
        res.json(calcularPlanillaGeneral(empleados));
    });

    // GET /api/personal/planilla/:id_personal -> desglose individual
    router.get('/planilla/:id_personal', (req, res) => {
        const empleados = db.leerColeccion('empleados');
        const empleado = empleados.find(e => Number(e.id_personal) === Number(req.params.id_personal));
        if (!empleado) return res.status(404).json({ status: 'error', error: 'Colaborador no encontrado' });
        res.json({ empleado: empleado.nombre, ...calcularPlanillaIndividual(empleado.salarioBruto) });
    });

    return router;
};
