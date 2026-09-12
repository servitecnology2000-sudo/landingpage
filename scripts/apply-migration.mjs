import fs from 'fs';
import path from 'path';

const projectRef = process.env.SUPABASE_PROJECT_ID || 'mivsnmvupahgbrjfdyhl';

let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const match = envContent.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m);
  if (match) {
    token = match[1].trim();
  }
}

if (!token) {
  console.error('Error: SUPABASE_ACCESS_TOKEN no está definido en el entorno ni en .env');
  process.exit(1);
}

async function applyMigration(sqlFilePath) {
  const fullPath = path.resolve(sqlFilePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: Archivo no encontrado en ${fullPath}`);
    process.exit(1);
  }

  const query = fs.readFileSync(fullPath, 'utf8');
  console.log(`Aplicando migración: ${path.basename(fullPath)} a proyecto ${projectRef}...`);

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Error de Supabase Management API (${res.status}):`, errText);
      process.exit(1);
    }

    const result = await res.json();
    console.log('✅ Migración aplicada exitosamente en Supabase:');
    console.log(result);
  } catch (err) {
    console.error('Excepción al aplicar migración:', err);
    process.exit(1);
  }
}

const fileArg = process.argv[2] || 'supabase/migrations/20260912_orders_logistics.sql';
applyMigration(fileArg);
