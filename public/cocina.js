// cocina.js — Monitor de cocina conectado al backend real
const socket = io();
console.log("⚡ Conectado al canal de tiempo real del restaurante.");

let ticketsCocina = [];

async function cargarTickets() {
    try {
        const resp = await fetch('/api/cocina');
        ticketsCocina = await resp.json();
        renderizarTablero();
    } catch (error) {
        console.error('❌ No se pudo cargar el tablero de cocina:', error);
    }
}

function renderizarTablero() {
    const colEspera = document.getElementById('col-espera');
    const colProceso = document.getElementById('col-proceso');
    const colListo = document.getElementById('col-listo');

    if (colEspera) colEspera.innerHTML = "";
    if (colProceso) colProceso.innerHTML = "";
    if (colListo) colListo.innerHTML = "";

    let countEspera = 0, countProceso = 0, countListo = 0;

    ticketsCocina.forEach(ticket => {
        let itemsHTML = ticket.items.map(item => `<li>• ${item}</li>`).join('');

        if (ticket.estado === "espera") {
            countEspera++;
            colEspera.innerHTML += `
                <div class="bg-white p-4 rounded-xl card-shadow border border-gray-200 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                    <div class="flex justify-between items-start mb-2">
                        <span class="font-bold text-sm text-gray-800">Orden #${ticket.id}</span>
                        <span class="text-[11px] font-mono font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">⏱️ ${ticket.tiempo} min</span>
                    </div>
                    <ul class="text-xs text-gray-600 space-y-1 font-medium mb-4">${itemsHTML}</ul>
                    <button onclick="cambiarEstadoTicket('${ticket.id}', 'proceso')" class="w-full py-2 bg-gray-50 hover:bg-blue-50 text-blue-600 font-bold text-xs rounded-lg border border-gray-200 transition-colors flex items-center justify-center gap-1">
                        Preparar <i class="fa-solid fa-arrow-right text-[10px]"></i>
                    </button>
                </div>`;
        } else if (ticket.estado === "proceso") {
            countProceso++;
            let alertClass = ticket.tiempo >= 9 ? "text-amber-600 bg-amber-50 animate-pulse" : "text-gray-500 bg-gray-100";
            colProceso.innerHTML += `
                <div class="bg-white p-4 rounded-xl card-shadow border border-gray-200 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                    <div class="flex justify-between items-start mb-2">
                        <span class="font-bold text-sm text-gray-800">Orden #${ticket.id}</span>
                        <span class="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${alertClass}">⏱️ ${ticket.tiempo} min</span>
                    </div>
                    <ul class="text-xs text-gray-600 space-y-1 font-medium mb-4">${itemsHTML}</ul>
                    <button onclick="cambiarEstadoTicket('${ticket.id}', 'listo')" class="w-full py-2 bg-amber-50 hover:bg-green-50 text-amber-700 hover:text-green-700 font-bold text-xs rounded-lg border border-amber-200 hover:border-green-200 transition-colors flex items-center justify-center gap-1">
                        Terminar <i class="fa-solid fa-circle-check text-[10px]"></i>
                    </button>
                </div>`;
        } else if (ticket.estado === "listo") {
            countListo++;
            colListo.innerHTML += `
                <div class="bg-white p-4 rounded-xl card-shadow border border-gray-200 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-green-500"></div>
                    <div class="flex justify-between items-start mb-2">
                        <span class="font-bold text-sm text-gray-800">Orden #${ticket.id}</span>
                        <span class="text-[11px] font-mono font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">¡Despachar!</span>
                    </div>
                    <ul class="text-xs text-gray-600 space-y-1 font-medium mb-4">${itemsHTML}</ul>
                    <button onclick="despacharTicket('${ticket.id}')" class="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg transition-colors shadow-md flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-bell-concierge"></i> Entregar a Cliente
                    </button>
                </div>`;
        }
    });

    document.getElementById('badge-espera').innerText = countEspera;
    document.getElementById('badge-proceso').innerText = countProceso;
    document.getElementById('badge-listo').innerText = countListo;
}

// Cambiar estado: se lo decimos al servidor; el propio servidor nos regresa
// el evento por socket y ahí es donde de verdad repintamos (única fuente de verdad).
async function cambiarEstadoTicket(id, nuevoEstado) {
    try {
        await fetch('/api/cocina/actualizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idOrden: id, estado: nuevoEstado })
        });
    } catch (error) {
        console.error('❌ Error de red al intentar actualizar:', error);
        alert('No se pudo conectar con el servidor. Verificá tu conexión.');
    }
}

async function despacharTicket(id) {
    const ticket = ticketsCocina.find(t => String(t.id) === String(id));

    // Integración entre módulos: al despachar, se descuenta pollo real del inventario
    // (id fijo "inv-01" = Pollo Entero Limpio, ver data/inventario.json).
    if (ticket) {
        const unidadesPollo = ticket.items.reduce((total, texto) => {
            const coincide = texto.match(/(\d+)\s*x.*pollo/i);
            return total + (coincide ? Number(coincide[1]) : 0);
        }, 0);

        if (unidadesPollo > 0) {
            try {
                await fetch('/api/inventario/inv-01/consumir', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cantidad: unidadesPollo })
                });
            } catch (error) {
                console.error('❌ No se pudo descontar el inventario de pollo:', error);
            }
        }
    }

    try {
        await fetch(`/api/cocina/${id}`, { method: 'DELETE' });
    } catch (error) {
        console.error('❌ Error al despachar el ticket:', error);
    }
}

// Recibir cambios (propios o de otras pantallas conectadas) y repintar con datos frescos
socket.on('cambio_cocina', (data) => {
    console.log("📢 Actualización de cocina en tiempo real:", data);
    const ticket = ticketsCocina.find(t => String(t.id) === String(data.idOrden));
    if (ticket) {
        ticket.estado = data.estado;
        renderizarTablero();
    }
});

socket.on('ticket_despachado', (data) => {
    ticketsCocina = ticketsCocina.filter(t => String(t.id) !== String(data.idOrden));
    renderizarTablero();
    const modal = document.getElementById('modal-historial');
    if (modal && !modal.classList.contains('hidden')) abrirHistorial();
});

// El tiempo en preparación sigue subiendo cada minuto (esto es solo un contador visual local)
setInterval(() => {
    ticketsCocina.forEach(t => {
        if (t.estado !== "listo") t.tiempo++;
    });
    renderizarTablero();
}, 60000);

async function abrirHistorial() {
    const modal = document.getElementById('modal-historial');
    const contenido = document.getElementById('contenido-historial');
    modal.classList.remove('hidden');
    contenido.innerHTML = '<p class="text-sm text-gray-400">Cargando...</p>';

    try {
        const resp = await fetch('/api/cocina/historial');
        const historial = await resp.json();

        if (historial.length === 0) {
            contenido.innerHTML = '<p class="text-sm text-gray-400">Todavía no se ha despachado ningún ticket.</p>';
            return;
        }

        contenido.innerHTML = historial.map(t => `
            <div class="border border-gray-200 rounded-xl p-3">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-sm text-gray-800">Orden #${t.id}</span>
                    <span class="text-[11px] text-gray-400">${new Date(t.entregadoEn).toLocaleString('es-CR')}</span>
                </div>
                <ul class="text-xs text-gray-600 space-y-0.5">${t.items.map(i => `<li>• ${i}</li>`).join('')}</ul>
                <p class="text-[11px] text-gray-400 mt-1">Tiempo total en cocina: ${t.tiempoTotal} min</p>
            </div>`).join('');
    } catch (error) {
        console.error('❌ No se pudo cargar el historial:', error);
        contenido.innerHTML = '<p class="text-sm text-red-500">No se pudo cargar el historial. Verificá la conexión con el servidor.</p>';
    }
}

function cerrarHistorial() {
    document.getElementById('modal-historial').classList.add('hidden');
}

document.addEventListener("DOMContentLoaded", cargarTickets);
