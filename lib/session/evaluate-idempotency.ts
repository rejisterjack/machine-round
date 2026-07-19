export function shouldReturnCachedReport(
  fullySynced: boolean,
  hasReport: boolean,
): boolean {
  return fullySynced && hasReport;
}
