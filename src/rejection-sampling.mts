import type { Distribution, HashMapConfig } from "./data.mts";
import { Possibility } from "./data.mts";
import * as hamt from "hamt_plus";

/**
 * Naive sampling of a distribution. This algorithm is highly inaccurate when handling very unlikely
 * Possibilities and is solely provided as a baseline to compare {@link sample} against.
 *
 * @param distribution The distribution to sample
 * @param nSamples The number of samples to take
 * @param hashMapConfig
 * @param [hashMapConfig] Optional configuration for a hash map. Only needed when the distribution
 *      is over non-primitive values. See {@link HashMapConfig}
 */
export function rejectionSampling<T>(
    distribution: Distribution<T>,
    nSamples: number,
    hashMapConfig?: HashMapConfig<T>,
): Distribution<T> {
    let samples = hamt.make(hashMapConfig) as HamtMap<T, number>;

    for (let i = 0; i < nSamples; i++) {
        let currentNode = shallowRandomChoice(distribution);

        while (currentNode !== null) {
            currentNode.match({
                constant: (_, value) => {
                    samples = samples.modify(
                        value,
                        (current) => (current || 0) + 1,
                    );
                },
                thunk: (_, fn) => {
                    currentNode = shallowRandomChoice(fn());
                },
            });
        }
    }

    const resultDistribution = [] as Distribution<T>;

    for (const [result, prob] of samples.entries()) {
        resultDistribution.push(Possibility.constant(prob / nSamples, result));
    }

    return resultDistribution;
}

function shallowRandomChoice<T>(
    distribution: Distribution<T>,
): Possibility<T> | null {
    if (distribution.length === 0) return null;

    const totalProb = distribution.reduce(
        (acc, { probability }) => acc + probability,
        0,
    );

    const chosenIndex = Math.random() * totalProb;
    let cumulativeProb = 0;

    for (const node of distribution) {
        cumulativeProb += node.probability;

        if (cumulativeProb >= chosenIndex) return node;
    }

    throw new Error("TILT");
}
