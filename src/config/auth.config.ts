export default () => ({
  // 유휴 만료. 마지막 활동 이후 이 기간이 지나면 세션이 죽는다.
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS) || 14,

  // 절대 상한. 활동 여부와 무관하게 발급 후 이 기간이 지나면 재로그인을 요구한다.
  // 슬라이딩 갱신만 있으면 세션이 무한히 연장되므로 반드시 짝으로 둔다.
  sessionAbsoluteTtlDays: Number(process.env.SESSION_ABSOLUTE_TTL_DAYS) || 90,

  // 갱신 임계 비율. 남은 수명이 TTL의 이 비율 아래로 떨어졌을 때만 UPDATE 한다.
  // 요청마다 쓰기가 발생하는 것을 막기 위한 조절 장치.
  sessionRenewThresholdRatio: 0.5,

  cookieName: 'tong_tong_session_token',
});
