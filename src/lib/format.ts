export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export function firstName(name: string) {
  return name.split(/\s+/)[0] || name;
}

export function plural(n: number, one: string, few: string, many: string) {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
}

export function domain(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

/** Počet dní do Štědrého dne v pražském čase. */
export function daysToChristmas(now = new Date()) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" })
    .format(now)
    .split("-")
    .map(Number);
  const today = Date.UTC(y, m - 1, d);
  let target = Date.UTC(y, 11, 24);
  if (today > target) target = Date.UTC(y + 1, 11, 24);
  return Math.round((target - today) / 86400000);
}

export function participantsText(n: number) {
  return `${n} ${plural(n, "účastník", "účastníci", "účastníků")}`;
}
