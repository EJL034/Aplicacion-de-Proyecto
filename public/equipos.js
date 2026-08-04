// equipos.js — Estado de maquinaria conectado al backend real
const socket = io();

let equiposRestaurante = [];

async function cargarEquipos() {
    try {
        const resp = await fetch('/api/equipos');
        equiposRestaurante = await resp.json();
        renderizarEquipos();
    } catch (error) {
        console.error('❌ No se pudo cargar el estado de los equipos:', error);
    }
}

function renderizarEquipos() {
    const colCritico = document.getElementById('col-critico');
    const colModerado = document.getElementById('col-moderado');
    const colOptimo = document.getElementById('col-optimo');

    if (colCritico) colCritico.innerHTML = "";
    if (colModerado) colModerado.innerHTML = "";
    if (colOptimo) colOptimo.innerHTML = "";

    let countCritico = 0, countModerado = 0, countOptimo = 0;

    equiposRestaurante.forEach(equipo => {
        if (equipo.estado === "critico") {
            countCritico++;
            colCritico.innerHTML += `
                <div class="bg-white p-4 rounded-xl card-shadow border border-gray-200 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-sm text-gray-800">${equipo.nombre}</span>
                        <span class="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Inactivo</span>
                    </div>
                    <p class="text-xs text-gray-500 mb-2">Tipo: ${equipo.tipo}</p>
                    <p class="text-xs font-medium text-red-700 bg-red-50/50 p-2 rounded border border-red-100 mb-4">
                        <i class="fa-solid fa-triangle-exclamation"></i> ${equipo.detalles}
                    </p>
                    <div class="text-[11px] text-gray-400 font-medium mb-3">Último Mantenimiento: ${equipo.ultimaRevision}</div>
                    <button onclick="cambiarEstadoEquipo('${equipo.id}', 'optimo', 'Mantenimiento preventivo y reparación completada')" class="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                        <i class="fa-solid fa-wrench"></i> Reportar Reparado
                    </button>
                </div>`;
        } else if (equipo.estado === "moderado") {
            countModerado++;
            colModerado.innerHTML += `
                <div class="bg-white p-4 rounded-xl card-shadow border border-gray-200 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-sm text-gray-800">${equipo.nombre}</span>
                        <span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Pendiente</span>
                    </div>
                    <p class="text-xs text-gray-500 mb-2">Tipo: ${equipo.tipo}</p>
                    <p class="text-xs text-gray-600 mb-3 font-medium">• Nota: ${equipo.detalles}</p>
                    <div class="text-[11px] text-gray-400 font-medium mb-4">Último Mantenimiento: ${equipo.ultimaRevision}</div>
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="cambiarEstadoEquipo('${equipo.id}', 'optimo', 'Limpieza y ajuste menor realizado')" class="py-2 bg-gray-50 hover:bg-green-50 text-green-700 font-bold text-[11px] rounded-lg border border-gray-200 hover:border-green-200 transition-colors">
                            <i class="fa-solid fa-circle-check"></i> Solventar
                        </button>
                        <button onclick="cambiarEstadoEquipo('${equipo.id}', 'critico', 'El estado del equipo empeoró en operación')" class="py-2 bg-gray-50 hover:bg-red-50 text-red-600 font-bold text-[11px] rounded-lg border border-gray-200 hover:border-red-200 transition-colors">
                            <i class="fa-solid fa-ban"></i> Apagar Equipo
                        </button>
                    </div>
                </div>`;
        } else if (equipo.estado === "optimo") {
            countOptimo++;
            colOptimo.innerHTML += `
                <div class="bg-white p-4 rounded-xl card-shadow border border-gray-200 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-green-500"></div>
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-sm text-gray-800">${equipo.nombre}</span>
                        <span class="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">Estable</span>
                    </div>
                    <p class="text-xs text-gray-500 mb-2">Tipo: ${equipo.tipo}</p>
                    <p class="text-xs text-gray-500 italic mb-3">${equipo.detalles}</p>
                    <div class="text-[11px] text-gray-400 font-medium mb-4">Último Mantenimiento: ${equipo.ultimaRevision}</div>
                    <button onclick="solicitarRevision('${equipo.id}')" class="w-full py-2 bg-gray-50 hover:bg-amber-50 text-amber-700 font-bold text-xs rounded-lg border border-gray-200 transition-colors flex items-center justify-center gap-1">
                        <i class="fa-solid fa-magnifying-glass-wrench"></i> Solicitar Revisión
                    </button>
                </div>`;
        }
    });

    if (document.getElementById('badge-critico')) document.getElementById('badge-critico').innerText = countCritico;
    if (document.getElementById('badge-moderado')) document.getElementById('badge-moderado').innerText = countModerado;
    if (document.getElementById('badge-optimo')) document.getElementById('badge-optimo').innerText = countOptimo;
}

async function cambiarEstadoEquipo(id, nuevoEstado, nuevosDetalles) {
    try {
        await fetch(`/api/equipos/${id}/estado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado, detalles: nuevosDetalles })
        });
    } catch (error) {
        console.error('❌ Error al cambiar el estado del equipo:', error);
    }
}

async function solicitarRevision(id) {
    const equipo = equiposRestaurante.find(e => e.id === id);
    if (!equipo) return;
    let motivo = prompt(`Especificá el detalle o falla detectada para [ ${equipo.nombre} ]:`);
    if (motivo !== null && motivo.trim() !== "") {
        await cambiarEstadoEquipo(id, 'moderado', motivo);
    }
}

socket.on('cambio_equipos', () => cargarEquipos());

function abrirModalEquipo() {
    document.getElementById('modal-equipo').classList.remove('hidden');
}

function cerrarModalEquipo() {
    document.getElementById('modal-equipo').classList.add('hidden');
    document.getElementById('form-equipo').reset();
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('form-equipo');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const nombre = document.getElementById('equipo-nombre').value.trim();
        const tipo = document.getElementById('equipo-tipo').value.trim();
        const detalles = document.getElementById('equipo-detalles').value.trim();

        if (!nombre) {
            alert('⚠️ El nombre del equipo es obligatorio.');
            return;
        }

        try {
            const resp = await fetch('/api/equipos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, tipo, detalles })
            });
            if (!resp.ok) throw new Error('Fallo al registrar el equipo');
            cerrarModalEquipo();
        } catch (error) {
            console.error('❌ Error al registrar el equipo:', error);
            alert('No se pudo registrar el equipo. Revisá la conexión con el servidor.');
        }
    });
});

document.addEventListener("DOMContentLoaded", cargarEquipos);
