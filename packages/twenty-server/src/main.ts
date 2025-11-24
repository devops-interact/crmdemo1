import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';

import fs from 'fs';

import bytes from 'bytes';
import { useContainer } from 'class-validator';
import session from 'express-session';
import { graphqlUploadExpress } from 'graphql-upload';

import { NodeEnvironment } from 'src/engine/core-modules/twenty-config/interfaces/node-environment.interface';

import { LoggerService } from 'src/engine/core-modules/logger/logger.service';
import { getSessionStorageOptions } from 'src/engine/core-modules/session-storage/session-storage.module-factory';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UnhandledExceptionFilter } from 'src/filters/unhandled-exception.filter';

import { AppModule } from './app.module';
import './instrument';

import { settings } from './engine/constants/settings';
import { generateFrontConfig } from './utils/generate-front-config';

const bootstrap = async () => {
  try {
    console.log('[BOOTSTRAP] Starting NestJS application bootstrap...');
    console.log('[BOOTSTRAP] NODE_ENV:', process.env.NODE_ENV);
    console.log('[BOOTSTRAP] NODE_PORT:', process.env.NODE_PORT);
    console.log('[BOOTSTRAP] PORT:', process.env.PORT);

    console.log('[BOOTSTRAP] Creating NestFactory with AppModule...');
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      cors: true,
      bufferLogs: process.env.LOGGER_IS_BUFFER_ENABLED === 'true',
      rawBody: true,
      snapshot: process.env.NODE_ENV === NodeEnvironment.DEVELOPMENT,
      ...(process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH
        ? {
            httpsOptions: {
              key: fs.readFileSync(process.env.SSL_KEY_PATH),
              cert: fs.readFileSync(process.env.SSL_CERT_PATH),
            },
          }
        : {}),
    });
    console.log('[BOOTSTRAP] NestFactory created successfully');

    console.log('[BOOTSTRAP] Getting LoggerService and TwentyConfigService...');
    const logger = app.get(LoggerService);
    const twentyConfigService = app.get(TwentyConfigService);
    console.log('[BOOTSTRAP] Services retrieved successfully');

    console.log('[BOOTSTRAP] Configuring session storage...');
    app.use(session(getSessionStorageOptions(twentyConfigService)));
    console.log('[BOOTSTRAP] Session storage configured');

    // Apply class-validator container so that we can use injection in validators
    console.log('[BOOTSTRAP] Configuring class-validator container...');
    useContainer(app.select(AppModule), { fallbackOnErrors: true });
    console.log('[BOOTSTRAP] Class-validator container configured');

    // Use our logger
    console.log('[BOOTSTRAP] Setting up logger...');
    app.useLogger(logger);
    console.log('[BOOTSTRAP] Logger configured');

    console.log('[BOOTSTRAP] Setting up global exception filter...');
    app.useGlobalFilters(new UnhandledExceptionFilter());
    console.log('[BOOTSTRAP] Exception filter configured');

    console.log('[BOOTSTRAP] Configuring body parsers...');
    app.useBodyParser('json', { limit: settings.storage.maxFileSize });
    app.useBodyParser('urlencoded', {
      limit: settings.storage.maxFileSize,
      extended: true,
    });
    console.log('[BOOTSTRAP] Body parsers configured');

    // Graphql file upload
    console.log('[BOOTSTRAP] Configuring GraphQL upload middleware...');
    app.use(
      '/graphql',
      graphqlUploadExpress({
        maxFieldSize: bytes(settings.storage.maxFileSize),
        maxFiles: 10,
      }),
    );

    app.use(
      '/metadata',
      graphqlUploadExpress({
        maxFieldSize: bytes(settings.storage.maxFileSize),
        maxFiles: 10,
      }),
    );
    console.log('[BOOTSTRAP] GraphQL upload middleware configured');

    // Inject the server url in the frontend page
    console.log('[BOOTSTRAP] Generating front config...');
    generateFrontConfig();
    console.log('[BOOTSTRAP] Front config generated');

    const port = twentyConfigService.get('NODE_PORT');
    console.log('[BOOTSTRAP] Starting server on port:', port);
    await app.listen(port);
    console.log('[BOOTSTRAP] Server started successfully on port:', port);
  } catch (error) {
    console.error('[BOOTSTRAP] Fatal error during startup:', error);
    console.error('[BOOTSTRAP] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION] Unhandled Rejection at:', promise);
  console.error('[UNHANDLED REJECTION] Reason:', reason);
  if (reason instanceof Error) {
    console.error('[UNHANDLED REJECTION] Stack:', reason.stack);
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION] Uncaught Exception:', error);
  console.error('[UNCAUGHT EXCEPTION] Stack:', error.stack);
  process.exit(1);
});

bootstrap();
