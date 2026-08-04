// tests/personal.test.js
const db = require('../db');

jest.mock('../db', () => ({
  leerColeccion: jest.fn(),
  escribirColeccion: jest.fn(),
  generarId: jest.fn(),
  generarIdNumerico: jest.fn()
}));

// Mock de planilla
jest.mock('../planilla', () => ({
  calcularPlanillaIndividual: jest.fn((bruto) => ({
    salarioBruto: bruto,
    totalDeducciones: Math.round(bruto * 0.1067),
    salarioNeto: Math.round(bruto * 0.8933),
    totalCargasPatronales: Math.round(bruto * 0.3266),
    costoTotalEmpresa: Math.round(bruto * 1.3266)
  })),
  calcularPlanillaGeneral: jest.fn((empleados) => ({
    detalle: empleados.map(e => ({
      empleadoId: e.id,
      nombre: e.nombre,
      salarioBruto: e.salarioBruto,
      salarioNeto: Math.round(e.salarioBruto * 0.8933)
    })),
    totales: {
      totalBruto: empleados.reduce((a, e) => a + e.salarioBruto, 0),
      totalNeto: empleados.reduce((a, e) => a + Math.round(e.salarioBruto * 0.8933), 0)
    }
  }))
}));

const crearRouterPersonal = require('../routes/personal');

function crearMockReqRes(body = {}, params = {}, query = {}) {
  const req = { body, params, query };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return { req, res };
}

function obtenerHandler(router, path, method) {
  const layer = router.stack.find(
    r => r.route?.path === path && r.route.methods[method]
  );
  return layer?.route?.stack[0]?.handle;
}

describe('Rutas de Personal', () => {
  let router;
  let ioMock;

  beforeEach(() => {
    jest.clearAllMocks();
    ioMock = { emit: jest.fn() };
    router = crearRouterPersonal(ioMock);
  });

  // ------------------------------------------------------------------
  // GET /
  // ------------------------------------------------------------------
  describe('GET /api/personal', () => {
    it('debe devolver la lista de empleados', () => {
      const empleados = [
        { id_personal: 1, nombre: 'Emanuel López', puesto: 'Administrador', salarioBruto: 650000 }
      ];
      db.leerColeccion.mockReturnValue(empleados);

      const { req, res } = crearMockReqRes();
      obtenerHandler(router, '/', 'get')(req, res);

      expect(res.body).toEqual(empleados);
    });
  });

  // ------------------------------------------------------------------
  // POST /
  // ------------------------------------------------------------------
  describe('POST /api/personal', () => {
    it('debe crear un empleado nuevo', () => {
      db.leerColeccion.mockReturnValue([]);
      db.generarIdNumerico.mockReturnValue(7);

      const { req, res } = crearMockReqRes({
        nombre: 'Nuevo Empleado',
        puesto: 'Cajero',
        salarioBruto: 380000,
        turno: 'Mañana'
      });

      obtenerHandler(router, '/', 'post')(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.nombre).toBe('Nuevo Empleado');
      expect(res.body.id_personal).toBe(7);
      expect(ioMock.emit).toHaveBeenCalledWith('cambio_personal', expect.objectContaining({ tipo: 'nuevo' }));
    });

    it('debe rechazar si faltan nombre o puesto', () => {
      const { req, res } = crearMockReqRes({ nombre: 'Solo nombre' });
      obtenerHandler(router, '/', 'post')(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  // DELETE /
  // ------------------------------------------------------------------
  describe('DELETE /api/personal', () => {
    it('debe eliminar un empleado existente', () => {
      db.leerColeccion.mockReturnValue([
        { id_personal: 1, nombre: 'Emanuel' }
      ]);

      const { req, res } = crearMockReqRes({ id_personal: 1 });
      obtenerHandler(router, '/', 'delete')(req, res);

      expect(res.body.status).toBe('success');
      expect(ioMock.emit).toHaveBeenCalledWith('cambio_personal', expect.objectContaining({ tipo: 'eliminado' }));
    });

    it('debe rechazar si no se envía id_personal', () => {
      const { req, res } = crearMockReqRes({}); // sin id_personal
      obtenerHandler(router, '/', 'delete')(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.error).toMatch(/id_personal/i);
    });

    it('debe devolver 404 si no existe', () => {
      db.leerColeccion.mockReturnValue([]);
      const { req, res } = crearMockReqRes({ id_personal: 99 });
      obtenerHandler(router, '/', 'delete')(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ------------------------------------------------------------------
  // POST /marcar
  // ------------------------------------------------------------------
  describe('POST /api/personal/marcar', () => {
    it('debe marcar entrada correctamente', () => {
      const empleados = [
        { id_personal: 1, nombre: 'Valeria', estado: 'Fuera de turno' }
      ];
      db.leerColeccion
        .mockReturnValueOnce(empleados)
        .mockReturnValueOnce([]);

      db.generarId.mockReturnValue('asis-1');

      const { req, res } = crearMockReqRes({ id_personal: 1, tipo: 'entrada' });
      obtenerHandler(router, '/marcar', 'post')(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.empleado.estado).toBe('Presente');
      expect(ioMock.emit).toHaveBeenCalledWith('cambio_personal', expect.objectContaining({ tipo: 'marcado' }));
    });

    it('debe rechazar tipo inválido', () => {
      const { req, res } = crearMockReqRes({ id_personal: 1, tipo: 'otro' });
      obtenerHandler(router, '/marcar', 'post')(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  // POST /falta
  // ------------------------------------------------------------------
  describe('POST /api/personal/falta', () => {
    it('debe registrar una falta', () => {
      const empleados = [
        { id_personal: 2, nombre: 'Anthony', faltas: 1, estado: 'Presente' }
      ];
      db.leerColeccion
        .mockReturnValueOnce(empleados)
        .mockReturnValueOnce([]);

      db.generarId.mockReturnValue('asis-2');

      const { req, res } = crearMockReqRes({ id_personal: 2 });
      obtenerHandler(router, '/falta', 'post')(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.empleado.faltas).toBe(2);
      expect(res.body.empleado.estado).toBe('Falta');
    });
  });

  // ------------------------------------------------------------------
  // GET /asistencia
  // ------------------------------------------------------------------
  describe('GET /api/personal/asistencia', () => {
    it('debe devolver todos los registros si no se envía mes', () => {
      const registros = [
        { id: 'asis-1', id_personal: 1, fecha: '2026-07-15', tipo: 'entrada' },
        { id: 'asis-2', id_personal: 2, fecha: '2026-08-01', tipo: 'falta' }
      ];
      db.leerColeccion.mockReturnValue(registros);

      const { req, res } = crearMockReqRes({}, {}, {}); // query vacío
      obtenerHandler(router, '/asistencia', 'get')(req, res);

      expect(res.body).toHaveLength(2);
    });

    it('debe filtrar por mes cuando se envía ?mes=', () => {
      const registros = [
        { id: 'asis-1', id_personal: 1, fecha: '2026-07-15', tipo: 'entrada' },
        { id: 'asis-2', id_personal: 2, fecha: '2026-08-01', tipo: 'falta' }
      ];
      db.leerColeccion.mockReturnValue(registros);

      const { req, res } = crearMockReqRes({}, {}, { mes: '2026-07' });
      obtenerHandler(router, '/asistencia', 'get')(req, res);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].fecha).toBe('2026-07-15');
    });
  });

  // ------------------------------------------------------------------
  // GET /planilla
  // ------------------------------------------------------------------
  describe('GET /api/personal/planilla', () => {
    it('debe devolver el cálculo de planilla general', () => {
      db.leerColeccion.mockReturnValue([
        { id_personal: 1, nombre: 'Emanuel', puesto: 'Admin', salarioBruto: 650000 }
      ]);

      const { req, res } = crearMockReqRes();
      obtenerHandler(router, '/planilla', 'get')(req, res);

      expect(res.body.detalle).toBeDefined();
      expect(res.body.totales).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // GET /planilla/:id_personal
  // ------------------------------------------------------------------
  describe('GET /api/personal/planilla/:id_personal', () => {
    it('debe devolver planilla individual', () => {
      db.leerColeccion.mockReturnValue([
        { id_personal: 1, nombre: 'Emanuel', salarioBruto: 650000 }
      ]);

      const { req, res } = crearMockReqRes({}, { id_personal: '1' });
      obtenerHandler(router, '/planilla/:id_personal', 'get')(req, res);

      expect(res.body.empleado).toBe('Emanuel');
      expect(res.body.salarioBruto).toBe(650000);
    });

    it('debe devolver 404 si el empleado no existe', () => {
      db.leerColeccion.mockReturnValue([]);
      const { req, res } = crearMockReqRes({}, { id_personal: '99' });
      obtenerHandler(router, '/planilla/:id_personal', 'get')(req, res);

      expect(res.statusCode).toBe(404);
    });
  });
});
