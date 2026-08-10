import {
  evolvedAtOf,
  growthDays,
  hatchedAtOf,
  hungerOf,
  intimacyOf,
  speciesOf,
  stageOf,
} from './pet-logic';
import { Pet, PetStage, Species } from '../model/pet.entity';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** KST 시각을 UTC Date로. 테스트가 실행 환경 시간대에 안 흔들리게 한다. */
function kst(iso: string): Date {
  return new Date(`${iso}+09:00`);
}

function makePetCreatedAt(createdAt: Date): Pet {
  const pet = new Pet();
  pet.createdAt = createdAt;
  pet.releasedAt = null;
  return pet;
}

describe('hatchedAtOf', () => {
  it('hatches at 06:00 on the next game day', () => {
    // 14:00 생성 → 게임 하루는 그날 → 다음 하루 06:00
    expect(hatchedAtOf(kst('2026-08-09T14:00')).toISOString()).toBe(
      kst('2026-08-10T06:00').toISOString(),
    );
  });

  it('hatches the same calendar morning when created before 06:00', () => {
    // 05:00은 게임 하루로 08-08 → 다음 하루는 08-09 06:00, 즉 한 시간 뒤
    expect(hatchedAtOf(kst('2026-08-09T05:00')).toISOString()).toBe(
      kst('2026-08-09T06:00').toISOString(),
    );
  });

  it('treats 06:00 sharp as the start of a new game day', () => {
    expect(hatchedAtOf(kst('2026-08-09T06:00')).toISOString()).toBe(
      kst('2026-08-10T06:00').toISOString(),
    );
  });
});

describe('evolvedAtOf', () => {
  it('is exactly 72 hours after hatching', () => {
    const createdAt = kst('2026-08-09T14:00');
    expect(
      evolvedAtOf(createdAt).getTime() - hatchedAtOf(createdAt).getTime(),
    ).toBe(72 * HOUR);
  });

  it('also lands on 06:00 thanks to the aligned hatch', () => {
    expect(evolvedAtOf(kst('2026-08-09T14:00')).toISOString()).toBe(
      kst('2026-08-13T06:00').toISOString(),
    );
  });
});

describe('growthDays', () => {
  it('returns three consecutive days starting at the hatch day', () => {
    const createdAt = kst('2026-08-09T14:00');
    expect(growthDays(createdAt)).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
    ]);
  });
});

describe('stageOf', () => {
  const createdAt = kst('2026-08-09T14:00');
  const pet = makePetCreatedAt(createdAt);
  const hatch = hatchedAtOf(createdAt).getTime();
  const evolve = evolvedAtOf(createdAt).getTime();

  it('is EGG right up to the hatch instant', () => {
    expect(stageOf(pet, new Date(hatch - 1))).toBe(PetStage.EGG);
  });

  it('is HATCHED from the hatch instant', () => {
    expect(stageOf(pet, new Date(hatch))).toBe(PetStage.HATCHED);
    expect(stageOf(pet, new Date(evolve - 1))).toBe(PetStage.HATCHED);
  });

  it('is EVOLVED from the evolve instant', () => {
    expect(stageOf(pet, new Date(evolve))).toBe(PetStage.EVOLVED);
  });

  it('is RELEASED regardless of how much time passed', () => {
    const released = makePetCreatedAt(createdAt);
    released.releasedAt = new Date(hatch);
    expect(stageOf(released, new Date(evolve + 10 * DAY))).toBe(
      PetStage.RELEASED,
    );
  });
});

describe('speciesOf', () => {
  const createdAt = kst('2026-08-09T14:00');
  const pet = makePetCreatedAt(createdAt);
  const evolved = evolvedAtOf(createdAt);
  const beforeEvolve = new Date(evolved.getTime() - 1);

  it('is null before evolving no matter how many pettings', () => {
    expect(speciesOf(pet, 9, beforeEvolve)).toBeNull();
  });

  it('is CAT for 0 or 1', () => {
    expect(speciesOf(pet, 0, evolved)).toBe(Species.CAT);
    expect(speciesOf(pet, 1, evolved)).toBe(Species.CAT);
  });

  it('is TURTLE between the two thresholds', () => {
    expect(speciesOf(pet, 2, evolved)).toBe(Species.TURTLE);
    expect(speciesOf(pet, 5, evolved)).toBe(Species.TURTLE);
  });

  it('is POODLE from 6 up', () => {
    expect(speciesOf(pet, 6, evolved)).toBe(Species.POODLE);
    expect(speciesOf(pet, 9, evolved)).toBe(Species.POODLE);
  });

  it('keeps the species after the pet is released', () => {
    // 놓아준 펫도 기록으로 남으므로 종이 사라지면 안 된다 (PRD §4.3).
    const released = makePetCreatedAt(createdAt);
    released.releasedAt = new Date(evolved.getTime() + HOUR);

    expect(speciesOf(released, 6, new Date(evolved.getTime() + 10 * DAY))).toBe(
      Species.POODLE,
    );
  });

  it('stays null when the pet was released before evolving', () => {
    // 진화 전에 놓아줬으면 실제 시간이 아무리 흘러도 종이 생기지 않는다.
    const released = makePetCreatedAt(createdAt);
    released.releasedAt = beforeEvolve;

    expect(
      speciesOf(released, 9, new Date(evolved.getTime() + 10 * DAY)),
    ).toBeNull();
  });
});

describe('intimacyOf', () => {
  it('is 5 per petting', () => {
    expect(intimacyOf(0)).toBe(0);
    // 육성 기간에 최대로 쓰다듬어도 45 — 진화 전에 100을 못 채우는 것이 의도다
    expect(intimacyOf(9)).toBe(45);
  });

  it('caps at 100', () => {
    expect(intimacyOf(25)).toBe(100);
  });
});

describe('hungerOf', () => {
  const createdAt = kst('2026-08-09T14:00');
  const hatch = hatchedAtOf(createdAt);

  it('is full while still an egg', () => {
    expect(hungerOf(createdAt, null, new Date(hatch.getTime() - HOUR))).toBe(
      100,
    );
  });

  it('decays from the hatch instant when never fed', () => {
    expect(
      hungerOf(createdAt, null, new Date(hatch.getTime() + 5 * HOUR)),
    ).toBe(50);
  });

  it('decays from the last feed instead', () => {
    const fedAt = new Date(hatch.getTime() + 5 * HOUR);
    expect(
      hungerOf(
        createdAt,
        { hungerAfter: 90, fedAt },
        new Date(fedAt.getTime() + 2 * HOUR),
      ),
    ).toBe(70);
  });

  it('never goes below zero', () => {
    expect(
      hungerOf(createdAt, null, new Date(hatch.getTime() + 100 * HOUR)),
    ).toBe(0);
  });
});
