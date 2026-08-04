// menu.js — Catálogo de productos conectado al backend real
const socket = io();

let idProductoEnEdicion = null;
let productosMenu = [];

async function cargarMenu() {
    try {
        const resp = await fetch('/api/menu');
        productosMenu = await resp.json();
        renderizarMenu();
    } catch (error) {
        console.error('❌ No se pudo cargar el menú:', error);
    }
}

function formatearColones(cantidad) {
    return '₡' + cantidad.toLocaleString('es-CR');
}

function renderizarMenu() {
    const contenedorGrid = document.getElementById('grid-menu-productos');
    const contadorLabel = document.getElementById('contador-productos');

    if (!contenedorGrid) return;
    contenedorGrid.innerHTML = "";
    if (contadorLabel) contadorLabel.innerText = productosMenu.length;

    productosMenu.forEach(producto => {
        const esSuspendido = producto.estado === "suspendido";
        const badgeColor = esSuspendido ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700";
        const badgeTexto = esSuspendido ? "Suspendido" : "Activo";
        const opacidadTarjeta = esSuspendido ? "opacity-65" : "opacity-100";
        const botonSuspenderIcono = esSuspendido ? "fa-play text-green-600" : "fa-pause text-amber-600";
        const botonSuspenderTexto = esSuspendido ? "Activar" : "Suspender";

        const esEdicionActiva = (String(producto.id) === String(idProductoEnEdicion));

        let bloquePrecioHTML = "";
        if (esEdicionActiva) {
            bloquePrecioHTML = `
                <div class="flex items-center gap-2 w-full px-2">
                    <span class="text-base font-bold text-gray-900">₡</span>
                    <input type="number" id="input-nuevo-precio-${producto.id}"
                           class="w-full bg-white border border-blue-500 rounded-lg px-2 py-1 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                           value="${producto.precio}"
                           onkeydown="evaluarTeclaEdicion(event, '${producto.id}')">
                </div>`;
        } else {
            bloquePrecioHTML = formatearColones(producto.precio);
        }

        let botonesAccionHTML = "";
        if (esEdicionActiva) {
            botonesAccionHTML = `
                <button onclick="guardarPrecioInline('${producto.id}')" class="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm">
                    <i class="fa-solid fa-check"></i> Guardar
                </button>
                <button onclick="cancelarEdicionInline()" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[11px] font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
                    <i class="fa-solid fa-xmark"></i> Cancelar
                </button>`;
        } else {
            botonesAccionHTML = `
                <button onclick="alternarEstadoProducto('${producto.id}')" class="flex-1 text-[11px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
                    <i class="fa-solid ${botonSuspenderIcono}"></i> ${botonSuspenderTexto}
                </button>
                <button onclick="activarEdicionInline('${producto.id}')" class="flex-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
                    <i class="fa-solid fa-pen-to-square"></i> Precio
                </button>`;
        }

        const tarjeta = document.createElement('div');
        tarjeta.className = `bg-white p-5 rounded-xl card-shadow border border-gray-200 flex flex-col justify-between relative transition-all ${opacidadTarjeta}`;
        tarjeta.innerHTML = `
                <div>
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-3xl bg-gray-50 w-12 h-12 rounded-xl flex items-center justify-center border border-gray-100 shadow-sm">${producto.icono}</span>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor}">
                            ${badgeTexto}
                        </span>
                    </div>
                    <h4 class="font-bold text-gray-800 text-sm mt-2 tracking-tight">${producto.nombre}</h4>
                    <p class="text-[11px] text-gray-400 font-medium mb-4">Cat: ${producto.categoria}</p>
                </div>
                <div>
                    <div class="text-base font-bold text-gray-700 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100/70 flex items-center justify-center h-12">
                        ${bloquePrecioHTML}
                    </div>
                    <div class="flex gap-2 border-t border-gray-100 pt-3">
                        ${botonesAccionHTML}
                    </div>
                    ${!esEdicionActiva ? `
                        <button onclick="eliminarProducto('${producto.id}')" class="w-full mt-2 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors">
                            <i class="fa-solid fa-trash-can"></i> Quitar
                        </button>
                    ` : ''}
                </div>
        `;
        contenedorGrid.appendChild(tarjeta);

        if (esEdicionActiva) {
            const inputCreado = document.getElementById(`input-nuevo-precio-${producto.id}`);
            if (inputCreado) {
                inputCreado.focus();
                inputCreado.select();
            }
        }
    });
}

function activarEdicionInline(id) {
    idProductoEnEdicion = id;
    renderizarMenu();
}

function cancelarEdicionInline() {
    idProductoEnEdicion = null;
    renderizarMenu();
}

async function guardarPrecioInline(id) {
    const inputPrecio = document.getElementById(`input-nuevo-precio-${id}`);
    if (!inputPrecio) return;

    const nuevoMonto = parseInt(inputPrecio.value.trim(), 10);
    if (isNaN(nuevoMonto) || nuevoMonto <= 0) {
        alert("⚠️ Error: Ingrese un monto numérico válido y mayor a 0.");
        return;
    }

    try {
        await fetch(`/api/menu/${id}/precio`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ precio: nuevoMonto })
        });
        idProductoEnEdicion = null;
    } catch (error) {
        console.error('❌ Error al guardar el precio:', error);
    }
}

function evaluarTeclaEdicion(event, id) {
    if (event.key === "Enter") {
        event.preventDefault();
        guardarPrecioInline(id);
    } else if (event.key === "Escape") {
        cancelarEdicionInline();
    }
}

async function agregarNuevoProducto() {
    const nombre = document.getElementById('menu-nombre').value.trim();
    const categoria = document.getElementById('menu-categoria').value;
    const precio = document.getElementById('menu-precio').value;
    let icono = document.getElementById('menu-icono').value.trim();

    if (!nombre || !precio) {
        alert("⚠️ Por favor rellene el nombre y precio del producto.");
        return;
    }
    if (Number(precio) <= 0) {
        alert("⚠️ El precio debe ser un número mayor a cero.");
        return;
    }
    if (!icono) icono = "🍔";

    try {
        await fetch('/api/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, categoria, precio: Number(precio), icono })
        });
        document.getElementById('menu-nombre').value = "";
        document.getElementById('menu-precio').value = "";
        document.getElementById('menu-icono').value = "";
    } catch (error) {
        console.error('❌ Error al agregar el producto:', error);
    }
}

async function alternarEstadoProducto(id) {
    try {
        await fetch(`/api/menu/${id}/estado`, { method: 'PUT' });
    } catch (error) {
        console.error('❌ Error al cambiar el estado del producto:', error);
    }
}

async function eliminarProducto(id) {
    const producto = productosMenu.find(p => p.id === id);
    if (!producto) return;
    const confirmar = confirm(`¿Está seguro de que desea eliminar [ ${producto.nombre} ] del menú permanente?`);
    if (!confirmar) return;
    try {
        await fetch(`/api/menu/${id}`, { method: 'DELETE' });
    } catch (error) {
        console.error('❌ Error al eliminar el producto:', error);
    }
}

socket.on('cambio_menu', () => cargarMenu());

document.addEventListener("DOMContentLoaded", cargarMenu);
