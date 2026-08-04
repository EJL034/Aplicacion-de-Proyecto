// tests/cocina.test.js
const db = require('../db');

jest.mock('../db', () => ({
  leerColeccion: jest.fn(),
  escribirColeccion: jest.fn(),
  generarId: jest.fn()
}));

const crearRouterCocina = require('../routes/cocina');

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

function obtenerHandler(router, path, method) {
  const layer = router.stack.find(
    r => r.route?.path === path && r.route.methods[method]
  );
  return layer?.route?.stack[0]?.handle;
}

describe('Rutas de Cocina', () => {
  let router;
  let ioMock;

  beforeEach(() => {
    jest.clearAllMocks();
    ioMock = { emit: jest.fn() };
    router = crearRouterCocina(ioMock);
  });

  // ------------------------------------------------------------------
  // POST /actualizar
  // ------------------------------------------------------------------
  describe('POST /api/cocina/actualizar', () => {
    it('debe actualizar el estado de un ticket', () => {
      const tickets = [
        { id: '105', estado: 'espera' }
      ];
      db.leerColeccion.mockReturnValue(tickets);

      const { req, res } = crearMockReqRes({ idOrden: '105', estado: 'proceso' });
      obtenerHandler(router, '/actualizar', 'post')(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.ticket.estado).toBe('proceso');
      expect(ioMock.emit).toHaveBeenCalledWith('cambio_cocina', {
        idOrden: '105',
        estado: 'proceso'
      });
    });

    it('debe rechazar si faltan datos', () => {
      const { req, res } = crearMockReqRes({ idOrden: '105' });
      obtenerHandler(router, '/actualizar', 'post')(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('debe devolver 404 si el ticket no existe', () => {
      db.leerColeccion.mockReturnValue([]);
      const { req, res } = crearMockReqRes({ idOrden: '999', estado: 'listo' });
      obtenerHandler(router, '/actualizar', 'post')(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ------------------------------------------------------------------
  // DELETE /:id
  // ------------------------------------------------------------------
  describe('DELETE /api/cocina/:id', () => {
    it('debe despachar un ticket y moverlo al historial', () => {
      const tickets = [
        { id: '105', items: ['2x Pollo Grande'], tiempo: 5, estado: 'listo' }
      ];
      db.leerColeccion
        .mockReturnValueOnce(tickets)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      db.generarId.mockReturnValue('v-test');

      const { req, res } = crearMockReqRes({}, { id: '105' });
      obtenerHandler(router, '/:id', 'delete')(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.registrado).toBe(true);
      expect(ioMock.emit).toHaveBeenCalledWith('ticket_despachado', { idOrden: '105' });
    });

    it('debe responder success aunque el ticket no exista', () => {
      db.leerColeccion.mockReturnValue([]);
      const { req, res } = crearMockReqRes({}, { id: '999' });
      obtenerHandler(router, '/:id', 'delete')(req, res);

      expect(res.body.registrado).toBe(false);
    });
  });
});
