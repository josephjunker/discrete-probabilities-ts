import * as hamt from "hamt_plus";
import type { HamtMap } from "hamt_plus";

abstract class Possibility<T> {
    abstract probability: number;

    abstract match<S>(branches: {
        constant: (probability: number, value: T) => S;
        thunk: (probability: number, fn: () => Distribution<T>) => S;
    }): S;

    abstract withProbability(newProbability: number): Possibility<T>;

    abstract tryGetConstant(): { probability: number; value: T } | null;
    abstract tryGetThunk(): {
        probability: number;
        fn: () => Distribution<T>;
    } | null;

    static constant<T>(probability: number, value: T): Possibility<T> {
        return new Constant(probability, value);
    }

    static thunk<T>(
        probability: number,
        fn: () => Distribution<T>,
    ): Possibility<T> {
        return new Thunk(probability, fn);
    }
}

type Distribution<T> = Array<Possibility<T>>;

class Constant<T> extends Possibility<T> {
    public probability: number;
    public value: T;

    constructor(probability: number, value: T) {
        super();
        this.probability = probability;
        this.value = value;
    }

    match<S>(branches: {
        constant: (probability: number, value: T) => S;
        thunk: (probability: number, fn: () => Distribution<T>) => S;
    }): S {
        return branches.constant(this.probability, this.value);
    }

    withProbability(newProbability: number) {
        return new Constant(newProbability, this.value);
    }

    tryGetConstant(): { probability: number; value: T } | null {
        return {
            probability: this.probability,
            value: this.value,
        };
    }

    tryGetThunk(): {
        probability: number;
        fn: () => Distribution<T>;
    } | null {
        return null;
    }
}

class Thunk<T> extends Possibility<T> {
    public probability: number;
    public fn: () => Distribution<T>;

    constructor(probability: number, fn: () => Distribution<T>) {
        super();
        this.probability = probability;
        this.fn = fn;
    }

    match<S>(branches: {
        constant: (probability: number, value: T) => S;
        thunk: (probability: number, fn: () => Distribution<T>) => S;
    }): S {
        return branches.thunk(this.probability, this.fn);
    }

    withProbability(newProbability: number) {
        return new Thunk(newProbability, this.fn);
    }

    tryGetConstant(): { probability: number; value: T } | null {
        return null;
    }

    tryGetThunk(): {
        probability: number;
        fn: () => Distribution<T>;
    } | null {
        return {
            probability: this.probability,
            fn: this.fn,
        };
    }
}

function explore<T>(
    maxDepth: number | null,
    choices: Distribution<T>,
): Distribution<T> {
    const suspensions = [] as Distribution<T>;
    let answers = hamt.make() as HamtMap<T, number>;

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
type Choices<T> = Array<[number, T]>;

function impossible<T>(): Distribution<T> {
    return [];
}

function weightedChoices<T>(choices: Choices<T>): Distribution<T> {
    return choices.map(([prob, value]) => Possibility.constant(prob, value));
}

function flip(p: number): Distribution<boolean> {
    return weightedChoices([
        [p, true],
        [1 - p, false],
    ]);
}

function roll(sides: number): Distribution<number> {
    const odds = 1 / sides;
    const choices = [] as Choices<number>;

    for (let i = 1; i <= sides; i++) {
        choices.push([odds, i]);
    }

    return weightedChoices(choices);
}

function chain<TIn, TOut>(
    distribution: Distribution<TIn>,
    fn: (arg: TIn) => Distribution<TOut>,
): Distribution<TOut> {
    return distribution.map((node) =>
        node.match({
            constant: (prob, value) => Possibility.thunk(prob, () => fn(value)),
            thunk: (prob, innerFn) =>
                Possibility.thunk(prob, () => chain(innerFn(), fn)),
        }),
    );
}

type DistToDict<T extends Record<string, Distribution<unknown>>> = {
    [Name in keyof T]: T[Name] extends Distribution<infer Out> ? Out : never;
};

function multiChain<Dists extends Record<string, Distribution<unknown>>, TOut>(
    dists: Dists,
    fn: (args: DistToDict<Dists>) => Distribution<TOut>,
): Distribution<TOut> {
    const entries = [...Object.entries(dists)];

    const unsafeCastFunction = fn as (
        arg: Record<string, unknown>,
    ) => Distribution<TOut>;

    function recursive(
        i: number,
        argsSoFar: Record<string, unknown>,
    ): Distribution<TOut> {
        const entry = entries[i];
        if (!entry) return unsafeCastFunction(argsSoFar);

        const [name, distribution] = entry;

        return chain(distribution, (arg) => {
            return recursive(i + 1, { [name]: arg, ...argsSoFar });
        });
    }

    return recursive(0, {});
}

function result<T>(value: T): Distribution<T> {
    return [Possibility.constant(1, value)];
}

function rejectionSampling<T>(
    distribution: Distribution<T>,
    samples: number,
): HamtMap<T, number> {
    let results = hamt.make() as HamtMap<T, number>;

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

function shallowNormalize<T>(distribution: Distribution<T>): Distribution<T> {
    const totalProbability = distribution.reduce(
        (acc, { probability }) => acc + probability,
        0,
    );

    return distribution.map((node) =>
        node.withProbability(node.probability / totalProbability),
    );
}

type RandomSelectionResult<T> = {
    selected: T;
    totalProb: number;
};

function randomSelector<T>(tree: Array<[number, T]>): RandomSelectionResult<T> {
    if (tree.length === 0) throw new Error("Tried to select from empty tree");

    const totalProb = tree.reduce((acc, [prob]) => acc + prob, 0);

    const chosenIndex = Math.random() * totalProb;
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
                                (value || 0) +
                                constant.probability * probabilityScale,
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
        firstChoice.match({
            constant: (probability, value) =>
                samples.modify(
                    value,
                    (value) => (value || 0) + probability * pcontrib,
                ),
            thunk: (_, fn) => samplingWalkTree(pcontrib, samples, fn()),
        });
    }

    const expanded = expandLevel(pcontrib, samples, choices);

    if (expanded.nestedChoices.length === 0) return expanded.samples;
    const { selected, totalProb } = randomSelector(expanded.nestedChoices);
    return samplingWalkTree(pcontrib * totalProb, expanded.samples, selected);
}

function sample<T>(
    choices: Distribution<T>,
    nSamples: number,
): Distribution<T> {
    let samples = hamt.make() as HamtMap<T, number>;
    for (let i = 0; i < nSamples; i++) {
        samples = samplingWalkTree(1, samples, choices);
    }

    const resultTree = [] as Distribution<T>;

    for (const [result, prob] of samples.entries()) {
        resultTree.push(Possibility.constant(prob / nSamples, result));
    }

    return resultTree;
}

type WeightedValue<T> = {
    probability: number;
    value: T;
};

function fullyResolveExact<T>(
    distribution: Distribution<T>,
): Array<WeightedValue<T>> {
    const flattened = shallowNormalize(explore(null, distribution));
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

function fullyResolveSampling<T>(
    distribution: Distribution<T>,
    nSamples: number,
): Array<WeightedValue<T>> {
    return sample(distribution, nSamples).map((possibility) =>
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

function exploreToEpsilon<T>(
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

function truncate<T>(distribution: Distribution<T>): {
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

export {
    weightedChoices,
    flip,
    roll,
    impossible,
    result,
    chain,
    multiChain,
    explore,
    sample,
    rejectionSampling,
    shallowNormalize,
    fullyResolveExact,
    fullyResolveSampling,
    exploreToEpsilon,
    truncate,
    Possibility,
    type Distribution,
};
