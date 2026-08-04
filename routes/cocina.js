const express = require('express');
const db = require('../db');

function calcularMontoAprox(ticket) {
    const items = ticket.items || [];
    return items.length * 4200 + Math.floor(Math.random() * 3000);
}

module.exports = function (io) {
    const router = express.Router();

    // GET /api/cocina -> estado actual de todos los tickets
    router.get('/', (req, res) => {
        res.json(db.leerColeccion('tickets_cocina'));
    });

    // GET /api/cocina/historial -> tickets ya despachados
    router.get('/historial', (req, res) => {
        res.json(db.leerColeccion('historial_cocina'));
    });

    // POST /api/cocina/actualizar -> cambia el estado de un ticket y lo transmite por socket
    router.post('/actualizar', (req, res) => {
        const { idOrden, estado } = req.body;
        if (!idOrden || !estado) {
            return res.status(400).json({ status: 'error', error: 'idOrden y estado son requeridos' });
        }

        const tickets = db.leerColeccion('tickets_cocina');
        const ticket = tickets.find(t => String(t.id) === String(idOrden));
        if (!ticket) {
            return res.status(404).json({ status: 'error', error: 'Ticket no encontrado' });
        }

        ticket.estado = estado;
        db.escribirColeccion('tickets_cocina', tickets);

        // Avisar a TODAS las pantallas conectadas (cocina, index, reportes...) en tiempo real
        io.emit('cambio_cocina', { idOrden, estado });

        res.json({ status: 'success', ticket });
    });

    // DELETE /api/cocina/:id -> se despachó (entregado al cliente)
    router.delete('/:id', (req, res) => {
        let tickets = db.leerColeccion('tickets_cocina');
        const ticket = tickets.find(t => String(t.id) === String(req.params.id));
        const existia = Boolean(ticket);

        if (existia) {
            tickets = tickets.filter(t => String(t.id) !== String(req.params.id));
            db.escribirColeccion('tickets_cocina', tickets);

            const historial = db.leerColeccion('historial_cocina');
            historial.push({
                id: ticket.id,
                items: ticket.items || [],
                tiempoTotal: Number(ticket.tiempo) || 0,
                entregadoEn: new Date().toISOString()
            });
            db.escribirColeccion('historial_cocina', historial);

            // Registrar venta al despachar
            const montoVenta = calcularMontoAprox(ticket);

            const ventas = db.leerColeccion('ventas');
            ventas.push({
                id: db.generarId('v'),
                monto: montoVenta,
                canal: ['mostrador', 'express', 'auto'][Math.floor(Math.random() * 3)],
                fecha: new Date().toISOString()
            });
            db.escribirColeccion('ventas', ventas);

            io.emit('cambio_reportes', { tipo: 'nueva_venta' });

            io.emit('ticket_despachado', { idOrden: req.params.id });
        }

        res.json({ status: 'success', registrado: existia });
    });

    return router;
};
