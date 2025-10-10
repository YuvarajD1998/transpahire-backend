export const getEnv = (name: string, fallback?: string): string => {
  const value = process.env[name];
  if (typeof value === 'undefined' || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
};

export const getEnvInt = (name: string, fallback?: number): number => {
  const str = process.env[name];
  if (typeof str === 'undefined' || str === '') {
    if (typeof fallback === 'number') return fallback;
    throw new Error(`Missing required env variable: ${name}`);
  }
  const n = parseInt(str, 10);
  if (isNaN(n)) throw new Error(`Env variable '${name}' is not a number`);
  return n;
};
