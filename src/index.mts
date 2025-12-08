export {
    Possibility,
    type HashMapConfig,
    type Distribution,
    type WeightedValue,
} from "./data.mts";

export { rejectionSampling } from "./rejection-sampling.mts";

export { sample } from "./lookahead-sampling.mts";

export {
    exploreToEpsilon,
    fullyResolveSampling,
    fullyResolveExact,
    truncate,
} from "./wrappers.mts";

export { shallowNormalize } from "./utils.mts";

export { explore } from "./exact-inference.mts";

export {
    type Choices,
    weightedChoice,
    fairChoice,
    flip,
    roll,
    binomial,
    impossible,
    result,
    chain,
    chainRecord,
} from "./distributions.mts";
