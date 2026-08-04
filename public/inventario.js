// inventario.js — Control de stock conectado al backend real
const socket = io();
console.log("⚡ Conectado al canal de tiempo real del restaurante.");

let insumosInventario = [];

async function cargarInventario() {
    try {
        const resp = await fetch('/api/inventario');
        insumosInventario = await resp.json();
        renderizarInventario();
    } catch (error) {
        console.error('❌ No se pudo cargar el inventario:', error);
    }
}

function renderizarInventario() {
    const colCritico = document.getElementById('col-critico');
    const colModerado = document.getElementById('col-moderado');
    const colOptimo = document.getElementById('col-optimo');

    if (colCritico) colCritico.innerHTML = "";
    if (colModerado) colModerado.innerHTML = "";
    if (colOptimo) colOptimo.innerHTML = "";

    let countCritico = 0, countModerado = 0, countOptimo = 0;

    insumosInventario.forEach(insumo => {
        if (insumo.estado === "critico") {
            countCritico++;
            colCritico.innerHTML += `
                <div class="bg-white p-4 rounded-xl card-shadow border border-gray-200 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-sm text-gray-800">${insumo.nombre}</span>
                        <span class="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">¡Reordenar ya!</span>
                    </div>
                    <p class="text-xs text-gray-500 mb-3">Categoría: ${insumo.categoria}</p>
                    <div class="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-600 mb-4 bg-gray-50 p-2 rounded-lg">
                        <div>Stock Actual: <span class="text-red-600 block text-sm font-bold">${insumo.actual} ${insumo.unidad}</span></div>
                        <div>Min. Requerido: <span class="text-gray-800 block text-sm font-bold">${insumo.minimo} ${insumo.unidad}</span></div>
                    </div>
                    <button onclick="reabastecerInsumo('${insumo.id}')" class="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                        <i class="fa-solid fa-cart-shopping"></i> Solicitar a Proveedor
                    </button>
                </div>`;
        } else if (insumo.estado === "moderado") {
            countModerado++;
            colModerado.innerHTML += `
                <div class="bg-white p-4 rounded-xl card-shadow border border-gray-200 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-sm text-gray-800">${insumo.nombre}</span>
                        <span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Revisar pronto</span>
                    </div>
                    <p class="text-xs text-gray-500 mb-3">Categoría: ${insumo.categoria}</p>
                    <div class="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-600 mb-4 bg-gray-50 p-2 rounded-lg">
                        <div>Stock Actual: <span class="text-amber-600 block text-sm font-bold">${insumo.actual} ${insumo.unidad}</span></div>
                        <div>Min. Requerido: <span class="text-gray-800 block text-sm font-bold">${insumo.minimo} ${insumo.unidad}</span></div>
                    </div>
                    <button onclick="ajustarManual('${insumo.id}')" class="w-full py-2 bg-gray-50 hover:bg-amber-50 text-amber-700 font-bold text-xs rounded-lg border border-gray-200 transition-colors flex items-center justify-center gap-1">
                        <i class="fa-solid fa-pen-to-square"></i> Ajustar Manualmente
                    </button>
                </div>`;
        } else if (insumo.estado === "optimo") {
            countOptimo++;
            colOptimo.innerHTML += `
                <div class="bg-white p-4 rounded-xl card-shadow border border-gray-200 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-green-500"></div>
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-sm text-gray-800">${insumo.nombre}</span>
                        <span class="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">Al día</span>
                    </div>
                    <p class="text-xs text-gray-500 mb-3">Categoría: ${insumo.categoria}</p>
                    <div class="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-600 mb-4 bg-gray-50 p-2 rounded-lg">
                        <div>Stock Actual: <span class="text-green-600 block text-sm font-bold">${insumo.actual} ${insumo.unidad}</span></div>
                        <div>Min. Requerido: <span class="text-gray-800 block text-sm font-bold">${insumo.minimo} ${insumo.unidad}</span></div>
                    </div>
                    <button onclick="ajustarManual('${insumo.id}')" class="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs rounded-lg border border-gray-200 transition-colors flex items-center justify-center gap-1">
                        <i class="fa-solid fa-sliders"></i> Ajustar Stock
                    </button>
                </div>`;
        }
    });

    if (document.getElementById('badge-critico')) document.getElementById('badge-critico').innerText = countCritico;
    if (document.getElementById('badge-moderado')) document.getElementById('badge-moderado').innerText = countModerado;
    if (document.getElementById('badge-optimo')) document.getElementById('badge-optimo').innerText = countOptimo;
}

async function reabastecerInsumo(id) {
    const insumo = insumosInventario.find(i => i.id === id);
    if (!insumo) return;
    try {
        await fetch(`/api/inventario/${id}/ajustar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actual: insumo.minimo * 2 })
        });
        alert(`¡Pedido enviado! Se ha registrado la entrada automática para reabastecer: ${insumo.nombre}`);
    } catch (error) {
        console.error('❌ Error al reabastecer:', error);
    }
}

async function ajustarManual(id) {
    const insumo = insumosInventario.find(i => i.id === id);
    if (!insumo) return;
    let nuevoValor = prompt(`Ingresá la cantidad física real en bodega para [ ${insumo.nombre} ] (${insumo.unidad}):`, insumo.actual);

    if (nuevoValor !== null && !isNaN(nuevoValor) && nuevoValor.trim() !== "") {
        try {
            await fetch(`/api/inventario/${id}/ajustar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actual: Number(nuevoValor) })
            });
        } catch (error) {
            console.error('❌ Error al ajustar el stock:', error);
        }
    }
}

// El servidor es la única fuente de verdad: cuando llega el evento, releemos todo
socket.on('cambio_inventario', () => {
    cargarInventario();
});

function abrirModalInsumo() {
    document.getElementById('modal-insumo').classList.remove('hidden');
}

function cerrarModalInsumo() {
    document.getElementById('modal-insumo').classList.add('hidden');
    document.getElementById('form-insumo').reset();
}

async function simularMovimientoStock() {
    try {
        const resp = await fetch('/api/inventario/simular', { method: 'POST' });
        const datos = await resp.json();
        if (!resp.ok) throw new Error(datos.error || 'Error al simular');

        const signo = datos.variacion >= 0 ? '+' : '';
        console.log(`🔀 Simulación: ${datos.insumo.nombre} cambió en ${signo}${datos.variacion} ${datos.insumo.unidad}`);
    } catch (error) {
        console.error('❌ No se pudo simular el movimiento de stock:', error);
        alert('No se pudo simular el movimiento de stock.');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('form-insumo');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const nombre = document.getElementById('insumo-nombre').value.trim();
        const categoria = document.getElementById('insumo-categoria').value.trim();
        const actual = document.getElementById('insumo-actual').value;
        const minimo = document.getElementById('insumo-minimo').value;
        const unidad = document.getElementById('insumo-unidad').value.trim();

        if (!nombre || actual === '' || minimo === '') {
            alert('⚠️ Nombre, stock actual y mínimo requerido son obligatorios.');
            return;
        }

        try {
            const resp = await fetch('/api/inventario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, categoria, actual: Number(actual), minimo: Number(minimo), unidad })
            });
            if (!resp.ok) throw new Error('Fallo al registrar el insumo');
            cerrarModalInsumo();
        } catch (error) {
            console.error('❌ Error al registrar el insumo:', error);
            alert('No se pudo registrar el insumo. Revisá la conexión con el servidor.');
        }
    });
});

document.addEventListener("DOMContentLoaded", cargarInventario);

// Mostrar modal con el listado completo de inventario
async function abrirModalBodega() {
    if (!insumosInventario || insumosInventario.length === 0) {
        await cargarInventario();
    }
    renderBodegaListado();
    document.getElementById('modal-bodega').classList.remove('hidden');
}

function cerrarModalBodega() {
    document.getElementById('modal-bodega').classList.add('hidden');
}

function renderBodegaListado() {
    const tbody = document.getElementById('bodega-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    insumosInventario.forEach(i => {
        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-gray-50';
        tr.innerHTML = `
            <td class="px-3 py-2 font-mono text-xs">${i.id}</td>
            <td class="px-3 py-2">${i.nombre}</td>
            <td class="px-3 py-2">${i.categoria}</td>
            <td class="px-3 py-2">${i.actual} ${i.unidad}</td>
            <td class="px-3 py-2">${i.minimo} ${i.unidad}</td>
            <td class="px-3 py-2">${i.unidad}</td>
            <td class="px-3 py-2 capitalize">${i.estado}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Vincular el botón de Control de Bodega si existe
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-control-bodega');
    if (btn) btn.addEventListener('click', abrirModalBodega);
});
