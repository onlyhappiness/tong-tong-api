import { Pet, PetStage, Species } from './model/pet.entity';
import { PetState } from './model/pet-state.entity';
import {
  classifySpecies,
  deriveNeglectCount,
  periodIndex,
  settlePet,
} from './pet-logic';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function makeEgg(createdAt: Date): Pet {
  const pet = new Pet();
  pet.stage = PetStage.EGG;
  pet.species = null;
  pet.hatchedAt = null;
  pet.evolvedAt = null;
  pet.releasedAt = null;
  pet.createdAt = createdAt;
  return pet;
}

function makeFreshState(): PetState {
  const state = new PetState();
  state.hunger = 100;
  state.hungerUpdatedAt = null;
  state.intimacy = 0;
  state.lastPettedAt = null;
  state.loveCount = 0;
  state.activeDayCount = 0;
  state.lastActivePeriod = null;
  state.lastPettedPeriod = null;
  return state;
}

describe('classifySpecies', () => {
  it('returns POODLE when love clears neglect by the margin', () => {
    expect(classifySpecies(2, 0)).toBe(Species.POODLE);
  });

  it('returns CAT when neglect clears love by the margin', () => {
    expect(classifySpecies(0, 2)).toBe(Species.CAT);
  });

  it('returns TURTLE when neither clears the margin', () => {
    expect(classifySpecies(1, 1)).toBe(Species.TURTLE);
    expect(classifySpecies(0, 0)).toBe(Species.TURTLE);
  });
});

describe('periodIndex', () => {
  it('returns 0 for the same instant as hatchedAt', () => {
    const t0 = new Date(1_000_000);
    expect(periodIndex(t0, t0.getTime())).toBe(0);
  });

  it('returns 1 once a full day has passed', () => {
    const t0 = new Date(1_000_000);
    expect(periodIndex(t0, t0.getTime() + DAY)).toBe(1);
  });

  it('returns 2 just before the third day starts', () => {
    const t0 = new Date(1_000_000);
    expect(periodIndex(t0, t0.getTime() + 2 * DAY + 23 * HOUR)).toBe(2);
  });
});

describe('deriveNeglectCount', () => {
  it('is 0 for an EGG regardless of activeDayCount', () => {
    const pet = makeEgg(new Date(0));
    const state = makeFreshState();
    state.activeDayCount = 0;
    expect(deriveNeglectCount(pet, state)).toBe(0);
  });

  it('is TOTAL_DAYS minus activeDayCount once hatched', () => {
    const pet = makeEgg(new Date(0));
    pet.stage = PetStage.HATCHED;
    const state = makeFreshState();
    state.activeDayCount = 1;
    expect(deriveNeglectCount(pet, state)).toBe(2);
  });
});

describe('settlePet', () => {
  it('does nothing to an egg before EGG_HATCH_HOURS has elapsed', () => {
    const t0 = 1_000_000;
    const pet = makeEgg(new Date(t0));
    const state = makeFreshState();

    settlePet(pet, state, t0 + 10 * HOUR);

    expect(pet.stage).toBe(PetStage.EGG);
    expect(pet.hatchedAt).toBeNull();
    expect(state.activeDayCount).toBe(0);
    expect(state.hunger).toBe(100);
  });

  it('hatches an egg once EGG_HATCH_HOURS has elapsed and records day 0 as active', () => {
    const t0 = 1_000_000;
    const pet = makeEgg(new Date(t0));
    const state = makeFreshState();
    const hatchTime = t0 + 24 * HOUR;

    settlePet(pet, state, hatchTime);

    expect(pet.stage).toBe(PetStage.HATCHED);
    expect(pet.hatchedAt?.getTime()).toBe(hatchTime);
    expect(state.hungerUpdatedAt?.getTime()).toBe(hatchTime);
    expect(state.activeDayCount).toBe(1);
    expect(state.lastActivePeriod).toBe(0);
  });

  it('does not double-count the same day visited twice', () => {
    const t0 = 1_000_000;
    const pet = makeEgg(new Date(t0));
    const state = makeFreshState();
    const hatchTime = t0 + 24 * HOUR;

    settlePet(pet, state, hatchTime); // day 0, activeDayCount -> 1
    settlePet(pet, state, hatchTime + 5 * HOUR); // still day 0

    expect(state.activeDayCount).toBe(1);
  });

  it('counts a new day as active on the next visit', () => {
    const t0 = 1_000_000;
    const pet = makeEgg(new Date(t0));
    const state = makeFreshState();
    const hatchTime = t0 + 24 * HOUR;

    settlePet(pet, state, hatchTime); // day 0
    settlePet(pet, state, hatchTime + 25 * HOUR); // day 1

    expect(state.activeDayCount).toBe(2);
    expect(state.lastActivePeriod).toBe(1);
  });

  it('does not record a day at or beyond TOTAL_DAYS', () => {
    const t0 = 1_000_000;
    const pet = makeEgg(new Date(t0));
    const state = makeFreshState();
    const hatchTime = t0 + 24 * HOUR;

    settlePet(pet, state, hatchTime + 3 * DAY); // period 3, at TOTAL_DAYS boundary — evolves instead

    expect(pet.stage).toBe(PetStage.EVOLVED);
  });

  it('decays hunger proportionally to elapsed hours once hatched', () => {
    const t0 = 1_000_000;
    const pet = makeEgg(new Date(t0));
    const state = makeFreshState();
    const hatchTime = t0 + 24 * HOUR;

    settlePet(pet, state, hatchTime); // hunger stays 100, hungerUpdatedAt = hatchTime
    settlePet(pet, state, hatchTime + 3 * HOUR); // 3 hours pass, decay 10/hr

    expect(state.hunger).toBe(70);
  });

  it('triggers evolution at TOTAL_HOURS and classifies species from the counters', () => {
    const t0 = 1_000_000;
    const pet = makeEgg(new Date(t0));
    const state = makeFreshState();
    const hatchTime = t0 + 24 * HOUR;

    settlePet(pet, state, hatchTime); // day 0 active, activeDayCount=1
    settlePet(pet, state, hatchTime + 25 * HOUR); // day 1 active, activeDayCount=2
    state.loveCount = 2; // petted on both recorded days

    settlePet(pet, state, hatchTime + 72 * HOUR);

    // activeDayCount=2 -> neglect = 3-2 = 1; love=2 -> 2 >= 1+1 -> POODLE
    expect(pet.stage).toBe(PetStage.EVOLVED);
    expect(pet.species).toBe(Species.POODLE);
    expect(pet.evolvedAt?.getTime()).toBe(hatchTime + 72 * HOUR);
  });

  it('does not keep incrementing activeDayCount once evolved', () => {
    const t0 = 1_000_000;
    const pet = makeEgg(new Date(t0));
    const state = makeFreshState();
    const hatchTime = t0 + 24 * HOUR;

    settlePet(pet, state, hatchTime);
    settlePet(pet, state, hatchTime + 72 * HOUR); // evolves here
    const activeDayCountAtEvolution = state.activeDayCount;

    settlePet(pet, state, hatchTime + 100 * HOUR); // long after evolution

    expect(state.activeDayCount).toBe(activeDayCountAtEvolution);
  });

  it('still decays hunger after evolution', () => {
    const t0 = 1_000_000;
    const pet = makeEgg(new Date(t0));
    const state = makeFreshState();
    const hatchTime = t0 + 24 * HOUR;

    settlePet(pet, state, hatchTime);
    settlePet(pet, state, hatchTime + 72 * HOUR); // evolves, hunger snapshot taken
    const hungerAtEvolution = state.hunger;

    settlePet(pet, state, hatchTime + 75 * HOUR); // 3 more hours post-evolution

    expect(state.hunger).toBe(Math.max(0, hungerAtEvolution - 30));
  });

  it('does nothing once released', () => {
    const t0 = 1_000_000;
    const pet = makeEgg(new Date(t0));
    const state = makeFreshState();
    const hatchTime = t0 + 24 * HOUR;

    settlePet(pet, state, hatchTime);
    pet.stage = PetStage.RELEASED;
    state.hunger = 55;
    const snapshot = { ...state };

    settlePet(pet, state, hatchTime + 500 * HOUR);

    expect(state.hunger).toBe(snapshot.hunger);
    expect(state.activeDayCount).toBe(snapshot.activeDayCount);
    expect(state.loveCount).toBe(snapshot.loveCount);
  });
});
