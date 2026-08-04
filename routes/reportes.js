const express = require('express');
const db = require('../db');

module.exports = function (io) {
    const router = express.Router();

    // GET /api/reportes/resumen -> todos los KPIs que necesita reportes.html
    router.get('/resumen', (req, res) => {
        const ventas = db.leerColeccion('ventas');
        const ticketsActivos = db.leerColeccion('tickets_cocina');
        const historial = db.leerColeccion('historial_cocina');
        const menu = db.leerColeccion('menu');

        const ventasTotales = ventas.reduce((acc, v) => acc + Number(v.monto || 0), 0);
        const ordenesProcesadas = Math.max(ventas.length, historial.length);
        const ticketPromedio = ordenesProcesadas ? Math.round(ventasTotales / ordenesProcesadas) : 0;

        const ticketsMetricos = historial.length > 0 ? historial : ticketsActivos;
        const tiempoPromedioKDS = ticketsMetricos.length
            ? Math.round(ticketsMetricos.reduce((acc, t) => acc + Number(t.tiempoTotal || t.tiempo || 0), 0) / ticketsMetricos.length)
            : 0;

        // Desglose por canal
        const canales = ['mostrador', 'express', 'auto'];
        const desglosePorCanal = {};
        canales.forEach(canal => {
            const montoCanal = ventas.filter(v => v.canal === canal).reduce((a, v) => a + Number(v.monto || 0), 0);
            desglosePorCanal[canal] = {
                monto: montoCanal,
                porcentaje: ventasTotales ? Math.round((montoCanal / ventasTotales) * 100) : 0
            };
        });

        // Top productos: se ordena por precio y también se ajusta con la cantidad de órdenes históricas
        const topProductos = [...menu]
            .filter(p => p.estado === 'activo')
            .map(p => ({
                ...p,
                peso: Number(p.precio || 0) + (historial.length > 0 ? historial.length * 50 : 0)
            }))
            .sort((a, b) => b.peso - a.peso)
            .slice(0, 5)
            .map(p => ({ nombre: p.nombre, precio: p.precio, icono: p.icono }));

        res.json({
            kpis: {
                ventasTotales,
                ordenesProcesadas,
                tiempoPromedioKDS,
                ticketPromedio
            },
            desglosePorCanal,
            topProductos
        });
    });

    // POST /api/reportes/cierre -> registrar cierre de caja del día
    router.post('/cierre', (req, res) => {
        const { ventasTotales, ordenesProcesadas, fecha, detalleCanales } = req.body;
        if (!ventasTotales || !ordenesProcesadas) {
            return res.status(400).json({ status: 'error', error: 'ventasTotales y ordenesProcesadas son requeridos' });
        }
        
        const cierres = db.leerColeccion('cierres_caja');
        const nuevoCierre = {
            id: db.generarId('cierre'),
            ventasTotales: Number(ventasTotales),
            ordenesProcesadas: Number(ordenesProcesadas),
            fecha: fecha || new Date().toISOString(),
            detalleCanales: detalleCanales || {},
            estado: 'completado'
        };
        cierres.push(nuevoCierre);
        db.escribirColeccion('cierres_caja', cierres);
        
        io.emit('cambio_reportes', { tipo: 'cierre_completado', cierre: nuevoCierre });
        res.json({ status: 'success', cierre: nuevoCierre, mensaje: 'Cierre de caja registrado correctamente' });
    });

    return router;
};
