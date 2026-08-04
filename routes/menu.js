const express = require('express');
const db = require('../db');

module.exports = function (io) {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.json(db.leerColeccion('menu'));
    });

    router.post('/', (req, res) => {
        const { nombre, categoria, precio, icono } = req.body;
        if (!nombre || !precio || Number(precio) <= 0) {
            return res.status(400).json({ status: 'error', error: 'nombre y precio (> 0) son requeridos' });
        }
        const productos = db.leerColeccion('menu');
        const nuevo = {
            id: db.generarId('prod'),
            nombre, categoria: categoria || 'Combos',
            precio: Number(precio), icono: icono || '🍔', estado: 'activo'
        };
        productos.push(nuevo);
        db.escribirColeccion('menu', productos);
        io.emit('cambio_menu', { tipo: 'nuevo', producto: nuevo });
        res.json({ status: 'success', producto: nuevo });
    });

    router.put('/:id/precio', (req, res) => {
        const { precio } = req.body;
        if (!precio || Number(precio) <= 0) {
            return res.status(400).json({ status: 'error', error: 'precio inválido' });
        }
        const productos = db.leerColeccion('menu');
        const producto = productos.find(p => p.id === req.params.id);
        if (!producto) return res.status(404).json({ status: 'error', error: 'Producto no encontrado' });

        producto.precio = Number(precio);
        db.escribirColeccion('menu', productos);
        io.emit('cambio_menu', { tipo: 'precio', producto });
        res.json({ status: 'success', producto });
    });

    router.put('/:id/estado', (req, res) => {
        const productos = db.leerColeccion('menu');
        const producto = productos.find(p => p.id === req.params.id);
        if (!producto) return res.status(404).json({ status: 'error', error: 'Producto no encontrado' });

        producto.estado = producto.estado === 'activo' ? 'suspendido' : 'activo';
        db.escribirColeccion('menu', productos);
        io.emit('cambio_menu', { tipo: 'estado', producto });
        res.json({ status: 'success', producto });
    });

    router.delete('/:id', (req, res) => {
        let productos = db.leerColeccion('menu');
        productos = productos.filter(p => p.id !== req.params.id);
        db.escribirColeccion('menu', productos);
        io.emit('cambio_menu', { tipo: 'eliminado', id: req.params.id });
        res.json({ status: 'success' });
    });

    return router;
};
