// tests/inventario.test.js
const db = require('../db');

// Mock completo de la capa de base de datos
jest.mock('../db', () => ({
  leerColeccion: jest.fn(),
  escribirColeccion: jest.fn(),
  generarId: jest.fn()
}));

// Importamos el router DESPUÉS del mock
const crearRouterInventario = require('../routes/inventario');

// Helper para simular request/response de Express
function crearMockReqRes(body = {}, params = {}) {
  const req = { body, params };
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

describe('Rutas de Inventario', () => {
  let router;
  let ioMock;

  beforeEach(() => {
    // Limpiamos todos los mocks antes de cada prueba
    jest.clearAllMocks();

    // Mock de Socket.io
    ioMock = {
      emit: jest.fn()
    };

    router = crearRouterInventario(ioMock);
  });

  // ------------------------------------------------------------------
  // GET /
  // ------------------------------------------------------------------
  describe('GET /api/inventario', () => {
    it('debe devolver la lista de insumos normalizados', () => {
      const insumosFake = [
        {
          id: 'inv-01',
          nombre: 'Pollo Entero',
          categoria: 'Carnes',
          actual: 15,
          minimo: 30,
          unidad: 'unds'
        }
      ];

      db.leerColeccion.mockReturnValue(insumosFake);

      const { req, res } = crearMockReqRes();
      const handler = router.stack.find(r => r.route?.path === '/' && r.route.methods.get).route.stack[0].handle;

      handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: 'inv-01',
        nombre: 'Pollo Entero',
        actual: 15,
        stock_actual: 15,
        estado: 'critico' // 15 <= 30 * 0.5
      });
    });

    it('debe devolver arreglo vacío si no hay datos', () => {
      db.leerColeccion.mockReturnValue([]);

      const { req, res } = crearMockReqRes();
      const handler = router.stack.find(r => r.route?.path === '/' && r.route.methods.get).route.stack[0].handle;

      handler(req, res);

      expect(res.body).toEqual([]);
    });
  });

  // ------------------------------------------------------------------
  // POST /
  // ------------------------------------------------------------------
  describe('POST /api/inventario', () => {
    it('debe crear un insumo nuevo correctamente', () => {
      db.leerColeccion.mockReturnValue([]);
      db.generarId.mockReturnValue('inv-99');

      const { req, res } = crearMockReqRes({
        nombre: 'Aceite Premium',
        categoria: 'Líquidos',
        actual: 40,
        minimo: 50,
        unidad: 'Litros'
      });

      const handler = router.stack.find(r => r.route?.path === '/' && r.route.methods.post).route.stack[0].handle;
      handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.insumo).toMatchObject({
        id: 'inv-99',
        nombre: 'Aceite Premium',
        actual: 40,
        minimo: 50,
        estado: 'moderado' // 40 < 50
      });

      expect(db.escribirColeccion).toHaveBeenCalledWith('inventario', expect.any(Array));
      expect(ioMock.emit).toHaveBeenCalledWith('cambio_inventario', expect.objectContaining({
        tipo: 'nuevo'
      }));
    });

    it('debe rechazar si faltan campos obligatorios', () => {
      const { req, res } = crearMockReqRes({ nombre: 'Solo nombre' });

      const handler = router.stack.find(r => r.route?.path === '/' && r.route.methods.post).route.stack[0].handle;
      handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.error).toMatch(/requeridos/i);
    });
  });

  // ------------------------------------------------------------------
  // POST /:id/ajustar
  // ------------------------------------------------------------------
  describe('POST /api/inventario/:id/ajustar', () => {
    it('debe ajustar el stock correctamente', () => {
      const insumos = [
        { id: 'inv-01', nombre: 'Pollo', actual: 15, minimo: 30, unidad: 'unds' }
      ];
      db.leerColeccion.mockReturnValue(insumos);

      const { req, res } = crearMockReqRes(
        { actual: 45 },
        { id: 'inv-01' }
      );

      const handler = router.stack.find(r => r.route?.path === '/:id/ajustar' && r.route.methods.post).route.stack[0].handle;
      handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.insumo.actual).toBe(45);
      expect(res.body.insumo.estado).toBe('optimo'); // 45 >= 30
      expect(ioMock.emit).toHaveBeenCalledWith('cambio_inventario', expect.objectContaining({
        tipo: 'ajuste'
      }));
    });

    it('debe devolver 404 si el insumo no existe', () => {
      db.leerColeccion.mockReturnValue([]);

      const { req, res } = crearMockReqRes({ actual: 10 }, { id: 'no-existe' });

      const handler = router.stack.find(r => r.route?.path === '/:id/ajustar' && r.route.methods.post).route.stack[0].handle;
      handler(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });

  // ------------------------------------------------------------------
  // POST /:id/consumir
  // ------------------------------------------------------------------
  describe('POST /api/inventario/:id/consumir', () => {
    it('debe descontar stock y actualizar consumidoHoy', () => {
      const insumos = [
        {
          id: 'inv-01',
          nombre: 'Pollo',
          actual: 20,
          minimo: 30,
          unidad: 'unds',
          consumidoHoy: 5
        }
      ];
      db.leerColeccion.mockReturnValue(insumos);

      const { req, res } = crearMockReqRes(
        { cantidad: 3 },
        { id: 'inv-01' }
      );

      const handler = router.stack.find(r => r.route?.path === '/:id/consumir' && r.route.methods.post).route.stack[0].handle;
      handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.insumo.actual).toBe(17);
      expect(res.body.insumo.consumidoHoy).toBe(8);
      expect(res.body.insumo.estado).toBe('moderado');
      expect(ioMock.emit).toHaveBeenCalledWith('cambio_inventario', expect.objectContaining({
        tipo: 'consumo'
      }));
    });

    it('no debe permitir stock negativo', () => {
      const insumos = [
        { id: 'inv-01', nombre: 'Pollo', actual: 2, minimo: 30, unidad: 'unds', consumidoHoy: 0 }
      ];
      db.leerColeccion.mockReturnValue(insumos);

      const { req, res } = crearMockReqRes({ cantidad: 10 }, { id: 'inv-01' });

      const handler = router.stack.find(r => r.route?.path === '/:id/consumir' && r.route.methods.post).route.stack[0].handle;
      handler(req, res);

      expect(res.body.insumo.actual).toBe(0); // Math.max(0, ...)
    });
  });
});
