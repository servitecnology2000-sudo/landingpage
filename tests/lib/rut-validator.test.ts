import { describe, it, expect } from 'vitest';
import { cleanRut, validateRut, formatRut, normalizePhone, getWhatsAppUrl } from '../../src/lib/rut';

describe('Pruebas Unitarias de Validación y Formateo (src/lib/rut.ts)', () => {
  describe('cleanRut()', () => {
    it('debe limpiar puntos, guiones y espacios y pasar la letra k a mayúscula', () => {
      expect(cleanRut(' 12.345.678-k ')).toBe('12345678K');
      expect(cleanRut('27.498.484-8')).toBe('274984848');
    });

    it('debe manejar entradas vacías o inválidas', () => {
      expect(cleanRut('')).toBe('');
      expect(cleanRut(null as any)).toBe('');
    });
  });

  describe('validateRut()', () => {
    it('debe validar correctamente RUTs chilenos reales con dígito numérico', () => {
      expect(validateRut('11.111.111-1')).toBe(true);
      expect(validateRut('27.498.484-8')).toBe(true);
      expect(validateRut('27.718.842-2')).toBe(true);
    });

    it('debe validar correctamente RUTs con dígito verificador K', () => {
      expect(validateRut('10.000.013-k')).toBe(true);
      expect(validateRut('10.000.013-K')).toBe(true);
    });

    it('debe rechazar RUTs con dígito verificador erróneo', () => {
      expect(validateRut('11.111.111-2')).toBe(false);
      expect(validateRut('27.498.484-9')).toBe(false);
      expect(validateRut('12.345.678-0')).toBe(false);
    });

    it('debe rechazar RUTs demasiado cortos o cadenas vacías', () => {
      expect(validateRut('123')).toBe(false);
      expect(validateRut('')).toBe(false);
      expect(validateRut('0000000-0')).toBe(false);
    });
  });

  describe('formatRut()', () => {
    it('debe formatear números planos a formato con puntos y guion', () => {
      expect(formatRut('111111111')).toBe('11.111.111-1');
      expect(formatRut('274984848')).toBe('27.498.484-8');
      expect(formatRut('14141414k')).toBe('14.141.414-K');
    });
  });

  describe('normalizePhone() & getWhatsAppUrl()', () => {
    it('debe normalizar números nacionales a formato internacional 569...', () => {
      expect(normalizePhone('933264994')).toBe('56933264994');
      expect(normalizePhone('+56 9 3326 4994')).toBe('56933264994');
    });

    it('debe generar URL válida para WhatsApp Web con texto codificado', () => {
      const url = getWhatsAppUrl('933264994', 'Hola Angel');
      expect(url).toBe('https://wa.me/56933264994?text=Hola%20Angel');
    });
  });
});
