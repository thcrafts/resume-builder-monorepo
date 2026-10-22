type RandomFn = () => number;

/** Values models reach for by default; excluding them keeps resumes from all repeating one number. */
const OVERUSED_PERCENTS = new Set([20, 25, 30, 32, 35, 38, 40, 45, 50, 60]);

function randomInt(min: number, max: number, random: RandomFn): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pickPercent(min: number, max: number, random: RandomFn): number {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const value = randomInt(min, max, random);
    if (!OVERUSED_PERCENTS.has(value)) return value;
  }
  return randomInt(min, max, random);
}

const METRIC_BUILDERS: Array<(random: RandomFn) => string> = [
  (random) => `${pickPercent(12, 68, random)}% improvement (latency, throughput, conversion, or error rate)`,
  (random) => {
    const from = randomInt(4, 19, random) * 50;
    const to = Math.max(40, Math.round(from * (0.2 + random() * 0.45)));
    return `response time from ${from}ms to ${to}ms`;
  },
  (random) => `${(1.4 + random() * 3.1).toFixed(1)}x increase (throughput, deploy frequency, or capacity)`,
  (random) => `${pickPercent(15, 72, random)}% reduction (cost, incidents, manual work, or build time)`,
  (random) => `${randomInt(3, 28, random)} engineering hours saved per week`,
  (random) => `$${randomInt(18, 460, random)}K annual cost savings`,
  (random) => `${randomInt(12, 950, random)}K users or ${randomInt(2, 40, random)}M requests per day supported`,
  (random) => `release cycle cut from ${randomInt(3, 8, random)} weeks to ${randomInt(1, 2, random)} weeks`,
];

/** Two distinct metric targets for one role's bullets. */
export function buildMetricHints(random: RandomFn = Math.random): string[] {
  const order = METRIC_BUILDERS.map((_, index) => index).sort(
    () => random() - 0.5,
  );
  return order.slice(0, 2).map((index) => METRIC_BUILDERS[index](random));
}
