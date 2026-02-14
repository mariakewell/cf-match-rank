export type SeasonMode = 'off' | 'dateRange' | 'recentDays';

export interface SeasonSettings {
  mode: SeasonMode;
  startDate: string;
  endDate: string;
  recentDays: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidYmd = (value: string) => {
  if (!DATE_RE.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const normalizeYmd = (value: string) => (isValidYmd(value) ? value : '');

const toUtcYmd = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeSeasonSettings = (input?: Partial<SeasonSettings> | null): SeasonSettings => {
  const mode = input?.mode;
  const nextMode: SeasonMode = mode === 'dateRange' || mode === 'recentDays' ? mode : 'off';

  const recentDays = Number.isFinite(input?.recentDays)
    ? Math.max(1, Math.min(3650, Math.floor(input!.recentDays as number)))
    : 30;

  return {
    mode: nextMode,
    startDate: normalizeYmd(input?.startDate || ''),
    endDate: normalizeYmd(input?.endDate || ''),
    recentDays,
  };
};

export const applySeasonFilter = <T extends { date: string }>(matches: T[], input?: Partial<SeasonSettings> | null): T[] => {
  const season = normalizeSeasonSettings(input);
  if (season.mode === 'off') return matches;

  if (season.mode === 'dateRange') {
    const start = season.startDate;
    const end = season.endDate;
    if (!start && !end) return matches;

    return matches.filter((match) => {
      if (start && match.date < start) return false;
      if (end && match.date > end) return false;
      return true;
    });
  }

  const now = new Date();
  const endDate = toUtcYmd(now);
  const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (season.recentDays - 1) * 24 * 60 * 60 * 1000;
  const startDate = toUtcYmd(new Date(startMs));

  return matches.filter((match) => match.date >= startDate && match.date <= endDate);
};
