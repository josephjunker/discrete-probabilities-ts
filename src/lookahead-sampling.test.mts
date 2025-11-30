import { suite } from "uvu";
import * as assert from "uvu/assert";
import hamt from "hamt_plus";

import { Possibility, type Distribution } from "./data.mts";
import {
    expandLevel,
    sample,
    samplingWalkTree,
} from "./lookahead-sampling.mts";
import {
    mapToDistribution,
    fullyResolvedApproximatelyEqual,
    probabilityMapsApproximatelyEqual,
    fullyResolvedDistToMap,
} from "./test-utils.mts";
import { flip, impossible, multiChain, result } from "./distributions.mts";
import { explore } from "./inference.mts";

const expandLevel_tests = suite("expandLevel");

expandLevel_tests("it should collect constant branches into samples", () => {
    const dist = [
        Possibility.constant(0.5, 1),
        Possibility.constant(0.2, 2),
        Possibility.constant(0.2, 3),
        Possibility.constant(0.1, 2),
    ];

    const expanded = expandLevel(1, hamt.make<number>(), dist);

    assert.ok(
        fullyResolvedApproximatelyEqual(mapToDistribution(expanded.samples), [
            Possibility.constant(0.5, 1),
            Possibility.constant(0.3, 2),
            Possibility.constant(0.2, 3),
        ]),
    );
});

expandLevel_tests("it should expand thunks", () => {
    const dist = [
        // Normal thunk
        Possibility.thunk(0.5, () => [
            Possibility.constant(0.7, 1),
            Possibility.constant(0.3, 2),
        ]),
        // Expanded values should be normalized
        Possibility.thunk(0.2, () => [
            Possibility.constant(1, 3),
            Possibility.constant(0.5, 4),
            Possibility.constant(0.5, 5),
        ]),
        // Constant (should be added as sample)
        // The internal probability of the constant branch should be ignored.
        Possibility.thunk(0.2, () => [Possibility.constant(999, 6)]),
        // Empty (should be pruned)
        Possibility.thunk(0.1, () => []),
    ];

    const expanded = expandLevel(1, hamt.make<number>(), dist);

    assert.ok(
        fullyResolvedApproximatelyEqual(mapToDistribution(expanded.samples), [
            Possibility.constant(0.2, 6),
        ]),
    );

    assert.equal(expanded.nestedChoices.length, 2);
    assert.equal(expanded.nestedChoices[0]![0], 0.5);
    assert.equal(expanded.nestedChoices[1]![0], 0.2);

    assert.ok(
        fullyResolvedApproximatelyEqual(expanded.nestedChoices[0]![1], [
            Possibility.constant(0.7, 1),
            Possibility.constant(0.3, 2),
        ]),
    );

    assert.ok(
        fullyResolvedApproximatelyEqual(expanded.nestedChoices[1]![1], [
            Possibility.constant(0.5, 3),
            Possibility.constant(0.25, 4),
            Possibility.constant(0.25, 5),
        ]),
    );
});

expandLevel_tests(
    "it should modify probabilities by the provided scale",
    () => {
        const dist = [
            // Normal thunk
            Possibility.thunk(0.5, () => [
                Possibility.constant(0.7, 1),
                Possibility.constant(0.3, 2),
            ]),

            // Expanded values should be normalized
            Possibility.thunk(0.2, () => [
                Possibility.constant(1, 3),
                Possibility.constant(0.5, 4),
                Possibility.constant(0.5, 5),
            ]),

            // Constant (should be added as sample)
            // The internal probability of the constant branch should be ignored.
            Possibility.thunk(0.2, () => [Possibility.constant(999, 6)]),

            // Empty (should be pruned)
            Possibility.thunk(0.07, () => []),

            // Constant (should be added as sample)
            Possibility.constant(0.03, 7),
        ];

        // We pass 0.5 as the scale, so constants should be halved below
        const expanded = expandLevel(0.5, hamt.make<number>(), dist);

        assert.ok(
            fullyResolvedApproximatelyEqual(
                mapToDistribution(expanded.samples),
                [Possibility.constant(0.1, 6), Possibility.constant(0.015, 7)],
            ),
        );

        // Non-constants (everything below here) should be unchanged, except
        // for normal normalization
        assert.equal(expanded.nestedChoices.length, 2);
        assert.equal(expanded.nestedChoices[0]![0], 0.5);
        assert.equal(expanded.nestedChoices[1]![0], 0.2);

        assert.ok(
            fullyResolvedApproximatelyEqual(expanded.nestedChoices[0]![1], [
                Possibility.constant(0.7, 1),
                Possibility.constant(0.3, 2),
            ]),
        );

        // Normalization is applied here as usual
        assert.ok(
            fullyResolvedApproximatelyEqual(expanded.nestedChoices[1]![1], [
                Possibility.constant(0.5, 3),
                Possibility.constant(0.25, 4),
                Possibility.constant(0.25, 5),
            ]),
        );
    },
);

expandLevel_tests.run();

const samplingWalkTree_tests = suite("samplingWalkTree");

samplingWalkTree_tests(
    "it should return the provided samples if there are no more choices",
    () => {
        const samples = hamt.make<number>().set(1, 0.5);

        assert.equal(samplingWalkTree(0.1, samples, []), samples);
    },
);

samplingWalkTree_tests(
    "it should return a sample if the only choice is a constant",
    () => {
        const initialSamples = hamt.make<number>().set(1, 0.5);

        // 0.5 and 0.4 should multiply in the final result
        const resultSamples = samplingWalkTree(0.5, initialSamples, [
            Possibility.constant(0.4, 2),
        ]);

        assert.ok(
            probabilityMapsApproximatelyEqual(
                resultSamples,
                initialSamples.set(2, 0.2),
            ),
        );
    },
);

samplingWalkTree_tests(
    "it should add the probability of samples with the same value",
    () => {
        const initialSamples = hamt.make<number>().set(1, 0.5);

        // 0.5 and 0.4 should multiply in the final result
        const resultSamples = samplingWalkTree(0.5, initialSamples, [
            Possibility.constant(0.4, 1),
        ]);

        assert.ok(
            probabilityMapsApproximatelyEqual(
                resultSamples,
                initialSamples.set(1, 0.7),
            ),
        );
    },
);

samplingWalkTree_tests(
    "it should follow a chain of single-choice thunks",
    () => {
        const dist = [
            // none of the intermediate thunk probabilities matter, only the final constant
            Possibility.thunk(0.1, () => [
                Possibility.thunk(999, () => [
                    Possibility.thunk(1, () => [Possibility.constant(0.4, 1)]),
                ]),
            ]),
        ];

        const samples = samplingWalkTree(0.5, hamt.make<number>(), dist);

        assert.ok(
            probabilityMapsApproximatelyEqual(
                samples,
                fullyResolvedDistToMap([Possibility.constant(0.2, 1)]),
            ),
        );
    },
);

samplingWalkTree_tests.run();
