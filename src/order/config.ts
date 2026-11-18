import { STONES, STONE_KEYS, TROY_OZ_GRAMS, type StoneKey } from './data';

// Owner-editable settings. Stored on this device until a shared settings table exists.
export interface OwnerConfig {
  makingFee: number;
  taxRate: number;
  deposits: number[];
  defaultDeposit: number;
  stonePerCt: Record<StoneKey, number>;
  manualOz: { gold24: number; silver: number; platinum: number }; // USD per troy ounce
  useLivePrices: boolean;
}

export const DEFAULT_CONFIG: OwnerConfig = {
  makingFee: 80,
  taxRate: 0.0825,
  deposits: [25, 50, 100],
  defaultDeposit: 50,
  stonePerCt: Object.fromEntries(STONE_KEYS.map(k => [k, STONES[k].perCt])) as Record<StoneKey, number>,
  manualOz: { gold24: 130.44 * TROY_OZ_GRAMS, silver: 50, platinum: 1459.3 },
  useLivePrices: true,
};

const KEY = 'custom-order-settings';

export function loadConfig(): OwnerConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CONFIG;
    const saved = JSON.parse(raw) as Partial<OwnerConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...saved,
      stonePerCt: { ...DEFAULT_CONFIG.stonePerCt, ...saved.stonePerCt },
      manualOz: { ...DEFAULT_CONFIG.manualOz, ...saved.manualOz },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(cfg: OwnerConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* storage unavailable: settings last for this session only */
  }
}

// Returns the first problem with the owner settings, or null when they can be saved.
export function settingsProblem(c: OwnerConfig): string | null {
  if (!Number.isFinite(c.makingFee) || c.makingFee < 0) return 'Making fee must be a number, zero or more.';
  if (!Number.isFinite(c.taxRate) || c.taxRate < 0 || c.taxRate > 0.25) return 'Sales tax must be between 0% and 25%.';
  if (Object.values(c.stonePerCt).some(v => !Number.isFinite(v) || v < 0)) return 'Stone prices must be numbers, zero or more.';
  const { gold24, silver, platinum } = c.manualOz;
  if (![gold24, silver, platinum].every(v => Number.isFinite(v) && v > 0)) return 'Manual metal prices must be above zero.';
  return null;
}

export const taxLabel = (cfg: OwnerConfig): string =>
  `Sales tax (${(cfg.taxRate * 100).toFixed(2).replace(/\.?0+$/, '')}%, store location)`;
