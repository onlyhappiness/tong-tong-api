import { Test, TestingModule } from '@nestjs/testing';
import { ExpService } from './exp.service';

describe('ExpService', () => {
  let service: ExpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpService],
    }).compile();

    service = module.get<ExpService>(ExpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
