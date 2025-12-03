import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';
import { DataSource } from 'typeorm';

import { AppDataSource } from 'src/database/typeorm/core/core.datasource';

@Command({
  name: 'clean-corrupt-person-data',
  description: 'Clean corrupt person data (firstName or lastName null)',
})
export class CleanCorruptPersonDataCommand extends CommandRunner {
  private readonly logger = new Logger(CleanCorruptPersonDataCommand.name);

  constructor() {
    super();
  }

  async run(): Promise<void> {
    this.logger.log('🧹 Iniciando limpieza de datos corruptos en tabla person...');

    const dataSource: DataSource = await AppDataSource.initialize();

    try {
      // Paso 1: Verificar registros con problemas
      const countResult = await dataSource.query(`
        SELECT COUNT(*) as count
        FROM person
        WHERE "name"->>'firstName' IS NULL
           OR "name"->>'lastName' IS NULL
           OR "name"->>'firstName' = ''
           OR "name"->>'lastName' = ''
      `);

      const count = parseInt(countResult[0].count);
      this.logger.log(`\n📊 Registros con problemas encontrados: ${count}`);

      if (count === 0) {
        this.logger.log('✅ No hay registros corruptos. La base de datos está limpia.');
        await dataSource.destroy();
        process.exit(0);
      }

      // Paso 2: Ver algunos registros (opcional)
      const sampleResult = await dataSource.query(`
        SELECT id, "name", email, "createdAt"
        FROM person
        WHERE "name"->>'firstName' IS NULL
           OR "name"->>'lastName' IS NULL
           OR "name"->>'firstName' = ''
           OR "name"->>'lastName' = ''
        LIMIT 5
      `);

      this.logger.log('\n📋 Ejemplos de registros con problemas:');
      sampleResult.forEach((row: any, index: number) => {
        this.logger.log(
          `  ${index + 1}. ID: ${row.id}, Name: ${JSON.stringify(row.name)}, Email: ${row.email || 'N/A'}`,
        );
      });

      // Paso 3: Limpiar los datos
      this.logger.log('\n🧹 Limpiando datos corruptos...');

      const updateResult = await dataSource.query(`
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

      this.logger.log(`✅ ${updateResult[1]} registros actualizados`);

      // Paso 4: Verificar que se limpiaron
      const verifyResult = await dataSource.query(`
        SELECT COUNT(*) as count
        FROM person 
        WHERE "name"->>'firstName' IS NULL 
           OR "name"->>'lastName' IS NULL
           OR "name"->>'firstName' = ''
           OR "name"->>'lastName' = ''
      `);

      const remaining = parseInt(verifyResult[0].count);

      if (remaining === 0) {
        this.logger.log(
          '\n✅ ¡Limpieza completada exitosamente! No quedan registros corruptos.',
        );
      } else {
        this.logger.warn(`\n⚠️  Aún quedan ${remaining} registros con problemas.`);
      }

      await dataSource.destroy();
    } catch (error: any) {
      this.logger.error('❌ Error:', error.message);
      this.logger.error(error);
      await dataSource.destroy();
      throw error;
    }
  }
}

