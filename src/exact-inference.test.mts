import { suite } from "uvu";
import * as assert from "uvu/assert";

import { explore } from "./exact-inference.mts";
import { Possibility, type Distribution } from "./data.mts";
import { chain, flip, impossible, result } from "./distributions.mts";
import { fullyResolvedApproximatelyEqual } from "./test-utils.mts";

const explore_tests = suite("explore");

explore_tests("it should give the expected result for the grass model", () => {
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

    const grassIsWet = explore(null, grassModel);

    assert.equal(grassIsWet.length, 2);
    const firstConstant = grassIsWet[0]?.tryGetConstant();
    assert.ok(firstConstant !== null);
    const secondConstant = grassIsWet[0]?.tryGetConstant();
    assert.ok(secondConstant !== null);

    assert.ok(
        fullyResolvedApproximatelyEqual(grassIsWet, [
            Possibility.constant(0.32199999999999995, false),
            Possibility.constant(0.2838, true),
        ]),
    );
});

explore_tests(
    "it should go to the expected depth on an infinite distribution",
    () => {
        function binomialDistribution(): Distribution<number> {
            function recursive(n: number): Distribution<number> {
                return chain(flip(0.5), (isHeads) =>
                    isHeads ? recursive(n + 1) : result(n),
                );
            }

            return recursive(0);
        }

        const expanded = explore(5, binomialDistribution());

        const thunks = expanded.filter((possibility) =>
            possibility.tryGetThunk(),
        );

        // One thunk for the next true result, one for the next false result
        assert.equal(thunks.length, 2);

        const constants = expanded.filter((possibility) =>
            possibility.tryGetConstant(),
        );

        // Constant values 0 - 5
        assert.equal(constants.length, 6);
    },
);

explore_tests.run();
