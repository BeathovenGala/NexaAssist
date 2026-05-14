export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function formatTenantSlugPart(slug: string): string {
  const cleaned = slug.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return (cleaned.length > 0 ? cleaned : 'TENANT').slice(0, 16);
}
