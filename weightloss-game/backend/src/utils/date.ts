export const dateKey = (d: Date): string => d.toISOString().slice(0, 10);

export const minutesBetween = (start: Date, end: Date): number => {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
};
