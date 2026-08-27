export function getFrontendOrigins(): string[] | true {
  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins.length > 0 ? configuredOrigins : true;
}

export function getCorsOptions() {
  return {
    origin: getFrontendOrigins(),
    credentials: true,
  } as const;
}
