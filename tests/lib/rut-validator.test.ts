import { describe, it, expect } from 'vitest';
import { cleanRut, validateRut, formatRut, normalizePhone, getWhatsAppUrl, cleanChileanPhone, isValidChileanPhone, formatChileanPhone, isCompanyRut } from '../../src/lib/rut';

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

  describe('cleanChileanPhone() & formatChileanPhone()', () => {
    it('debe limpiar teléfonos en formato internacional o nacional sin duplicar 56', () => {
      expect(cleanChileanPhone('+56 9 1234 5678')).toBe('912345678');
      expect(cleanChileanPhone('56912345678')).toBe('912345678');
      expect(cleanChileanPhone('912345678')).toBe('912345678');
      expect(cleanChileanPhone('0912345678')).toBe('912345678');
      expect(cleanChileanPhone('0056912345678')).toBe('912345678');
    });

    it('debe limpiar progresivamente mientras el usuario escribe sin multiplicar prefijo', () => {
      expect(cleanChileanPhone('+56 9')).toBe('9');
      expect(cleanChileanPhone('+56 91')).toBe('91');
      expect(cleanChileanPhone('+56 912')).toBe('912');
      expect(cleanChileanPhone('+56 9123')).toBe('9123');
      expect(cleanChileanPhone('+56 91234')).toBe('91234');
    });

    it('debe limpiar números fijos de Santiago y regiones correctamente', () => {
      expect(cleanChileanPhone('+56 2 2123 4567')).toBe('221234567');
      expect(cleanChileanPhone('+56 32 212 3456')).toBe('322123456');
      expect(cleanChileanPhone('+56 51 212 3456')).toBe('512123456');
    });

    it('debe formatear números móviles chilenos con espaciado legible y prefijo +56', () => {
      expect(formatChileanPhone('9')).toBe('+56 9');
      expect(formatChileanPhone('91')).toBe('+56 9 1');
      expect(formatChileanPhone('91234')).toBe('+56 9 1234');
      expect(formatChileanPhone('912345')).toBe('+56 9 1234 5');
      expect(formatChileanPhone('912345678')).toBe('+56 9 1234 5678');
      expect(formatChileanPhone('+56 9 1234 5678')).toBe('+56 9 1234 5678');
    });

    it('debe validar teléfonos chilenos (celulares y fijos)', () => {
      expect(isValidChileanPhone('+56 9 1234 5678')).toBe(true);
      expect(isValidChileanPhone('912345678')).toBe(true);
      expect(isValidChileanPhone('+56 2 2123 4567')).toBe(true);
      expect(isValidChileanPhone('+56 32 212 3456')).toBe(true);

        // Inválidos
      expect(isValidChileanPhone('12345678')).toBe(false); // 8 dígitos
      expect(isValidChileanPhone('+56 1 1234 5678')).toBe(false); // inicia en 1
      expect(isValidChileanPhone('')).toBe(false);
    });
  });

  describe('isCompanyRut()', () => {
    it('debe clasificar como RUT Personal (false) a personas naturales (< 50.000.000)', () => {
      expect(isCompanyRut('11.111.111-1')).toBe(false);
      expect(isCompanyRut('12.345.678-5')).toBe(false);
      expect(isCompanyRut('27.498.484-8')).toBe(false);
      expect(isCompanyRut('18.765.432-1')).toBe(false);
    });

    it('debe clasificar como RUT Empresa (true) a personas jurídicas (>= 50.000.000)', () => {
      expect(isCompanyRut('76.452.123-K')).toBe(true);
      expect(isCompanyRut('77.123.456-7')).toBe(true);
      expect(isCompanyRut('96.987.654-3')).toBe(true);
      expect(isCompanyRut('65.123.456-7')).toBe(true);
      expect(isCompanyRut('50.000.000-K')).toBe(true);
    });

    it('debe retornar false ante entradas vacías o inválidas', () => {
      expect(isCompanyRut('')).toBe(false);
      expect(isCompanyRut('abc')).toBe(false);
      expect(isCompanyRut(null as any)).toBe(false);
    });
  });
});
