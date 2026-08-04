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
