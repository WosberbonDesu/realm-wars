// Emblem generator - Azgaar tarzı hanedan arması üretimi
// Kalkan şekli, renk (tincture), bölümleme (division), figür (charge)

import { Alea } from './alea';

export interface Emblem {
  id: number;
  stateId: number;
  shield: ShieldShape;
  tincture1: Tincture;      // ana renk
  tincture2: Tincture;      // ikincil renk
  division: Division;        // kalkan bölümlemesi
  ordinary: Ordinary | null; // şerit/çapraz vb.
  charge: Charge;            // figür
  chargeColor: Tincture;
  motto: string;
}

export enum ShieldShape {
  Heater = 'heater',        // klasik kalkan
  Round = 'round',
  Kite = 'kite',
  Oval = 'oval',
  Square = 'square',
  Diamond = 'diamond',
  Pointed = 'pointed',
}

export enum Tincture {
  // Metals
  Or = 'or',           // altın (#FFD700)
  Argent = 'argent',   // gümüş (#F0F0F0)
  // Colors
  Gules = 'gules',     // kırmızı (#D42626)
  Azure = 'azure',     // mavi (#2660D4)
  Sable = 'sable',     // siyah (#2A2A2A)
  Vert = 'vert',       // yeşil (#1A8A1A)
  Purpure = 'purpure', // mor (#7A2AD4)
  // Stains
  Tenne = 'tenne',     // turuncu (#D47A26)
  Sanguine = 'sanguine', // kan kırmızısı (#8A1A1A)
}

export enum Division {
  None = 'none',
  PerPale = 'per_pale',         // dikey ikiye bölme
  PerFess = 'per_fess',         // yatay ikiye bölme
  PerBend = 'per_bend',         // çapraz bölme
  PerSaltire = 'per_saltire',   // X bölme
  PerChevron = 'per_chevron',   // V bölme
  Quarterly = 'quarterly',       // dörtlü bölme
  Gyronny = 'gyronny',          // çarkıfelek bölme
}

export enum Ordinary {
  Chief = 'chief',         // üst şerit
  Fess = 'fess',           // orta yatay şerit
  Pale = 'pale',           // orta dikey şerit
  Bend = 'bend',           // çapraz şerit
  Cross = 'cross',         // haç
  Saltire = 'saltire',     // X haç
  Chevron = 'chevron',     // V şerit
  Bordure = 'bordure',     // çerçeve
  Canton = 'canton',       // sol üst köşe
}

export enum Charge {
  // Hayvanlar
  Lion = 'lion',
  Eagle = 'eagle',
  Dragon = 'dragon',
  Horse = 'horse',
  Wolf = 'wolf',
  Bear = 'bear',
  Stag = 'stag',
  Griffin = 'griffin',
  Phoenix = 'phoenix',
  Serpent = 'serpent',
  // Objeler
  Sword = 'sword',
  Crown = 'crown',
  Castle = 'castle',
  Tower = 'tower',
  Shield = 'shield',
  Star = 'star',
  Sun = 'sun',
  Moon = 'moon',
  Tree = 'tree',
  Anchor = 'anchor',
  Key = 'key',
  Axe = 'axe',
  Hammer = 'hammer',
  Book = 'book',
  Skull = 'skull',
  // Doğa
  Mountain = 'mountain',
  Wave = 'wave',
  Flame = 'flame',
  Rose = 'rose',
  Lily = 'lily',
}

// Charge → emoji ikonları
export const CHARGE_ICONS: Record<Charge, string> = {
  [Charge.Lion]: '🦁', [Charge.Eagle]: '🦅', [Charge.Dragon]: '🐉',
  [Charge.Horse]: '🐴', [Charge.Wolf]: '🐺', [Charge.Bear]: '🐻',
  [Charge.Stag]: '🦌', [Charge.Griffin]: '🦅', [Charge.Phoenix]: '🔥',
  [Charge.Serpent]: '🐍', [Charge.Sword]: '⚔️', [Charge.Crown]: '👑',
  [Charge.Castle]: '🏰', [Charge.Tower]: '🗼', [Charge.Shield]: '🛡️',
  [Charge.Star]: '⭐', [Charge.Sun]: '☀️', [Charge.Moon]: '🌙',
  [Charge.Tree]: '🌳', [Charge.Anchor]: '⚓', [Charge.Key]: '🔑',
  [Charge.Axe]: '🪓', [Charge.Hammer]: '🔨', [Charge.Book]: '📖',
  [Charge.Skull]: '💀', [Charge.Mountain]: '⛰️', [Charge.Wave]: '🌊',
  [Charge.Flame]: '🔥', [Charge.Rose]: '🌹', [Charge.Lily]: '⚜️',
};

// Tincture → hex renk
export const TINCTURE_COLORS: Record<Tincture, string> = {
  [Tincture.Or]: '#FFD700',
  [Tincture.Argent]: '#F0F0F0',
  [Tincture.Gules]: '#D42626',
  [Tincture.Azure]: '#2660D4',
  [Tincture.Sable]: '#2A2A2A',
  [Tincture.Vert]: '#1A8A1A',
  [Tincture.Purpure]: '#7A2AD4',
  [Tincture.Tenne]: '#D47A26',
  [Tincture.Sanguine]: '#8A1A1A',
};

// Metals ve Colors ayrımı (Rule of Tincture)
const METALS = [Tincture.Or, Tincture.Argent];
const COLORS = [Tincture.Gules, Tincture.Azure, Tincture.Sable, Tincture.Vert, Tincture.Purpure, Tincture.Tenne];

const ALL_CHARGES = Object.values(Charge);
const ALL_DIVISIONS = Object.values(Division);
const ALL_ORDINARIES = Object.values(Ordinary);
const ALL_SHIELDS = Object.values(ShieldShape);

const MOTTOS = [
  'Guc ve Onur', 'Adalet ve Zafer', 'Cesarette Sonsuzluk',
  'Karanlikta Isik', 'Demir Irade', 'Sonsuz Sadakat',
  'Ates ve Kan', 'Goklerin Gazabi', 'Topragin Gucuyle',
  'Yildizlarin Altinda', 'Ruzgarin Sesi', 'Daglar Kadar Saglam',
  'Denizlerin Efendisi', 'Kartalin Gozuyle', 'Aslanin Cesareti',
  'Ejderhanin Nefesi', 'Tahtın Koruyucusu', 'Sınırsız Gurur',
  'Kılıcın Hakkıyla', 'Kanla Yazılmış', 'Şerefle Yaşa',
  'Korku Bilmez', 'Zafer Ya Da Ölüm', 'Gölgelerin Lordu',
];

export function generateEmblems(
  stateCount: number,
  rng: Alea,
): Emblem[] {
  const emblems: Emblem[] = [];
  const usedCombinations = new Set<string>();

  for (let i = 0; i < stateCount; i++) {
    // Rule of Tincture: metal üstüne renk veya renk üstüne metal
    let tincture1: Tincture;
    let tincture2: Tincture;

    if (rng.next() > 0.5) {
      tincture1 = rng.pick(METALS);
      tincture2 = rng.pick(COLORS);
    } else {
      tincture1 = rng.pick(COLORS);
      tincture2 = rng.pick(METALS);
    }

    // Charge rengi: field'in zıttı (rule of tincture)
    const chargeColor = METALS.includes(tincture1) ? rng.pick(COLORS) : rng.pick(METALS);

    const charge = rng.pick(ALL_CHARGES);
    const division = rng.pick(ALL_DIVISIONS);
    const shield = rng.pick(ALL_SHIELDS);
    const ordinary = rng.next() > 0.4 ? rng.pick(ALL_ORDINARIES) : null;

    // Benzersizlik kontrolü
    const comboKey = `${tincture1}-${tincture2}-${charge}-${division}`;
    if (usedCombinations.has(comboKey)) {
      // Charge değiştir
      const altCharge = rng.pick(ALL_CHARGES.filter(c => c !== charge));
      emblems.push({
        id: i,
        stateId: i,
        shield,
        tincture1,
        tincture2,
        division,
        ordinary,
        charge: altCharge,
        chargeColor,
        motto: rng.pick(MOTTOS),
      });
    } else {
      usedCombinations.add(comboKey);
      emblems.push({
        id: i,
        stateId: i,
        shield,
        tincture1,
        tincture2,
        division,
        ordinary,
        charge,
        chargeColor,
        motto: rng.pick(MOTTOS),
      });
    }
  }

  return emblems;
}

// Canvas'a emblem çizimi için SVG-benzeri path data
export function renderEmblemToCanvas(
  ctx: CanvasRenderingContext2D,
  emblem: Emblem,
  x: number,
  y: number,
  size: number,
): void {
  const half = size / 2;

  // 1. Kalkan çiz
  ctx.save();
  ctx.translate(x, y);

  drawShield(ctx, emblem.shield, half, TINCTURE_COLORS[emblem.tincture1]);

  // 2. Division
  if (emblem.division !== Division.None) {
    drawDivision(ctx, emblem.division, half, TINCTURE_COLORS[emblem.tincture2]);
  }

  // 3. Ordinary
  if (emblem.ordinary) {
    drawOrdinary(ctx, emblem.ordinary, half, TINCTURE_COLORS[emblem.chargeColor]);
  }

  // 4. Charge (emoji)
  const icon = CHARGE_ICONS[emblem.charge];
  ctx.font = `${size * 0.35}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 0, 0);

  ctx.restore();
}

function drawShield(ctx: CanvasRenderingContext2D, shape: ShieldShape, half: number, color: string): void {
  ctx.beginPath();
  switch (shape) {
    case ShieldShape.Round:
      ctx.arc(0, 0, half, 0, Math.PI * 2);
      break;
    case ShieldShape.Diamond:
      ctx.moveTo(0, -half);
      ctx.lineTo(half, 0);
      ctx.lineTo(0, half);
      ctx.lineTo(-half, 0);
      break;
    case ShieldShape.Oval:
      ctx.ellipse(0, 0, half * 0.7, half, 0, 0, Math.PI * 2);
      break;
    default: // Heater, Kite, Pointed, Square
      ctx.moveTo(-half, -half);
      ctx.lineTo(half, -half);
      ctx.lineTo(half, half * 0.3);
      ctx.quadraticCurveTo(half, half, 0, half * 1.2);
      ctx.quadraticCurveTo(-half, half, -half, half * 0.3);
      break;
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawDivision(ctx: CanvasRenderingContext2D, division: Division, half: number, color: string): void {
  ctx.save();
  ctx.beginPath();
  switch (division) {
    case Division.PerPale:
      ctx.rect(0, -half, half, half * 2.2);
      break;
    case Division.PerFess:
      ctx.rect(-half, 0, half * 2, half * 1.2);
      break;
    case Division.PerBend:
      ctx.moveTo(-half, -half);
      ctx.lineTo(half, half * 1.2);
      ctx.lineTo(half, -half);
      break;
    case Division.Quarterly:
      ctx.rect(0, -half, half, half);
      ctx.rect(-half, 0, half, half * 1.2);
      break;
    default:
      ctx.restore();
      return;
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawOrdinary(ctx: CanvasRenderingContext2D, ordinary: Ordinary, half: number, color: string): void {
  ctx.fillStyle = color;
  const w = half * 0.25;
  switch (ordinary) {
    case Ordinary.Fess:
      ctx.fillRect(-half, -w, half * 2, w * 2);
      break;
    case Ordinary.Pale:
      ctx.fillRect(-w, -half, w * 2, half * 2.2);
      break;
    case Ordinary.Chief:
      ctx.fillRect(-half, -half, half * 2, half * 0.5);
      break;
    case Ordinary.Cross:
      ctx.fillRect(-half, -w, half * 2, w * 2);
      ctx.fillRect(-w, -half, w * 2, half * 2.2);
      break;
    case Ordinary.Bordure:
      ctx.strokeStyle = color;
      ctx.lineWidth = half * 0.15;
      ctx.strokeRect(-half * 0.85, -half * 0.85, half * 1.7, half * 2);
      break;
    default:
      break;
  }
}
