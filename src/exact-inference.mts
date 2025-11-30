import { type Distribution, type HashMapConfig, Possibility } from "./data.mts";
import hamt from "hamt_plus";

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
