import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SuccessInterceptor } from './common/interceptors/success.interceptor';
import { setupSwagger } from './swagger';

// webpack HMR이 주입하는 전역. @types가 없어 직접 선언한다.
// any로 두면 아래 module.hot 접근 3곳이 전부 타입 검사를 빠져나간다.
declare const module: {
  hot?: {
    accept(): void;
    dispose(callback: () => void): void;
  };
};

async function bootstrap() {
  // const app = await NestFactory.create<NestFastifyApplication>(
  //   AppModule,
  //   new FastifyAdapter({ logger: true }),
  // );
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('app.port');
  const env = configService.getOrThrow<string>('app.env');

  app.use(cookieParser());

  /** CORS */
  app.enableCors({
    origin: true,
    credentials: true,
  });

  /** Security */
  app.use(
    helmet({
      // Swagger UI가 인라인 스크립트·스타일을 쓰므로 기본 CSP에 막힌다.
      // 문서는 비프로덕션에서만 뜨므로(아래 setupSwagger) 그때만 끈다.
      // 프로덕션은 helmet 기본값(default-src 'self')을 그대로 쓴다 — JSON만
      // 내려주는 API라 제약이 걸릴 대상이 없다.
      contentSecurityPolicy: env === 'production' ? undefined : false,

      // 기본값 same-origin이면 다른 오리진(Expo 웹 개발 서버 등)에서 응답을
      // 못 읽는다. 이 API는 애초에 교차 오리진 호출을 전제로 CORS를 열어뒀다.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

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
  if (env !== 'production') {
    setupSwagger(app);
  }

  /** Graceful Shutdown */
  // 이것만으로 충분하다. enableShutdownHooks()가 SIGTERM·SIGINT를 직접 듣고
  // app.close()를 부른다. 여기에 process.on('SIGTERM', () => app.close())를
  // 더하면 close가 두 번 돌아 TypeORM이 "Called end on pool more than once"를 던진다.
  app.enableShutdownHooks();

  /** Start server */
  await app.listen(port);

  console.log(`Server is running on port ${port}`);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => void app.close());
  }
}

bootstrap().catch((err) => {
  console.error('error', err);
  process.exit(1);
});
