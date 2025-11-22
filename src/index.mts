export { Possibility, type HashMapConfig, type Distribution } from "./data.mts";

export {
    sample,
    rejectionSampling,
    explore,
    exploreToEpsilon,
    fullyResolveExact,
    fullyResolveSampling,
    shallowNormalize,
    truncate,
    type WeightedValue,
} from "./inference.mts";

export {
    weightedChoice,
    fairChoice,
    flip,
    roll,
    impossible,
    result,
    chain,
    multiChain,
} from "./distributions.mts";
