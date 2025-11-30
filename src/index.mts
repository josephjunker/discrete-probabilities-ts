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

export { explore } from "./inference.mts";

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
