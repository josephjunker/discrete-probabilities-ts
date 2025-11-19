import { Distribution, HashMapConfig, Possibility } from "./data";
import * as hamt from "hamt_plus";

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

type RandomSelectionResult<T> = {
    selected: T;
    totalProb: number;
};

function randomSelector<T>(tree: Array<[number, T]>): RandomSelectionResult<T> {
    if (tree.length === 0) throw new Error("Tried to select from empty tree");

    const totalProb = tree.reduce((acc, [prob]) => acc + prob, 0);

    const chosenIndex = Math.random() * totalProb;
    // const chosenIndex = seededRandom() * totalProb;
    let cumulativeProb = 0;

    for (const node of tree) {
        cumulativeProb += node[0];

        if (cumulativeProb >= chosenIndex)
            return { selected: node[1], totalProb };
    }

    throw new Error("TILT");
}

type NestedChoices<T> = Array<[number, Distribution<T>]>;

type ExpandLevelResult<T> = {
    samples: HamtMap<T, number>;
    nestedChoices: NestedChoices<T>;
};

function expandLevel<T>(
    probabilityScale: number,
    samples: HamtMap<T, number>,
    choices: Distribution<T>,
): ExpandLevelResult<T> {
    const nestedChoices = [] as NestedChoices<T>;

    for (const choice of choices) {
        choice.match({
            constant: (probability, value) => {
                samples = samples.modify(
                    value,
                    (value) => (value || 0) + probability * probabilityScale,
                );
            },
            thunk: (probability, fn) => {
                const unfolded = fn();

                const firstUnfolded = unfolded[0];

                // Prune impossible branches
                if (!firstUnfolded) return;

                // Collect constant branches
                if (unfolded.length === 1) {
                    const constant = firstUnfolded.tryGetConstant();
                    if (constant) {
                        samples = samples.modify(
                            constant.value,
                            (value) =>
                                (value || 0) + probability * probabilityScale,
                        );

                        return;
                    }
                }

                nestedChoices.push([probability, shallowNormalize(unfolded)]);
            },
        });
    }

    return { samples, nestedChoices };
}

function samplingWalkTree<T>(
    pcontrib: number,
    samples: HamtMap<T, number>,
    choices: Distribution<T>,
): HamtMap<T, number> {
    const firstChoice = choices[0];
    if (!firstChoice) return samples;

    if (choices.length === 1) {
        return firstChoice.match({
            constant: (prob, value) =>
                samples.modify(
                    value,
                    (value) => (value || 0) + prob * pcontrib,
                ),
            thunk: (_, fn) => samplingWalkTree(pcontrib, samples, fn()),
        });
    }

    const expanded = expandLevel(pcontrib, samples, choices);

    if (expanded.nestedChoices.length === 0) return expanded.samples;
    const { selected, totalProb } = randomSelector(expanded.nestedChoices);
    return samplingWalkTree(pcontrib * totalProb, expanded.samples, selected);
}

export function sample<T>(
    choices: Distribution<T>,
    nSamples: number,
    hashMapConfig?: HashMapConfig<T>,
): Distribution<T> {
    let samples = hamt.make(hashMapConfig) as HamtMap<T, number>;
    for (let i = 0; i < nSamples; i++) {
        samples = samplingWalkTree(1, samples, choices);
    }

    const resultTree = [] as Distribution<T>;

    for (const [result, prob] of samples.entries()) {
        resultTree.push(Possibility.constant(prob / nSamples, result));
    }

    return resultTree;
}

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

export type WeightedValue<T> = {
    probability: number;
    value: T;
};

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
