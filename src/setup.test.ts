import { describe, it, expect } from 'vitest';

describe('프로젝트 설정 검증', () => {
  it('Vitest가 정상적으로 동작한다', () => {
    expect(1 + 1).toBe(2);
  });

  it('fast-check가 정상적으로 동작한다', async () => {
    const fc = await import('fast-check');
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      }),
    );
  });
});
