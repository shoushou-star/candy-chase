export function isSessionNewRecord(score: number, previousBest: number | undefined): boolean {
  return previousBest !== undefined && score > previousBest;
}
