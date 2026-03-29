export function getApiUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return "/";
  return `https://${domain}/`;
}
