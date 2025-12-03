import { suite } from "uvu";
import * as assert from "uvu/assert";

import { explore } from "./exact-inference.mts";
import { binomial } from "./distributions.mts";
import { exploreToEpsilon, truncate } from "./wrappers.mts";

const exploreToEpsilon_tests = suite("exploreToEpsilon");

exploreToEpsilon_tests(
    "when truncated, the error should always be less than or equal to the provided argument",
    () => {
        const model = binomial(0.5);

        function test(epsilon: number) {
            const result = exploreToEpsilon(model, epsilon);
            const truncated = truncate(result);

            assert.ok(truncated.truncationError <= epsilon);
        }

        for (let epsilon = 0.999; epsilon > 0.001; epsilon -= 0.001) {
            test(epsilon);
        }
    },
);

exploreToEpsilon_tests.run();

const truncate_tests = suite("truncate");

truncate_tests(
    "it should produce the expected errors for a binomial distribution",
    () => {
        const model = binomial(0.5);
        assert.equal(truncate(model).truncationError, 1);
        assert.equal(truncate(explore(1, model)).truncationError, 0.5);
        assert.equal(truncate(explore(2, model)).truncationError, 0.25);
        assert.equal(truncate(explore(3, model)).truncationError, 0.125);
        assert.equal(truncate(explore(4, model)).truncationError, 0.0625);
    },
);

truncate_tests.run();
