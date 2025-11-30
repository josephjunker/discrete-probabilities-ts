import { type Distribution, type HashMapConfig, Possibility } from "./data.mts";
import hamt from "hamt_plus";

/**
 * Perform exact inference on a {@link Distribution}. This means flattening any intermediate thunks/nested
 * Distributions until a single flat Distribution is left. The weights of the flattened distribution may
 * not add up to 1; use {@link shallowNormalize} to normalize the distribution to proper probabilities
 * before use. Alternatively, if the goal is to produce a final probability distribution, {@link fullyResolveExact}
 * will likely be more convenient.
 *
 * If the distribution is infinite then this function will diverge. In this case the `maxDepth` argument
 * should be provided to specify the number of consecutive thunks to unfold. If the goal is to fully
 * normalize a finite distribution then `null` should be provided for `maxDepth`.
 *
 * When partially exploring an infinite distribution it may be more convenient to use
 * {@link exploreToEpsilon}, which allows for the specification of an acceptable error margin rather
 * than a thunk depth.
 *
 * @param maxDepth The number of thunks to unfold, or `null` if full exploration is desired.
 * @param distribution The distribution to explore.
 * @param [hashMapConfig] Optional configuration for a hash map. Only needed when the distribution
 *      is over non-primitive values. See {@link HashMapConfig}
 */
export function explore<T>(
    maxDepth: number | null,
    distribution: Distribution<T>,
    hashMapConfig?: HashMapConfig<T>,
): Distribution<T> {
    if (maxDepth !== null && maxDepth < 1)
        throw new Error("maxDepth must be at least 1");

    const suspensions = [] as Distribution<T>;
    let answers = hamt.make(hashMapConfig) as HamtMap<T, number>;

    function walk(prob: number, depth: number, choices: Distribution<T>): void {
        for (const choice of choices) {
            choice.match({
                constant: (nodeProb, value) => {
                    answers = answers.modify(
                        value,
                        (existing) => (existing || 0) + prob * nodeProb,
                    );
                },
                thunk: (nodeProb, fn) => {
                    if (!maxDepth || depth < maxDepth) {
                        // Walk the node if we should continue
                        walk(prob * nodeProb, depth + 1, fn());
                    } else {
                        // Save the node if we're at our depth limit
                        suspensions.push(
                            Possibility.thunk(prob * nodeProb, fn),
                        );
                    }
                },
            });
        }
    }

    walk(1, 0, distribution);

    for (const [value, prob] of answers.entries()) {
        suspensions.push(Possibility.constant(prob, value));
    }

    return suspensions;
}
