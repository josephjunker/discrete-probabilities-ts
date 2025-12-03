/*
 * This example is taken directly from the paper `Embedded Probabilistic Programming`.
 *
 * Bayes's rule falls out of the implementation of `explore` "for free". That is, we never
 * have to explicitly specify or invoke it, but our solutions will still be consistent with
 * its results.
 *
 * For this example, say that we see that the grass is wet. This could have been caused by
 * it raining last night, or it could be caused by a sprinkler, or it could have been caused
 * by some unknown factor. Each of these have a certain probability of making the grass wet.
 *
 * Given the probababilities of things causing wet grass, we want to "work backwards" and
 * find out the probability that it rained last night.
 */

import {
    chainRecord,
    type Distribution,
    flip,
    fullyResolveExact,
    impossible,
    result,
} from "../src/index.mts";

// We have to help TypeScript's type inference by specifying `boolean` as the wrapped type.
// Otherwise TypeScript will infer the type as `unknown`. This is perfectly safe; if you
// change `boolean` to any other type then TypeScript will report the mismatch as an error.
const grassModel: Distribution<boolean> = chainRecord(
    // The first argument to `chainRecord` is a record of named probability distributions.
    {
        // Before taking any other observations into account, our prior assumption is that
        // there was a 30% chance that it rained last night and a 50% chance that the
        // sprinkler ran last night.
        didRain: flip(0.3),
        sprinklerDidRun: flip(0.5),

        // If it rained then there is a 90% chance that the grass would be wet this morning.
        // If the sprinkler ran yesterday night then there is an 80% chance that the grass
        // would still be wet this morning.
        rainCausesWetGrass: flip(0.9),
        sprinklerCausesWetGrass: flip(0.8),

        // It could be that some unknown factor caused the grass to be wet. We say that
        // there is a 10% chance of this.
        somethingElseCausesWetGrass: flip(0.1),
    },
    // The second argument to `chainRecord` is a function which takes in data sampled from
    // these probability distributions and computes a result based off of them.
    // We can do arbitrary computations on this data and return arbitrary values. (See the
    // "non-primitive-values.mts" example for caveats.)
    ({
        didRain,
        sprinklerDidRun,
        rainCausesWetGrass,
        sprinklerCausesWetGrass,
        somethingElseCausesWetGrass,
    }) => {
        // All of these values are normal booleans.
        const grassIsWet =
            (didRain && rainCausesWetGrass) ||
            (sprinklerDidRun && sprinklerCausesWetGrass) ||
            somethingElseCausesWetGrass;

        // By the statement of the problem above, we have observed that the grass is wet.
        // Therefore, it is impossible that the grass is not wet. Returning `impossible()`
        // ensures that the cases where the grass is not wet are excluded from the final
        // probabilities.
        if (!grassIsWet) return impossible();

        // The return value from `chain` or `chainResult` must be either another call to
        // `chain` or `chainResult`, or be another probability distribution, or be wrapped
        // via the `result` function.
        //
        // (To be more precise: the return value must itself be a Distribution. `result`
        // creates a distribution with a single element, which has probability 1.)
        return result(didRain);
    },
);

/*
 * Now that we've defined our model we can do inference on it, in order to determine the
 * final result.
 */

const probabilityOfRain = fullyResolveExact(grassModel);

console.dir(probabilityOfRain, { depth: null });
/*
 * Logs:
 * [
 *    { probability: 0.5315285572796302, value: false },
 *    { probability: 0.46847144272036984, value: true }
 * ]
 *
 * Under the assumptions of our model, there is a 46.8% chance that it rained last night.
 */
