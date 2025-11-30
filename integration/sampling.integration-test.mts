import { suite } from "uvu";
import * as assert from "uvu/assert";
import {
    flip,
    fullyResolveExact,
    fullyResolveSampling,
    impossible,
    chainRecord,
    result,
    type Distribution,
} from "../src/index.mts";

const sample_tests = suite("sample");

sample_tests("it should produce approximately the correct value", () => {
    const grassModel = chainRecord(
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

    const sampledResult = fullyResolveSampling(grassModel, 100_000);
    const exactResult = fullyResolveExact(grassModel);

    const sampledTrue = sampledResult.find(({ value }) => value)?.probability;
    const exactTrue = exactResult.find(({ value }) => value)?.probability;

    if (!sampledTrue || !exactTrue) throw new Error("FAIL");

    const delta = Math.abs(sampledTrue - exactTrue);

    assert.ok(delta < 0.01);
});

sample_tests.run();
