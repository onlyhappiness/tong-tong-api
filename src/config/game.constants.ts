export const TOTAL_HOURS = 72;
export const EVOLUTION_PERIOD_HOURS = 24; // 진화 판정용 "하루" 단위
export const TOTAL_DAYS = TOTAL_HOURS / EVOLUTION_PERIOD_HOURS; // = 3
export const EVOLUTION_MARGIN = 1;
export const EGG_HATCH_HOURS = 24;
export const PETTING_COOLDOWN_HOURS = 1;

export const HUNGER_DECAY_PER_HOUR = 10;
export const HUNGER_MAX = 100;
export const INTIMACY_MAX = 100;
export const FOOD_PRICE = 30;
export const FOOD_RECOVERY = 40;

export const COIN_PER_HOUR = 100;
export const COIN_CAP_HOURS = 8;

export const PET_CAP = 3;

export const TOTAL_MS = TOTAL_HOURS * 3_600_000;
export const EVOLUTION_PERIOD_MS = EVOLUTION_PERIOD_HOURS * 3_600_000;
export const EGG_HATCH_MS = EGG_HATCH_HOURS * 3_600_000;
export const PETTING_COOLDOWN_MS = PETTING_COOLDOWN_HOURS * 3_600_000;
