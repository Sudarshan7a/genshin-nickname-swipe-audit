// classnames joiner (shadcn-style `cn` without the dependency).
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}
