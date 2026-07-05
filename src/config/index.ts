import appConfig from './app.config';
import authConfig from './auth.config';
import databaseConfig from './database.config';
import swaggerConfig from './swagger.config';

export default () => ({
  app: appConfig(),
  auth: authConfig(),
  swagger: swaggerConfig(),
  database: databaseConfig(),
});
