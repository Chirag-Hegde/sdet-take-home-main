/**
 * Smoke profile: a light, short load used to confirm a scenario works and to
 * take a baseline reading. Keep it small. Heavier profiles (load, stress,
 * soak) would live alongside this one.
 */
export const smoke = {
  vus: 2,
  duration: '30s',
};
