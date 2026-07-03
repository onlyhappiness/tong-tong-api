export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 8000,
});
