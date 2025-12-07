import { Possibility, type Distribution, type HashMapConfig } from "./data.mts";
import { shallowNormalize } from "./utils.mts";
import hamt from "hamt_plus";

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

export function expandLevel<T>(
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

export function samplingWalkTree<T>(
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

/**
 * Perform approximate sampling over a {@link Distribution}, resulting in a flat distribution over the results.
 * This is done via random sampling, using a tracing method which is significantly more accurate than naive
 * rejection sampling.
 *
 * Building traces will result in full explorations of the distribution, meaning that this function
 * will diverge when provided with infinite distributions.
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
export function sample<T>(
    distribution: Distribution<T>,
    nSamples: number,
    hashMapConfig?: HashMapConfig<T>,
): Distribution<T> {
    let samples = hamt.make(
        hashMapConfig && {
            hash: hashMapConfig.hash,
            keyEq: hashMapConfig.equals,
        },
    ) as HamtMap<T, number>;
    for (let i = 0; i < nSamples; i++) {
        samples = samplingWalkTree(1, samples, distribution);
    }

    const resultTree = [] as Distribution<T>;

    for (const [result, prob] of samples.entries()) {
        resultTree.push(Possibility.constant(prob / nSamples, result));
    }

    return resultTree;
}
