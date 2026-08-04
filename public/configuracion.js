// configuracion.js — Parámetros del sistema, ahora persistidos en el servidor
// (antes vivían solo en localStorage, incluyendo el PIN en texto plano).

async function verificarAutorizacionPIN() {
    if (sessionStorage.getItem('pollerya_sesion_activa') === "true") return;

    const pinIngresado = prompt("🔒 Ingrese el PIN Gerencial para acceder a la configuración:");
    try {
        const resp = await fetch('/api/configuracion/verificar-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pinIngresado })
        });
        const datos = await resp.json();
        if (datos.autorizado) {
            sessionStorage.setItem('pollerya_sesion_activa', "true");
        } else {
            alert("❌ PIN Incorrecto. Acceso denegado.");
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error('No se pudo verificar el PIN con el servidor:', error);
        alert("No se pudo conectar con el servidor para validar el PIN.");
        window.location.href = "index.html";
    }
}

async function cargarConfiguracion() {
    await verificarAutorizacionPIN();

    try {
        const resp = await fetch('/api/configuracion');
        const config = await resp.json();

        document.getElementById('cfg-nombre-local').value = config.nombreLocal;
        document.getElementById('cfg-cedula-fiscal').value = config.cedulaJuridica;
        document.getElementById('cfg-impuesto').value = config.ivaPorcentaje;
        document.getElementById('cfg-limite-espera').value = config.limiteEsperaCocina;
        document.getElementById('cfg-tolerancia-retraso').value = config.toleranciaRetrasoPersonal;
        document.getElementById('cfg-impresora').value = config.impresoraActiva;
        // El PIN nunca se devuelve desde el servidor (ni hasheado): el campo
        // se deja vacío y solo se actualiza si el usuario escribe uno nuevo.
        document.getElementById('cfg-pin-seguridad').value = "";
        document.getElementById('cfg-pin-seguridad').placeholder = "•••• (sin cambios)";
    } catch (error) {
        console.error('No se pudo cargar la configuración desde el servidor:', error);
    }
}

async function guardarConfiguracionForm() {
    const pinVal = document.getElementById('cfg-pin-seguridad').value;

    if (pinVal && (pinVal.length !== 4 || isNaN(pinVal))) {
        alert("⚠️ Error: El PIN Gerencial debe ser estrictamente un código numérico de 4 dígitos.");
        return;
    }

    const payload = {
        nombreLocal: document.getElementById('cfg-nombre-local').value,
        cedulaJuridica: document.getElementById('cfg-cedula-fiscal').value,
        ivaPorcentaje: Number(document.getElementById('cfg-impuesto').value),
        limiteEsperaCocina: Number(document.getElementById('cfg-limite-espera').value),
        toleranciaRetrasoPersonal: Number(document.getElementById('cfg-tolerancia-retraso').value),
        impresoraActiva: document.getElementById('cfg-impresora').value
    };
    if (pinVal) payload.pin = pinVal;

    try {
        const resp = await fetch('/api/configuracion', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Error al guardar');
        }
        alert("✨ ¡Configuración guardada con éxito! Los parámetros de la sucursal han sido actualizados.");
        document.getElementById('cfg-pin-seguridad').value = "";
    } catch (error) {
        console.error('No se pudo guardar la configuración:', error);
        alert("⚠️ No se pudo guardar la configuración: " + error.message);
    }
}

function togglePinVisibilidad() {
    const pinInput = document.getElementById('cfg-pin-seguridad');
    const eyeIcon = document.getElementById('pin-eye-icon');

    if (pinInput.type === "password") {
        pinInput.type = "text";
        eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        pinInput.type = "password";
        eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarConfiguracion();
    if (typeof iluminarMenuActivo === 'function') iluminarMenuActivo();
});
