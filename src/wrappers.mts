import type { Distribution, HashMapConfig, WeightedValue } from "./data.mts";
import { explore } from "./exact-inference.mts";
import { sample } from "./lookahead-sampling.mts";
import { shallowNormalize } from "./utils.mts";

/**
 * Turn a {@link Distribution} into an array of {@link WeightedValue}s using approximate sampling.
 * This function will diverge when given an infinite distribution.
 *
 * The result of this function will become more accurate with higher numbers of samples. This function
 * is preferred when distributions are too large for {@link explore} to hold in memory. This function will
 * be significantly slower than `explore` when called with high numbers of samples.
 *
 * It is often more efficient to partially explore a distribution by invoking `explore` with a low `maxDepth`
 * before calling `sample` on the result.
 *
 * @param distribution
 * @param nSamples
 * @param [hashMapConfig] Optional configuration for a hash map. Only needed when the distribution
 *      is over non-primitive values. See {@link HashMapConfig}
 */
export function fullyResolveSampling<T>(
    distribution: Distribution<T>,
    nSamples: number,
    hashMapConfig?: HashMapConfig<T>,
): Array<WeightedValue<T>> {
    return shallowNormalize(sample(distribution, nSamples, hashMapConfig)).map(
        (possibility) =>
            possibility.match({
                constant: (probability, value) => ({ probability, value }),
                thunk: () => {
                    // Impossible because `sample` only returns constants
                    throw new Error("TILT");
                },
            }),
    );
}

function unexploredProbabilitySum<T>(distribution: Distribution<T>): number {
    return shallowNormalize(distribution)
        .filter((possibility) => Boolean(possibility.tryGetThunk()))
        .reduce((acc, { probability }) => acc + probability, 0);
}

/**
 * Perform exact inference over a (possibly infinite) {@link Distribution}, continuing until
 * the unknown portion of the probability is lower than `epsilon`.
 *
 * @param distribution The distribution to simplify
 * @param epsilon The level of error to accept in the results. Must be between 0 and 1 (exclusive).
 * @param [hashMapConfig] Optional configuration for a hash map. Only needed when the distribution
 *      is over non-primitive values. See {@link HashMapConfig}
 */
export function exploreToEpsilon<T>(
    distribution: Distribution<T>,
    epsilon: number,
    hashMapConfig?: HashMapConfig<T>,
): Distribution<T> {
    let unexplored = unexploredProbabilitySum(distribution);

    while (unexplored > epsilon) {
        distribution = explore(1, distribution, hashMapConfig);
        unexplored = unexploredProbabilitySum(distribution);
    }

    return distribution;
}

/**
 * Remove unexplored lazy thunks from a Distribution, returning simplified probabilities. Dropping
 * these thunks introduces an error margin; the exact level of error reduced is returned as the
 * `truncationError` field of the result.
 *
 * If the goal is to turn an infinite distribution into a finite distribution, this can be done by
 * first calling {@link exploreToEpsilon} in order to specify the level of error that you are willing
 * to accept, and then pass the result to `truncate` in order to drop the unexplored portion.
 */
export function truncate<T>(distribution: Distribution<T>): {
    values: Array<WeightedValue<T>>;
    truncationError: number;
} {
    const normalized = shallowNormalize(distribution);

    const constants = normalized.filter((possibility) =>
        Boolean(possibility.tryGetConstant()),
    );

    const thunks = normalized.filter((possibility) =>
        Boolean(possibility.tryGetThunk()),
    );

    return {
        values: constants.map((possibility) =>
            possibility.match({
                constant: (probability, value) => ({ probability, value }),
                thunk: () => {
                    // Impossible because of `filter` above
                    throw new Error("TILT");
                },
            }),
        ),
        truncationError: thunks.reduce(
            (acc, { probability }) => acc + probability,
            0,
        ),
    };
}

/**
 * Turn a {@link Distribution} into an array of {@link WeightedValue}s using exact calculation.
 * This function will diverge when given an infinite distribution.
 *
 * @param distribution
 * @param [hashMapConfig] Optional configuration for a hash map. Only needed when the distribution
 *      is over non-primitive values. See {@link HashMapConfig}
 */
export function fullyResolveExact<T>(
    distribution: Distribution<T>,
    hashMapConfig?: HashMapConfig<T>,
): Array<WeightedValue<T>> {
    const flattened = shallowNormalize(
        explore(null, distribution, hashMapConfig),
    );
    return flattened.map((possibility) =>
        possibility.match({
            constant: (probability, value) => ({ probability, value }),
            thunk: () => {
                // Cannot happen, because we pass `null` to `explore` above
                throw new Error("TILT");
            },
        }),
    );
}
