import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as expressBasicAuth from 'express-basic-auth';
import { AppModule } from './app.module';
import { HttpExceptionFilter, SuccessInterceptor } from './common';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // TODO: setUpGlobalMiddleware
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new SuccessInterceptor());

  app.use(
    ['/api', '/api-json'],
    expressBasicAuth({
      challenge: true,
      users: {
        [process.env.SWAGGER_USER]: process.env.SWAGGER_PASSWORD,
      },
    }),
  );

  // TODO: setUpOpenAPIMiddleware
  const documentBuilder = new DocumentBuilder()
    .setTitle('API 문서')
    .setDescription('통통 다마고치 API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, documentBuilder);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      apisSorter: 'alpha',
      operationsSorter: 'method',
    },
  });

  const port = process.env.PORT || 3000;

  await app
    .listen(port)
    .then(() => {
      console.log(
        `✅ Server on http://localhost:${port}\nstartDate: ${new Date().toISOString()}`,
      );
    })
    .catch((error) => {
      console.error(`🆘 Server error ${error}`);
    });

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
