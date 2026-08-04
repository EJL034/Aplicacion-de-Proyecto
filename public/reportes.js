// reportes.js — Antes este archivo no existía y reportes.html se quedaba
// mostrando ceros fijos. Ahora consulta /api/reportes/resumen.

function formatearColones(cantidad) {
    return '₡' + Number(cantidad).toLocaleString('es-CR');
}

async function cargarReportes() {
    try {
        const resp = await fetch('/api/reportes/resumen');
        const datos = await resp.json();

        console.log('DEBUG: /api/reportes/resumen ->', datos);
        if (!datos || !datos.kpis) {
            alert('No se recibieron datos válidos del servidor para reportes. Abrí la consola para más detalles.');
            console.error('Respuesta inválida reportes:', datos);
            return;
        }

        datosActualesReportes = datos;

        document.getElementById('kpi-ventas').innerText = formatearColones(datos.kpis.ventasTotales);
        document.getElementById('kpi-ordenes').innerText = datos.kpis.ordenesProcesadas;
        document.getElementById('kpi-tiempo').innerText = `${datos.kpis.tiempoPromedioKDS} min`;
        document.getElementById('kpi-ticket-medio').innerText = formatearColones(datos.kpis.ticketPromedio);

        // Top productos
        const listaTop = document.getElementById('lista-top-productos');
        if (listaTop) {
            listaTop.innerHTML = "";
            if (datos.topProductos.length === 0) {
                listaTop.innerHTML = '<p class="text-xs text-gray-400">Todavía no hay productos activos en el menú.</p>';
            }
            datos.topProductos.forEach((p, index) => {
                listaTop.innerHTML += `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-gray-400 w-4">${index + 1}.</span>
                            <span class="text-lg">${p.icono}</span>
                            <span class="text-xs font-bold text-gray-800">${p.nombre}</span>
                        </div>
                        <span class="text-xs font-semibold text-gray-500">${formatearColones(p.precio)}</span>
                    </div>`;
            });
        }

        // Desglose por canal
        const canales = {
            mostrador: { texto: 'txt-canal-mostrador', barra: 'bar-canal-mostrador' },
            express: { texto: 'txt-canal-express', barra: 'bar-canal-express' },
            auto: { texto: 'txt-canal-auto', barra: 'bar-canal-auto' }
        };
        Object.entries(canales).forEach(([canal, ids]) => {
            const info = datos.desglosePorCanal[canal] || { monto: 0, porcentaje: 0 };
            const txt = document.getElementById(ids.texto);
            const barra = document.getElementById(ids.barra);
            if (txt) txt.innerText = `${formatearColones(info.monto)} (${info.porcentaje}%)`;
            if (barra) barra.style.width = `${info.porcentaje}%`;
        });
    } catch (error) {
        console.error('❌ No se pudieron cargar los reportes:', error);
    }
}

function forzarActualizacion() {
    cargarReportes();
}

let datosActualesReportes = {};

function abrirModalCierre() {
    document.getElementById('modal-ventas').innerText = document.getElementById('kpi-ventas').innerText;
    document.getElementById('modal-ordenes').innerText = document.getElementById('kpi-ordenes').innerText;
    document.getElementById('modal-ticket').innerText = document.getElementById('kpi-ticket-medio').innerText;
    document.getElementById('modal-cierre').classList.remove('hidden');
}

function cerrarModalCierre() {
    document.getElementById('modal-cierre').classList.add('hidden');
}

async function confirmarCierre() {
    const ventasTotales = datosActualesReportes.kpis?.ventasTotales || 0;
    const ordenes = datosActualesReportes.kpis?.ordenesProcesadas || 0;
    
    try {
        const resp = await fetch('/api/reportes/cierre', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ventasTotales,
                ordenesProcesadas: ordenes,
                fecha: new Date().toISOString(),
                detalleCanales: datosActualesReportes.desglosePorCanal || {}
            })
        });

        if (!resp.ok) {
            alert('Error al procesar el cierre de caja');
            return;
        }

        const resultado = await resp.json();
        alert(`✅ Cierre registrado correctamente\n\nVentas: ${formatearColones(ventasTotales)}\nÓrdenes: ${ordenes}\n\nFecha: ${new Date().toLocaleString('es-CR')}`);
        cerrarModalCierre();
        setTimeout(cargarReportes, 1000);
    } catch (error) {
        console.error('❌ Error al confirmar cierre:', error);
        alert('No se pudo completar el cierre de caja. Revisá la conexión.');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarReportes();

    // Los reportes reflejan ventas, cocina y menú: si cualquiera cambia, se refresca.
    const socket = io();
    ['cambio_reportes', 'cambio_cocina', 'ticket_despachado', 'cambio_menu']
        .forEach(evento => socket.on(evento, cargarReportes));

    window.addEventListener('focus', cargarReportes);
    setInterval(cargarReportes, 15000);
});
