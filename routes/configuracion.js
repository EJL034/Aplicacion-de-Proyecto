const express = require('express');
const db = require('../db');

module.exports = function (io) {
    const router = express.Router();

    // GET /api/configuracion -> NUNCA devuelve el pin ni su hash, solo el resto de parámetros
    router.get('/', (req, res) => {
        const [config] = db.leerColeccion('configuracion');
        if (!config) return res.status(404).json({ status: 'error', error: 'Configuración no encontrada' });
        const { pinGerencialHash, ...publico } = config;
        res.json(publico);
    });

    // POST /api/configuracion/verificar-pin { pin } -> valida contra el hash guardado
    router.post('/verificar-pin', (req, res) => {
        const { pin } = req.body;
        const [config] = db.leerColeccion('configuracion');
        if (!config) return res.status(404).json({ status: 'error', error: 'Configuración no encontrada' });

        const valido = db.hashPin(pin) === config.pinGerencialHash;
        res.json({ status: valido ? 'success' : 'error', autorizado: valido });
    });

    // PUT /api/configuracion -> guarda cambios; si viene "pin" nuevo, se hashea antes de guardar
    router.put('/', (req, res) => {
        const configs = db.leerColeccion('configuracion');
        const config = configs[0];
        if (!config) return res.status(404).json({ status: 'error', error: 'Configuración no encontrada' });

        const { nombreLocal, cedulaJuridica, ivaPorcentaje, limiteEsperaCocina, toleranciaRetrasoPersonal, impresoraActiva, pin } = req.body;

        if (nombreLocal !== undefined) config.nombreLocal = nombreLocal;
        if (cedulaJuridica !== undefined) config.cedulaJuridica = cedulaJuridica;
        if (ivaPorcentaje !== undefined) config.ivaPorcentaje = Number(ivaPorcentaje);
        if (limiteEsperaCocina !== undefined) config.limiteEsperaCocina = Number(limiteEsperaCocina);
        if (toleranciaRetrasoPersonal !== undefined) config.toleranciaRetrasoPersonal = Number(toleranciaRetrasoPersonal);
        if (impresoraActiva !== undefined) config.impresoraActiva = impresoraActiva;

        if (pin !== undefined && pin !== '') {
            if (String(pin).length !== 4 || isNaN(pin)) {
                return res.status(400).json({ status: 'error', error: 'El PIN debe ser numérico de 4 dígitos' });
            }
            config.pinGerencialHash = db.hashPin(pin);
        }

        db.escribirColeccion('configuracion', configs);
        io.emit('cambio_configuracion', { nombreLocal: config.nombreLocal });

        const { pinGerencialHash, ...publico } = config;
        res.json({ status: 'success', configuracion: publico });
    });

    return router;
};
