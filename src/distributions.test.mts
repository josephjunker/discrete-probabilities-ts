import { suite } from "uvu";
import * as assert from "uvu/assert";

import { explore } from "./exact-inference.mts";
import { type Distribution } from "./data.mts";
import {
    binomial,
    chain,
    chainRecord,
    flip,
    impossible,
    result,
} from "./distributions.mts";

const multiChain_tests = suite("chainRecord");

multiChain_tests("it should give the same value as nested chains", () => {
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

    const grassModel2 = chainRecord(
        {
            didRain: flip(0.3),
            sprinklerDidRun: flip(0.5),
            rainCausesWetGrass: flip(0.9),
            sprinklerCausesWetGrass: flip(0.8),
            somethingElseCausesWetGrass: flip(0.1),
        },
        ({
            didRain,
            sprinklerDidRun,
            rainCausesWetGrass,
            sprinklerCausesWetGrass,
            somethingElseCausesWetGrass,
        }): Distribution<boolean> => {
            const grassIsWet =
                (didRain && rainCausesWetGrass) ||
                (sprinklerDidRun && sprinklerCausesWetGrass) ||
                somethingElseCausesWetGrass;

            return grassIsWet ? result(didRain) : impossible();
        },
    );

    assert.equal(explore(null, grassModel), explore(null, grassModel2));
});

multiChain_tests.run();

const binomial_tests = suite("binomial");

binomial_tests("it should produce the expected values", () => {
    const explored = explore(5, binomial(0.5));

    const zero = explored.find(
        (possibility) => possibility.tryGetConstant()?.value === 0,
    );
    assert.equal(zero?.probability, 0.5);

    const one = explored.find(
        (possibility) => possibility.tryGetConstant()?.value === 1,
    );
    assert.equal(one?.probability, 0.25);

    const two = explored.find(
        (possibility) => possibility.tryGetConstant()?.value === 2,
    );
    assert.equal(two?.probability, 0.125);
});

binomial_tests.run();
