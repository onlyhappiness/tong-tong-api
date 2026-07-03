import appConfig from './app.config';
import swaggerConfig from './swagger.config';

export default () => ({
  app: appConfig(),
  swagger: swaggerConfig(),
});
