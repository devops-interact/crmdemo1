// Script para limpiar datos corruptos en la tabla person
// Ejecutar con: railway run --service server sh -c "cd /app && node scripts/clean-corrupt-person-data.js"

const { Client } = require('pg');

async function cleanCorruptPersonData() {
  // Debug: mostrar variables de entorno disponibles
  console.log('🔍 Verificando variables de entorno...');
  console.log('PG_DATABASE_URL existe:', !!process.env.PG_DATABASE_URL);

  if (!process.env.PG_DATABASE_URL) {
    console.error('❌ PG_DATABASE_URL no está disponible');
    console.error('Variables disponibles:', Object.keys(process.env).filter(k => k.includes('PG') || k.includes('DATABASE')));
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.PG_DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Paso 1: Verificar registros con problemas
    const countResult = await client.query(`
      SELECT COUNT(*) as count
      FROM person
      WHERE "name"->>'firstName' IS NULL
         OR "name"->>'lastName' IS NULL
         OR "name"->>'firstName' = ''
         OR "name"->>'lastName' = ''
    `);

    const count = parseInt(countResult.rows[0].count);
    console.log(`\n📊 Registros con problemas encontrados: ${count}`);

    if (count === 0) {
      console.log('✅ No hay registros corruptos. La base de datos está limpia.');
      await client.end();
      process.exit(0);
    }

    // Paso 2: Ver algunos registros (opcional)
    const sampleResult = await client.query(`
      SELECT id, "name", email, "createdAt"
      FROM person
      WHERE "name"->>'firstName' IS NULL
         OR "name"->>'lastName' IS NULL
         OR "name"->>'firstName' = ''
         OR "name"->>'lastName' = ''
      LIMIT 5
    `);

    console.log('\n📋 Ejemplos de registros con problemas:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ID: ${row.id}, Name: ${JSON.stringify(row.name)}, Email: ${row.email || 'N/A'}`);
    });

    // Paso 3: Limpiar los datos
    console.log('\n🧹 Limpiando datos corruptos...');

    const updateResult = await client.query(`
      UPDATE person
      SET "name" = jsonb_set(
        jsonb_set(
          COALESCE("name", '{}'::jsonb),
          '{firstName}',
          COALESCE(
            CASE
              WHEN "name"->>'firstName' IS NULL OR "name"->>'firstName' = ''
              THEN '"Sin nombre"'::jsonb
              ELSE to_jsonb("name"->>'firstName')
            END,
            '"Sin nombre"'::jsonb
          )
        ),
        '{lastName}',
        COALESCE(
          CASE
            WHEN "name"->>'lastName' IS NULL OR "name"->>'lastName' = ''
            THEN '"Sin apellido"'::jsonb
            ELSE to_jsonb("name"->>'lastName')
          END,
          '"Sin apellido"'::jsonb
        )
      )
      WHERE "name"->>'firstName' IS NULL
         OR "name"->>'lastName' IS NULL
         OR "name"->>'firstName' = ''
         OR "name"->>'lastName' = ''
    `);

    console.log(`✅ ${updateResult.rowCount} registros actualizados`);

    // Paso 4: Verificar que se limpiaron
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count
      FROM person
      WHERE "name"->>'firstName' IS NULL
         OR "name"->>'lastName' IS NULL
         OR "name"->>'firstName' = ''
         OR "name"->>'lastName' = ''
    `);

    const remaining = parseInt(verifyResult.rows[0].count);

    if (remaining === 0) {
      console.log('\n✅ ¡Limpieza completada exitosamente! No quedan registros corruptos.');
    } else {
      console.log(`\n⚠️  Aún quedan ${remaining} registros con problemas.`);
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

cleanCorruptPersonData();

