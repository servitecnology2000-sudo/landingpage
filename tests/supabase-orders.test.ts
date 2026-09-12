import { describe, it, expect } from 'vitest';
import { supabaseAdmin } from '../src/lib/supabase';

describe('Verificación de Conexión y Esquema de Supabase', () => {
  it('debe conectar con Supabase y consultar la tabla orders con soporte logístico', async () => {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      expect(columns).toContain('tracking_number');
      expect(columns).toContain('courier');
      expect(columns).toContain('shipped_at');
      expect(columns).toContain('ready_pickup_at');
      expect(columns).toContain('admin_notes');
      expect(columns).toContain('invoice_folio');
      expect(columns).toContain('invoice_url');
      expect(columns).toContain('delivered_at');
    }
  });
});
