import appConfig from './app.config';
import databaseConfig from './database.config';
import swaggerConfig from './swagger.config';

export default () => ({
  app: appConfig(),
  swagger: swaggerConfig(),
  database: databaseConfig(),
});
