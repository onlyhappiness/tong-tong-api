import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as expressBasicAuth from 'express-basic-auth';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/exceptions/http-exceptions.filter';
import { SuccessInterceptor } from './common/interceptors/success.interceptor';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // setup Global Middleware
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new SuccessInterceptor());
  app.use(cookieParser());

  app.use(
    ['/docs', '/docs-json'],
    expressBasicAuth({
      challenge: true,
      users: {
        [process.env.SWAGGER_USER]: process.env.SWAGGER_PASSWORD,
      },
    }),
  );

  const documentBuilder = new DocumentBuilder()
    .setTitle('API 문서')
    .setDescription('통통 다마고치 API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, documentBuilder);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      apisSorter: 'alpha',
      operationsSorter: 'method',
    },
  });

  await app
    .listen(process.env.PORT ?? 3000)
    .then(() => {
      console.log(
        `✅ Server on http://localhost:${process.env.PORT}\nstartDate: ${new Date().toISOString()}`,
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
