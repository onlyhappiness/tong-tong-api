import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SuccessInterceptor } from './common/interceptors/success.interceptor';

declare const module: any;

async function bootstrap() {
  // const app = await NestFactory.create<NestFastifyApplication>(
  //   AppModule,
  //   new FastifyAdapter({ logger: true }),
  // );
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const env = configService.getOrThrow<string>('app.env');
  const port = configService.getOrThrow<number>('app.port');

  /** CORS */
  app.enableCors({
    origin: true,
    credentials: true,
  });

  /** Security */
  // app.use(
  //   helmet({
  //     contentSecurityPolicy: env === 'production' ? undefined : false,
  //     crossOriginResourcePolicy: false,
  //   }),
  // );

  /** Validation */
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  /** Global Interceptors and Filters */
  app.useGlobalInterceptors(new SuccessInterceptor());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger for development
  // if (env !== 'production') {
  //   setupSwagger(app);
  // }

  /** Gracefull Shutdown */
  app.enableShutdownHooks();
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    app.close();
  });
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    app.close();
  });

  /** Start server */
  await app.listen(port);

  console.log(`Server is running on port ${port}`);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap().catch((err) => {
  console.error('error', err);
  process.exit(1);
});
