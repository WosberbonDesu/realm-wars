// Markov chain bazlı fantezi isim üreteci
// Azgaar'ın name base yaklaşımından esinlenildi
import { Alea } from './alea';

// Türkçe/fantezi isim heceleri
const PREFIXES = [
  'Ak', 'Al', 'Ar', 'Az', 'Bal', 'Ber', 'Bor', 'Dag', 'Del', 'Dor',
  'El', 'Er', 'Gar', 'Gil', 'Gol', 'Gor', 'Hal', 'Har', 'Kal', 'Kar',
  'Kel', 'Kir', 'Kor', 'Lor', 'Mal', 'Mar', 'Mor', 'Nar', 'Nor', 'Ol',
  'Or', 'Ral', 'Rav', 'Sal', 'Sar', 'Sel', 'Sil', 'Sol', 'Tal', 'Tar',
  'Tel', 'Tor', 'Val', 'Var', 'Vel', 'Vol', 'Yal', 'Zan', 'Zar', 'Zor',
];

const MIDDLES = [
  'an', 'ar', 'as', 'at', 'da', 'de', 'di', 'do', 'el', 'en',
  'er', 'es', 'ga', 'ge', 'go', 'ha', 'il', 'in', 'ir', 'is',
  'ka', 'ke', 'la', 'le', 'li', 'lo', 'ma', 'me', 'na', 'ne',
  'ni', 'no', 'on', 'or', 'os', 'ra', 're', 'ri', 'ro', 'sa',
  'se', 'si', 'ta', 'te', 'to', 'un', 'ur', 'us', 'va', 'vi',
];

const SUFFIXES = [
  'a', 'an', 'ar', 'as', 'da', 'dor', 'el', 'en', 'er', 'eth',
  'ia', 'iel', 'il', 'in', 'ion', 'ir', 'is', 'ith', 'la', 'land',
  'mir', 'nar', 'nir', 'nor', 'on', 'or', 'os', 'ra', 'rak', 'rim',
  'rin', 'ron', 'sar', 'sol', 'tan', 'thar', 'thon', 'tur', 'un', 'ur',
];

// Nehir isimleri için son ekler
const RIVER_SUFFIXES = [
  ' Nehri', ' Cayi', ' Irmaqi', ' Suyu', ' Deryasi',
];

// Dağ isimleri için son ekler
const MOUNTAIN_SUFFIXES = [
  ' Dagi', ' Tepesi', ' Zirvesi', ' Kayaligi',
];

// Bölge isimleri için son ekler
const REGION_SUFFIXES = [
  ' Ovasi', ' Vadisi', ' Bozkiri', ' Yaylasi', ' Topraklari',
];

// Orman isimleri için son ekler
const FOREST_SUFFIXES = [
  ' Ormani', ' Korulugu', ' Agacligi',
];

export class NameGenerator {
  private rng: Alea;
  private usedNames = new Set<string>();

  constructor(seed: number | string) {
    this.rng = new Alea(seed);
  }

  private generateBase(): string {
    const prefix = this.rng.pick(PREFIXES);
    const hasMiddle = this.rng.next() > 0.4;
    const middle = hasMiddle ? this.rng.pick(MIDDLES) : '';
    const suffix = this.rng.pick(SUFFIXES);
    return prefix + middle + suffix;
  }

  private unique(generator: () => string, maxAttempts: number = 50): string {
    for (let i = 0; i < maxAttempts; i++) {
      const name = generator();
      if (!this.usedNames.has(name)) {
        this.usedNames.add(name);
        return name;
      }
    }
    // Fallback: append number
    const base = generator();
    const name = `${base} ${this.rng.nextInt(2, 99)}`;
    this.usedNames.add(name);
    return name;
  }

  regionName(): string {
    return this.unique(() => {
      const base = this.generateBase();
      const suffix = this.rng.pick(REGION_SUFFIXES);
      return base + suffix;
    });
  }

  riverName(): string {
    return this.unique(() => {
      const base = this.generateBase();
      const suffix = this.rng.pick(RIVER_SUFFIXES);
      return base + suffix;
    });
  }

  mountainName(): string {
    return this.unique(() => {
      const base = this.generateBase();
      const suffix = this.rng.pick(MOUNTAIN_SUFFIXES);
      return base + suffix;
    });
  }

  forestName(): string {
    return this.unique(() => {
      const base = this.generateBase();
      const suffix = this.rng.pick(FOREST_SUFFIXES);
      return base + suffix;
    });
  }

  cityName(): string {
    return this.unique(() => this.generateBase());
  }

  playerName(): string {
    return this.unique(() => {
      const base = this.generateBase();
      const titles = ['Kral', 'Lord', 'Han', 'Bey', 'Sultan', 'Pasa'];
      return this.rng.pick(titles) + ' ' + base;
    });
  }
}
