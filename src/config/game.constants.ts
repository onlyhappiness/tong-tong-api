export const TOTAL_HOURS = 72;
export const PETTING_COOLDOWN_HOURS = 1;

export const HUNGER_DECAY_PER_HOUR = 10;
export const HUNGER_MAX = 100;
export const INTIMACY_MAX = 100;
export const FOOD_PRICE = 30;
export const FOOD_RECOVERY = 40;

export const PET_CAP = 3;

export const TOTAL_MS = TOTAL_HOURS * 3_600_000;
export const PETTING_COOLDOWN_MS = PETTING_COOLDOWN_HOURS * 3_600_000;

export const ATTENDANCE_REWARD = 200;
export const PETTING_REWARD = 20;

export const PETTING_DAILY_CAP = 3; // 펫당 — 넘기면 400

// 진화 판정 — 육성 3일간의 쓰다듬기 총합(0~9) 한 축으로 가른다.
export const POODLE_MIN_PETTING = 6; // 이 이상이면 푸들
export const CAT_MAX_PETTING = 1; // 이하면 고양이. 사이는 거북이
export const INTIMACY_PER_PETTING = 5; // 쓰다듬기 1회당 친밀도
