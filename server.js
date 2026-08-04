// server.js
// -----------------------------------------------------------------------------
// Servidor de Pollerya Manager.
// - Sirve el frontend estático (carpeta /public: todos los .html/.js que ya
//   tenías) y expone la API REST + WebSockets que ese frontend necesita.
// - Reemplaza el "servidor fantasma" al que apuntaban los fetch() y los
//   socket.io del cliente, que hasta ahora no existía.
// -----------------------------------------------------------------------------

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rutas de la API, cada una recibe "io" para poder emitir eventos en tiempo real
app.use('/api/cocina', require('./routes/cocina')(io));
app.use('/api/inventario', require('./routes/inventario')(io));
app.use('/api/equipos', require('./routes/equipos')(io));
app.use('/api/menu', require('./routes/menu')(io));
app.use('/api/personal', require('./routes/personal')(io));
app.use('/api/reportes', require('./routes/reportes')(io));
app.use('/api/configuracion', require('./routes/configuracion')(io));

io.on('connection', (socket) => {
    console.log(`🟢 Cliente conectado: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`🔴 Cliente desconectado: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`🐔 Pollerya Manager corriendo en http://localhost:${PORT}`);
});

// ---------------------------------------------------------------
// SIMULADOR: genera un ticket de cocina cada 60 segundos
// ---------------------------------------------------------------
const db = require('./db');

const ejemplosPedidos = [
    ['2x Pollo Grande (Frito)', '1x Porción Patacones'],
    ['1x Combo Familiar (8 pzs)', '2x Bebida Grande'],
    ['3x Alitas Búfalo', '1x Papas Supremas'],
    ['1x Pollo Crispy Personal', '1x Refresco'],
    ['2x Combo Personal + Papas'],
    ['1x Pollo Familiar', '1x Extra Salsa'],
    ['2x Combo Alitas', '1x Bebida Gigante'],
    ['1x Pollo Grande Crispy', '1x Porción Papas']
];

setInterval(() => {
    const tickets = db.leerColeccion('tickets_cocina');

    // No saturar: máximo 8 tickets en espera/proceso
    if (tickets.length >= 8) return;

    const nuevoTicket = {
        id: String(100 + Math.floor(Math.random() * 900)),
        items: ejemplosPedidos[Math.floor(Math.random() * ejemplosPedidos.length)],
        tiempo: Math.floor(Math.random() * 4) + 1, // 1 a 4 min
        estado: 'espera'
    };

    tickets.push(nuevoTicket);
    db.escribirColeccion('tickets_cocina', tickets);

    // Avisar a las pantallas de cocina en tiempo real
    io.emit('cambio_cocina', { tipo: 'nuevo_ticket', ticket: nuevoTicket });

    console.log(`🍗 Nuevo pedido simulado: #${nuevoTicket.id}`);
}, 60 * 1000); // cada 60 segundos
