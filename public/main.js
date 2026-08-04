function iluminarMenuActivo() {
    // 1. Obtener la URL completa en minúsculas para evitar problemas de mayúsculas/minúsculas
    const urlActual = window.location.href.toLowerCase();
    
    // 2. Capturar todos los enlaces de la barra lateral
    const enlacesMenu = document.querySelectorAll("#sidebar-nav a");

    let paginaDetectada = false;

    enlacesMenu.forEach(enlace => {
        const hrefEnlace = enlace.getAttribute("href").toLowerCase();

        // 3. Verificar si la URL actual contiene el nombre del archivo del enlace
        // Evitamos evaluar el "index.html" aquí para que no choque con las demás páginas
        if (hrefEnlace !== "index.html" && urlActual.includes(hrefEnlace)) {
            enlace.classList.remove("text-gray-400");
            enlace.classList.add("bg-active-menu", "text-white");
            paginaDetectada = true;
        }
    });

    // 4. Caso especial: Si es la página principal (index.html) o la raíz del proyecto
    if (!paginaDetectada) {
        enlacesMenu.forEach(enlace => {
            const hrefEnlace = enlace.getAttribute("href").toLowerCase();
            if (hrefEnlace === "index.html") {
                enlace.classList.remove("text-gray-400");
                enlace.classList.add("bg-active-menu", "text-white");
            }
        });
    }
}

// Asegurar la ejecución
document.addEventListener("DOMContentLoaded", iluminarMenuActivo);
// Por si las moscas con el orden de carga de scripts, lo ejecutamos de inmediato también
iluminarMenuActivo();