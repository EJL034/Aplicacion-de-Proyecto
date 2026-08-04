const express = require('express');
const db = require('../db');

function recalcularEstado(insumo) {
    const stockActual = Number(insumo.actual ?? insumo.stock_actual ?? 0);
    const minimo = Number(insumo.minimo ?? 0);
    if (stockActual <= minimo * 0.5) return 'critico';
    if (stockActual < minimo) return 'moderado';
    return 'optimo';
}

function normalizarInsumo(insumo) {
    const actual = Number(insumo.actual ?? insumo.stock_actual ?? 0);
    const minimo = Number(insumo.minimo ?? 0);
    const unidad = insumo.unidad || 'unds';
    const estado = insumo.estado || recalcularEstado({ ...insumo, actual, minimo });

    return {
        ...insumo,
        id: insumo.id,
        id_insumo: insumo.id,
        nombre: insumo.nombre,
        nombre_insumo: insumo.nombre,
        categoria: insumo.categoria || 'Sin categoría',
        actual,
        stock_actual: actual,
        minimo,
        unidad,
        estado,
        consumidoHoy: Number(insumo.consumidoHoy || 0)
    };
}

module.exports = function (io) {
    const router = express.Router();

    router.get('/', (req, res) => {
        const insumos = db.leerColeccion('inventario').map(normalizarInsumo);
        res.json(insumos);
    });

    router.post('/', (req, res) => {
        const { nombre, categoria, actual, minimo, unidad } = req.body;
        if (!nombre || actual == null || minimo == null) {
            return res.status(400).json({ status: 'error', error: 'nombre, actual y minimo son requeridos' });
        }
        const insumos = db.leerColeccion('inventario');
        const nuevo = {
            id: db.generarId('inv'),
            nombre,
            categoria: categoria || 'Sin categoría',
            actual: Number(actual),
            stock_actual: Number(actual),
            minimo: Number(minimo),
            unidad: unidad || 'unds'
        };
        nuevo.estado = recalcularEstado(nuevo);
        insumos.push(nuevo);
        db.escribirColeccion('inventario', insumos);
        io.emit('cambio_inventario', { tipo: 'nuevo', insumo: normalizarInsumo(nuevo) });
        res.json({ status: 'success', insumo: normalizarInsumo(nuevo) });
    });

    // Ajustar cantidad (manual o por reabastecimiento)
    router.post('/:id/ajustar', (req, res) => {
        const { actual } = req.body;
        const insumos = db.leerColeccion('inventario');
        const insumo = insumos.find(i => i.id === req.params.id);
        if (!insumo) return res.status(404).json({ status: 'error', error: 'Insumo no encontrado' });

        const nuevoValor = Number(actual);
        insumo.actual = nuevoValor;
        insumo.stock_actual = nuevoValor;
        insumo.estado = recalcularEstado(insumo);
        db.escribirColeccion('inventario', insumos);
        io.emit('cambio_inventario', { tipo: 'ajuste', insumo: normalizarInsumo(insumo) });
        res.json({ status: 'success', insumo: normalizarInsumo(insumo) });
    });

    // Consumir stock automáticamente cuando cocina despacha una orden (integración entre módulos)
    router.post('/:id/consumir', (req, res) => {
        const { cantidad } = req.body;
        const insumos = db.leerColeccion('inventario');
        const insumo = insumos.find(i => i.id === req.params.id);
        if (!insumo) return res.status(404).json({ status: 'error', error: 'Insumo no encontrado' });

        const cantidadNum = Number(cantidad || 0);
        const nuevoStock = Math.max(0, Number(insumo.actual ?? insumo.stock_actual ?? 0) - cantidadNum);
        insumo.actual = nuevoStock;
        insumo.stock_actual = nuevoStock;
        insumo.consumidoHoy = (Number(insumo.consumidoHoy) || 0) + cantidadNum;
        insumo.estado = recalcularEstado(insumo);
        db.escribirColeccion('inventario', insumos);
        io.emit('cambio_inventario', { tipo: 'consumo', insumo: normalizarInsumo(insumo) });
        res.json({ status: 'success', insumo: normalizarInsumo(insumo), mensaje: 'Stock actualizado correctamente' });
    });

    return router;
};
