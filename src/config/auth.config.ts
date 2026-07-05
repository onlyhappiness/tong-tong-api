export default () => ({
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS) || 100,
  cookieName: 'tong_tong_session_token',
});
