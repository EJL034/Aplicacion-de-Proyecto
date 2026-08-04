// javascript.js — Dashboard principal (index.html)
// Antes tenía todos los números fijos ("quemados") y no se enteraba de nada
// que pasara en Cocina, Inventario, Equipos o Personal. Ahora junta datos
// reales de cada módulo y se actualiza solo en tiempo real por socket.io.

const ID_INSUMO_POLLO = 'inv-01'; // Pollo Entero Limpio (ver data/inventario.json)

async function obtenerJSON(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Error al consultar ${url}`);
    return resp.json();
}

async function inicializarDashboard() {
    try {
        const [config, personal, tickets, inventario, equipos] = await Promise.all([
            obtenerJSON('/api/configuracion'),
            obtenerJSON('/api/personal'),
            obtenerJSON('/api/cocina'),
            obtenerJSON('/api/inventario'),
            obtenerJSON('/api/equipos')
        ]);

        // Encabezado
        const encabezado = document.getElementById('info-encabezado');
        if (encabezado) {
            const ahora = new Date();
            encabezado.innerHTML = `Hola, <span class="font-bold text-black">Gerente</span> | Sucursal <span class="font-bold text-black">${config.nombreLocal}</span> · ${ahora.toLocaleDateString('es-CR')}`;
        }

        // Personal activo (turno actual)
        const presentes = personal.filter(p => p.estado === 'Presente').length;
        document.getElementById('txt-personal-activo').innerText = `(${presentes}/${personal.length})`;
        document.getElementById('txt-asistencia-conteo').innerText = `${presentes} / ${personal.length}`;

        // Pedidos de cocina
        const pendientes = tickets.filter(t => t.estado === 'espera' || t.estado === 'proceso').length;
        document.getElementById('txt-pedidos-cocina').innerText = `(${pendientes} Pendientes)`;

        const tablaPedidos = document.getElementById('tabla-pedidos');
        if (tablaPedidos) {
            tablaPedidos.innerHTML = "";
            tickets.forEach(t => {
                const color = t.tiempo >= 9 ? 'red' : t.tiempo >= 6 ? 'amber' : 'green';
                const badgeColor = color === 'green' ? 'bg-[#e2f7ed] text-[#219653]' : color === 'amber' ? 'bg-[#fef3d6] text-[#d97706]' : 'bg-[#fde8e8] text-[#e11d48]';
                tablaPedidos.innerHTML += `
                    <tr>
                        <td class="py-2.5 font-bold">Pedido ${t.id}</td>
                        <td class="py-2.5 text-gray-600">${t.items.join(', ')}</td>
                        <td class="py-2.5 text-gray-600">${t.tiempo} min</td>
                        <td class="py-2.5 text-center"><span class="${badgeColor} font-bold px-2 py-0.5 rounded text-[10px]">${t.estado}</span></td>
                    </tr>`;
            });
        }

        // Inventario de pollo (tarjeta específica del dashboard)
        const pollo = inventario.find(i => i.id === ID_INSUMO_POLLO);
        if (pollo) {
            document.getElementById('lbl-stock-actual').innerText = pollo.actual;
            document.getElementById('lbl-consumo-hoy').innerText = pollo.consumidoHoy || 0;
            document.getElementById('lbl-prediccion').innerText = `Mín. ${pollo.minimo}`;
            document.getElementById('lbl-alerta').innerText = pollo.estado === 'critico' ? '¡Pedir ya!' : (pollo.estado === 'moderado' ? 'Vigilar' : 'Al día');
        }

        // Tarjeta resumen de inventario crítico
        const criticosInventario = inventario.filter(i => i.estado === 'critico').length;
        const txtInvCritico = document.getElementById('txt-inventario-critico');
        if (txtInvCritico) txtInvCritico.innerText = `(${criticosInventario} Ítems bajos)`;

        // Mantenimiento / equipos IoT
        const alertasMantenimiento = equipos.filter(e => e.estado !== 'optimo').length;
        const txtMantenimiento = document.getElementById('txt-mantenimiento-alertas');
        if (txtMantenimiento) txtMantenimiento.innerText = `(${alertasMantenimiento} Alerta${alertasMantenimiento === 1 ? '' : 's'})`;

        const listaIoT = document.getElementById('lista-equipos-iot');
        if (listaIoT) {
            listaIoT.innerHTML = "";
            equipos.forEach(e => {
                const enAlerta = e.estado !== 'optimo';
                const textStyle = enAlerta ? 'text-red-500 font-bold' : 'text-gray-600';
                const icono = e.tipo && e.tipo.toLowerCase().includes('conserv') ? 'fa-snowflake' : 'fa-fire-burner';
                listaIoT.innerHTML += `
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-black"><i class="fa-solid ${icono} mr-2"></i>${e.nombre}</span>
                        <span class="text-[11px] ${textStyle}">${e.detalles}</span>
                    </div>`;
            });
        }
    } catch (error) {
        console.error('❌ No se pudo cargar el dashboard con datos del servidor:', error);
    }
}

document.addEventListener("DOMContentLoaded", inicializarDashboard);

// El dashboard es un resumen de TODOS los módulos: cuando cualquiera cambia,
// lo recargamos para que Inicio nunca se quede con datos viejos.
document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    ['cambio_cocina', 'ticket_despachado', 'cambio_inventario', 'cambio_equipos', 'cambio_personal', 'cambio_configuracion']
        .forEach(evento => socket.on(evento, inicializarDashboard));
});
