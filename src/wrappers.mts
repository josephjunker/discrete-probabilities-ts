import type { Distribution, HashMapConfig, WeightedValue } from "./data.mts";
import { explore } from "./inference.mts";
import { sample } from "./lookahead-sampling.mts";
import { shallowNormalize } from "./utils.mts";

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

export function exploreToEpsilon<T>(
    distribution: Distribution<T>,
    epsilon: number,
): Distribution<T> {
    let unexplored = unexploredProbabilitySum(distribution);

    while (unexplored > epsilon) {
        distribution = explore(1, distribution);
        unexplored = unexploredProbabilitySum(distribution);
    }

    return distribution;
}

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
