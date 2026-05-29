export function joinClasses(
  ...parts: (string | false | null | undefined)[]
): string {
  return parts.filter(Boolean).join(' ')
}
