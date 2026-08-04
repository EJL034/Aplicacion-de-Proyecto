const express = require('express');
const db = require('../db');

module.exports = function (io) {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.json(db.leerColeccion('equipos'));
    });

    router.post('/', (req, res) => {
        const { nombre, tipo, detalles } = req.body;
        if (!nombre) return res.status(400).json({ status: 'error', error: 'nombre es requerido' });

        const equipos = db.leerColeccion('equipos');
        const nuevo = {
            id: db.generarId('eq'),
            nombre, tipo: tipo || 'General',
            ultimaRevision: new Date().toISOString().slice(0, 10),
            detalles: detalles || 'Equipo recién registrado',
            estado: 'optimo'
        };
        equipos.push(nuevo);
        db.escribirColeccion('equipos', equipos);
        io.emit('cambio_equipos', { tipo: 'nuevo', equipo: nuevo });
        res.json({ status: 'success', equipo: nuevo });
    });

    router.post('/:id/estado', (req, res) => {
        const { estado, detalles } = req.body;
        const equipos = db.leerColeccion('equipos');
        const equipo = equipos.find(e => e.id === req.params.id);
        if (!equipo) return res.status(404).json({ status: 'error', error: 'Equipo no encontrado' });

        equipo.estado = estado;
        if (detalles) equipo.detalles = detalles;
        if (estado === 'optimo') equipo.ultimaRevision = new Date().toISOString().slice(0, 10);

        db.escribirColeccion('equipos', equipos);
        io.emit('cambio_equipos', { tipo: 'estado', equipo });
        res.json({ status: 'success', equipo });
    });

    return router;
};
