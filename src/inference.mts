import {
    type Distribution,
    type HashMapConfig,
    Possibility,
    type WeightedValue,
} from "./data.mts";
import * as hamt from "hamt_plus";
import { shallowNormalize } from "./utils.mts";

export function explore<T>(
    maxDepth: number | null,
    choices: Distribution<T>,
    hashMapConfig?: HashMapConfig<T>,
): Distribution<T> {
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
                    if (!maxDepth || depth <= maxDepth) {
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

    walk(1, 0, choices);

    for (const [value, prob] of answers.entries()) {
        suspensions.push(Possibility.constant(prob, value));
    }

    return suspensions;
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
