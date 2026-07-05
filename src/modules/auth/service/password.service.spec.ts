import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('원문과 다른 해시를 만들고, 원문으로 검증에 성공한다', async () => {
    const hash = await service.hash('secret123');

    expect(hash).not.toBe('secret123');
    expect(await service.verify(hash, 'secret123')).toBe(true);
  });

  it('틀린 비밀번호는 검증에 실패한다', async () => {
    const hash = await service.hash('secret123');

    expect(await service.verify(hash, 'wrong-password')).toBe(false);
  });
});
