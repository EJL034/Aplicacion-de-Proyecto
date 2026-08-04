// planilla.js
// -----------------------------------------------------------------------------
// Lógica de cálculo de planilla y cargas sociales (CCSS) para Costa Rica.
// Los porcentajes son los vigentes de forma aproximada para el régimen de
// trabajador asalariado; si la legislación cambia, solo hay que actualizar
// PORCENTAJES aquí y todo el sistema queda al día.
// -----------------------------------------------------------------------------

const PORCENTAJES = {
    // Deducciones que se le rebajan al colaborador (cuota obrera)
    obrera: {
        seguroEnfermedadMaternidad: 0.0550,
        invalidezVejezMuerte: 0.0417,
        bancoPopular: 0.0100
    },
    // Cargas que asume la empresa además del salario (cuota patronal)
    patronal: {
        seguroEnfermedadMaternidad: 0.0925,
        invalidezVejezMuerte: 0.0525,
        bancoPopular: 0.0050,
        asignacionesFamiliares: 0.0500,
        imas: 0.0050,
        infocoop: 0.0050,
        aguinaldoProvision: 0.0833, // 1/12 del salario, provisión mensual
        cesantiaProvision: 0.0333
    }
};

function sumarPorcentajes(objeto) {
    return Object.values(objeto).reduce((acc, v) => acc + v, 0);
}

const PORCENTAJE_OBRERO_TOTAL = sumarPorcentajes(PORCENTAJES.obrera);
const PORCENTAJE_PATRONAL_TOTAL = sumarPorcentajes(PORCENTAJES.patronal);

/**
 * Calcula el desglose de planilla para UN salario bruto mensual.
 * @param {number} salarioBruto
 * @returns {object} desglose con deducciones, cargas patronales, neto y costo total para la empresa
 */
function calcularPlanillaIndividual(salarioBruto) {
    const bruto = Number(salarioBruto) || 0;

    const deducciones = {};
    let totalDeducciones = 0;
    for (const [clave, pct] of Object.entries(PORCENTAJES.obrera)) {
        deducciones[clave] = Math.round(bruto * pct);
        totalDeducciones += deducciones[clave];
    }

    const cargasPatronales = {};
    let totalPatronal = 0;
    for (const [clave, pct] of Object.entries(PORCENTAJES.patronal)) {
        cargasPatronales[clave] = Math.round(bruto * pct);
        totalPatronal += cargasPatronales[clave];
    }

    const salarioNeto = bruto - totalDeducciones;
    const costoTotalEmpresa = bruto + totalPatronal;

    return {
        salarioBruto: bruto,
        deducciones,
        totalDeducciones,
        salarioNeto,
        cargasPatronales,
        totalCargasPatronales: totalPatronal,
        costoTotalEmpresa,
        porcentajeObreroTotal: Number((PORCENTAJE_OBRERO_TOTAL * 100).toFixed(2)),
        porcentajePatronalTotal: Number((PORCENTAJE_PATRONAL_TOTAL * 100).toFixed(2))
    };
}

/**
 * Calcula la planilla completa para un arreglo de empleados.
 */
function calcularPlanillaGeneral(empleados) {
    const detalle = empleados.map(emp => ({
        empleadoId: emp.id,
        nombre: emp.nombre,
        puesto: emp.puesto,
        ...calcularPlanillaIndividual(emp.salarioBruto || 0)
    }));

    const totales = detalle.reduce((acc, item) => {
        acc.totalBruto += item.salarioBruto;
        acc.totalNeto += item.salarioNeto;
        acc.totalDeducciones += item.totalDeducciones;
        acc.totalCargasPatronales += item.totalCargasPatronales;
        acc.totalCostoEmpresa += item.costoTotalEmpresa;
        return acc;
    }, { totalBruto: 0, totalNeto: 0, totalDeducciones: 0, totalCargasPatronales: 0, totalCostoEmpresa: 0 });

    return { detalle, totales };
}

module.exports = { calcularPlanillaIndividual, calcularPlanillaGeneral, PORCENTAJES };
