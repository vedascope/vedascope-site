export type GrahaKey =
  | "Su"
  | "Mo"
  | "Ma"
  | "Me"
  | "Ju"
  | "Ve"
  | "Sa"
  | "Ra"
  | "Ke";

export type VedaClockGraha = {
  key: GrahaKey;
  longitude: number;
  rashi: number;
  degreeInRashi: number;
  nakshatra: number;
  nakshatraName: string;
  pada: number;
  globalPada: number;
};

export type VedaClockState = {
  datetime: string;
  timezone: string;
  dateLabel: string;
  time: {
    hour: number;
    minute: number;
    second: number;
  };
  grahas: VedaClockGraha[];
  activeNakshatras: number[];
  activePadas: number[];
  panchanga?: {
    tithi?: string;
    vara?: string;
    yoga?: string;
    karana?: string;
    lunarNakshatra?: string;
  };
};

export type BuildVedaClockStateParams = {
  datetime?: string;
  date?: string;
  time?: string;
  timezone?: string;
  dateLabel?: string;
  panchanga?: unknown;
  grahas?: unknown[];
  grahaResponse?: { grahas?: unknown[] };
  grahasResponse?: { grahas?: unknown[] };
};

export const GRAHA_KEYS: GrahaKey[];
export const NAKSHATRA_NAMES: string[];

export function normalize360(value: number): number;
export function normalizeGrahaKey(value: string): GrahaKey | null;
export function deriveVedaClockGraha(key: string, rawLongitude: number): VedaClockGraha;
export function buildVedaClockState(params?: BuildVedaClockStateParams): VedaClockState;
