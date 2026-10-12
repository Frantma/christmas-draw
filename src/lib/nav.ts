/** Pořadí stránek v menu – určuje směr animace při navigaci. */
export const NAV_ORDER = ["/", "/prani", "/komu-davam", "/sprava"] as const;

export function navTypes(from: string, to: string) {
  const a = NAV_ORDER.indexOf(from as (typeof NAV_ORDER)[number]);
  const b = NAV_ORDER.indexOf(to as (typeof NAV_ORDER)[number]);
  if (a === -1 || b === -1 || a === b) return [];
  return [b > a ? "nav-forward" : "nav-back"];
}
