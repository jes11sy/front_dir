export type CityLike = string | { id: number; name: string } | null | undefined

export function getCityName(city: CityLike, fallback = ''): string {
  if (typeof city === 'string') {
    return city || fallback
  }
  if (city && typeof city === 'object') {
    return city.name || fallback
  }
  return fallback
}

export function normalizeCityNames(cities: Array<string | { id: number; name: string }> | undefined): string[] {
  if (!Array.isArray(cities)) {
    return []
  }
  return cities
    .map((city) => (typeof city === 'string' ? city : city.name))
    .filter((city): city is string => Boolean(city))
}
