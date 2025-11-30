import type { Distribution, HashMapConfig } from "./data.mts";
import { Possibility } from "./data.mts";
import * as hamt from "hamt_plus";

export function rejectionSampling<T>(
    distribution: Distribution<T>,
    samples: number,
    hashMapConfig?: HashMapConfig<T>,
): HamtMap<T, number> {
    let results = hamt.make(hashMapConfig) as HamtMap<T, number>;

    for (let i = 0; i < samples; i++) {
        let currentNode = shallowRandomChoice(distribution);

        while (currentNode !== null) {
            currentNode.match({
                constant: (_, value) => {
                    results = results.modify(
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

    return results;
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
