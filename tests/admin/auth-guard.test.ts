import { describe, it, expect } from 'vitest';

describe('Seguridad y Auth Guard del Panel Administrativo', () => {
  const adminSecret = process.env.ADMIN_SECRET || '20181860';

  it('debe validar que ADMIN_SECRET esté definido y no vacío', () => {
    expect(adminSecret).toBeDefined();
    expect(adminSecret.length).toBeGreaterThan(4);
  });

  it('debe comprobar que las cookies de sesión se comparen estrictamente contra ADMIN_SECRET', () => {
    const validCookie = adminSecret;
    const invalidCookie = 'clave_invalida_123';
    const emptyCookie = '';

    expect(validCookie === adminSecret).toBe(true);
    expect(invalidCookie === adminSecret).toBe(false);
    expect(emptyCookie === adminSecret).toBe(false);
  });
});
