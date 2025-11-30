import { suite } from "uvu";
import * as assert from "uvu/assert";
import { valuesApproximatelyEqual } from "./test-utils.mts";

const valuesApproximatelyEqual_tests = suite("valuesApproximatelyEqual");

valuesApproximatelyEqual_tests("it should say equal things are equal", () => {
    for (let i = 0; i < 100; i += 0.1) {
        assert.ok(valuesApproximatelyEqual(i, i));
    }
});

valuesApproximatelyEqual_tests(
    "it should say unequal things are unequal",
    () => {
        for (let i = 0.01; i < 10; i += 0.01) {
            for (let delta = 0.0011; delta < 1; delta += 0.0001) {
                assert.not.ok(valuesApproximatelyEqual(i, i + i * delta));
                assert.not.ok(valuesApproximatelyEqual(i, i - i * delta));
            }
        }
    },
);

valuesApproximatelyEqual_tests.run();
