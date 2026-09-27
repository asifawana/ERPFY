/**
 * Axis arithmetic, shared by every bar chart in the portal.
 *
 * Both charts used to hardcode their geometry — one held a table of pixel heights copied off
 * the reference frame, the other used its dollar figures directly as pixels — so a bar's
 * height and the value in its own tooltip could disagree, and neither had an axis to read the
 * bars against. This turns figures into a scale, in one place, so the two charts agree.
 */

/** 1 / 2 / 2.5 / 5 per decade: the steps that give labels a reader recognises. */
const STEPS = [1, 2, 2.5, 5];

export type Scale = {
  /** The value the top gridline stands for. */
  top: number;
  /** Gridline values, top first, always ending at 0. */
  ticks: number[];
};

/**
 * The smallest round step that covers the data in `maxTicks` intervals or fewer.
 *
 * Picking the step first and the top from it — rather than rounding the peak up and dividing
 * — is what keeps every label round. A top of 4,500 split four ways reads 3.4k / 2.3k / 1.1k;
 * a step of 1,000 taken five times reads 1k / 2k / 3k / 4k / 5k for the same data.
 */
export function niceScale(values: number[], maxTicks = 5): Scale {
  const peak = Math.max(1, ...values.filter((value) => Number.isFinite(value)));

  for (
    let decade = Math.floor(Math.log10(peak)) - 2;
    decade <= Math.ceil(Math.log10(peak)) + 1;
    decade += 1
  ) {
    for (const step of STEPS) {
      const size = step * 10 ** decade;
      const intervals = Math.ceil(peak / size);
      if (intervals >= 1 && intervals <= maxTicks) {
        return {
          top: size * intervals,
          ticks: Array.from(
            { length: intervals + 1 },
            (_, index) => size * (intervals - index),
          ),
        };
      }
    }
  }

  /* Unreachable for finite input, but a chart is better than a crash. */
  return { top: peak, ticks: [peak, 0] };
}

/** Compact axis labels: `12k` rather than `12,000`, and `450` left as it is. */
export function tickLabel(value: number): string {
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}m`;
  if (value >= 1000) return `${trim(value / 1000)}k`;
  return trim(value);
}

function trim(value: number): string {
  return value % 1 === 0
    ? String(value)
    : value.toFixed(value < 10 ? 2 : 1).replace(/\.?0+$/, '');
}
