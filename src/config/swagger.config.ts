export default () => ({
  docName: `${process.env.APP_NAME} API Documentation`,
  docDesc: `${process.env.APP_NAME} API Service`,
  docVersion: process.env.SWAGGER_DOC_VERSION,
  docPrefix: process.env.SWAGGER_DOC_PREFIX,
});
