// Alea PRNG - Azgaar'ın kullandığı seeded random number generator
// Deterministic: aynı seed → aynı harita (save/load için kritik)

export class Alea {
  private s0: number;
  private s1: number;
  private s2: number;
  private c: number;

  constructor(seed: string | number) {
    const seedStr = String(seed);
    let n = 0xefc8249d;

    const mash = (data: string): number => {
      for (let i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        let h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 0x100000000;
      }
      return (n >>> 0) * 2.3283064365386963e-10;
    };

    this.s0 = mash(' ');
    this.s1 = mash(' ');
    this.s2 = mash(' ');
    this.c = 1;

    this.s0 -= mash(seedStr);
    if (this.s0 < 0) this.s0 += 1;
    this.s1 -= mash(seedStr);
    if (this.s1 < 0) this.s1 += 1;
    this.s2 -= mash(seedStr);
    if (this.s2 < 0) this.s2 += 1;
  }

  // 0-1 arası random sayı
  next(): number {
    const t = 2091639 * this.s0 + this.c * 2.3283064365386963e-10;
    this.s0 = this.s1;
    this.s1 = this.s2;
    this.c = t | 0;
    this.s2 = t - this.c;
    return this.s2;
  }

  // min-max arası integer
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // min-max arası float
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  // Array'den rastgele eleman seç
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  // Array'i shuffle et (Fisher-Yates)
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
