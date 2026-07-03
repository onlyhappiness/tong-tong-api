import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';

export const setupSwagger = (app: INestApplication) => {
  const configService = app.get(ConfigService);
  const logger = new Logger();

  const docName: string = configService.getOrThrow<string>('swagger.docName');
  const docDesc: string = configService.getOrThrow<string>('swagger.docDesc');
  const docVersion: string =
    configService.getOrThrow<string>('swagger.docVersion');
  const docPrefix: string =
    configService.getOrThrow<string>('swagger.docPrefix');

  const documentBuild = new DocumentBuilder()
    .setTitle(docName)
    .setDescription(docDesc)
    .setVersion(docVersion)
    .build();

  const document = SwaggerModule.createDocument(app, documentBuild, {
    deepScanRoutes: true,
  });
  const customOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      docExpansion: 'none',
      persistAuthorization: true,
      displayOperationId: true,
      operationsSorter: 'method',
      tagsSorter: 'alpha',
      tryItOutEnabled: true,
      filter: true,
    },
  };
  SwaggerModule.setup(docPrefix, app, document, {
    explorer: true,
    customSiteTitle: docName,
    ...customOptions,
  });

  logger.log(`Swagger UI is running on ${docPrefix}`);
};
