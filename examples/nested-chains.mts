/*
 * Invocations of the `chain` method can be nested. This is often harder to read than when
 * using the `chainRecord` function.
 *
 * This is what the example from `bayesian-inference.mts` looks like when using nested
 * `chain` calls. View that file for a full explanation of what this model is doing and why.
 */

import {
    chain,
    flip,
    impossible,
    result,
    type Distribution,
} from "../src/index.mts";

const grassModel: Distribution<boolean> = chain(flip(0.3), (didRain) =>
    chain(flip(0.5), (sprinklerDidRun) =>
        chain(flip(0.9), (rainCausesWetGrass) =>
            chain(flip(0.8), (sprinklerCausesWetGrass) =>
                chain(flip(0.1), (somethingElseCausesWetGrass) => {
                    const grassIsWet =
                        (didRain && rainCausesWetGrass) ||
                        (sprinklerDidRun && sprinklerCausesWetGrass) ||
                        somethingElseCausesWetGrass;

                    if (!grassIsWet) return impossible();

                    return result(didRain);
                }),
            ),
        ),
    ),
);
