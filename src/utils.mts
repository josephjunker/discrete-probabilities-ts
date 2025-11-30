import type { Distribution } from "./data.mts";

/**
 * Normalize the top level of a {@link Distribution} such that its probabilities add up to 1.
 */
export function shallowNormalize<T>(
    distribution: Distribution<T>,
): Distribution<T> {
    const totalProbability = distribution.reduce(
        (acc, { probability }) => acc + probability,
        0,
    );

    return distribution.map((node) =>
        node.withProbability(node.probability / totalProbability),
    );
}
