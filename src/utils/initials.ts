/** "Max Fedorenko" -> "MF" — first letter of the first two words, for the
 * assignee badge shown on a Gantt bar. */
export function getInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '');

  return letters.join('');
}
