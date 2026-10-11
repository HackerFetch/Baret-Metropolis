/**
 * The kinds of signed message the server could not read, counted.
 *
 * Reading more kinds is how the check gets better, and which kind to read
 * next should come from what sites actually ask for. This keeps a tally in
 * memory (it starts again with the process), bounded in size and in the
 * length of a name, because both are text a caller chooses. The names go to
 * the log; /health/ready shows only the two numbers.
 */
export class UnreadKinds {
  private readonly counts = new Map<string, number>();
  private total = 0;

  constructor(
    private readonly maxKinds = 200,
    private readonly maxName = 64,
  ) {}

  /** Counts one message of `primaryType`. Returns how often that kind was seen. */
  note(primaryType: string): number {
    const name = primaryType.slice(0, this.maxName);
    this.total += 1;
    const seen = this.counts.get(name);
    // Past the bound, a new kind is counted in the total only.
    if (seen === undefined && this.counts.size >= this.maxKinds) return 0;
    const next = (seen ?? 0) + 1;
    this.counts.set(name, next);
    return next;
  }

  get messages(): number {
    return this.total;
  }

  get kinds(): number {
    return this.counts.size;
  }

  /** The kinds seen most, for a log line or a script. */
  top(n = 10): { primaryType: string; count: number }[] {
    return [...this.counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([primaryType, count]) => ({ primaryType, count }));
  }
}
