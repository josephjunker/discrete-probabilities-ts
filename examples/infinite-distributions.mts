/*
 * Recursion can be used to create infinite distributions. In this case we can define the
 * binomial distribution.
 *
 * The binomial distribution is defined by the number of times that an event occurs. For
 * example, we can flip a coin repeatedly, continuing as long as it lands on heads, and
 * stopping when it lands on tails. The number of heads we saw in a row will follow a binomial
 * distribution.
 */

import {
    chain,
    type Distribution,
    explore,
    exploreToEpsilon,
    flip,
    fullyResolveExact,
    result,
    roll,
    truncate,
} from "../src/index.mts";

function binomialDistribution(): Distribution<number> {
    function recursive(totalHeads: number): Distribution<number> {
        return chain(flip(0.5), (isHeads) =>
            isHeads ? recursive(totalHeads + 1) : result(totalHeads),
        );
    }

    return recursive(0);
}

/*
 * Working with infinite distributions adds some wrinkles. We cannot fully explore their
 * probabilities in an exact manner. Further, the sampling approach used by this library will
 * also attempt to fully explore the possibility tree. We therefore have to make the
 * distribution finite before we attempt to view its results.
 *
 * There are two ways we can do this: `explore` and `exploreToEpsilon`.
 */

// The `explore` function takes a `depth` argument which controls the number of samples we
// should unfold. In this case we unfold 3 coin flips.
const expandedBinomial1 = explore(3, binomialDistribution());

// `explore` returns another probability distribution, which has been partially flattened.
// This Distribution is still infinite, but we can see part of the results.
console.dir(expandedBinomial1);
/*
 * [
 *     Thunk { probability: 0.0625, fn: [Function (anonymous)] },
 *     Thunk { probability: 0.0625, fn: [Function (anonymous)] },
 *     Constant { probability: 0.5, value: 0 },
 *     Constant { probability: 0.25, value: 1 },
 *     Constant { probability: 0.125, value: 2 }
 * ]
 *
 * A Thunk indicates laziness. There is a 1/16 chance that the fourth flip returns heads,
 * and a 1/16 chance that it returns tails. These two possibilities are not yet explored.
 */

// If we want to view the finite portion of the data which we have explored then we can
// truncate the distribution, dropping the unexplored portions.
const truncationResults1 = truncate(expandedBinomial1);

// The truncation result is an object with the keys `truncated` and `truncationError`.
console.dir(truncationResults1.truncated);
/*
 * [
 *   Constant { probability: 0.5, value: 0 },
 *   Constant { probability: 0.25, value: 1 },
 *   Constant { probability: 0.125, value: 2 }
 * ]
 *
 * Note that these values do not add up to 1. There is a 1/8 chance which is unaccounted for.
 * `truncationError` tells us this lost portion.
 */
console.log(truncationResults1.truncationError); // 0.125

// --------

/*
 * Using `explore` in this way requires peering inside of a model's abstraction in order to
 * know how deep unfolding should be done. A better way is to explore until the unknown
 * portion is acceptably small. We can do so with `exploreToEpsilon`.
 */

// Here we are specifying that we are willing to accept a 1% error in our approximation.
const expandedBinomial2 = exploreToEpsilon(binomialDistribution(), 0.01);

console.dir(expandedBinomial2);
/*
 * [
 *   Thunk { probability: 0.00390625, fn: [Function (anonymous)] },
 *   Thunk { probability: 0.00390625, fn: [Function (anonymous)] },
 *   Constant { probability: 0.5, value: 0 },
 *   Constant { probability: 0.25, value: 1 },
 *   Constant { probability: 0.125, value: 2 },
 *   Constant { probability: 0.0625, value: 3 },
 *   Constant { probability: 0.03125, value: 4 },
 *   Constant { probability: 0.015625, value: 5 },
 *   Constant { probability: 0.0078125, value: 6 }
 * ]
 *
 * The system has iteratively invoked `explore` for us, stopping once the error margin
 * is acceptably small.
 */

/*
 * It is reasonable to wonder why these explore functions return probability distributions
 * rather than final results. The reason is that we can use these distributions as inputs
 * to further distributions. For example, say that every time our coin flip returns heads
 * we will roll a six-sided die. What do we expect the total value of our rolls to be?
 */

const totalRollModel = chain(
    // This call to `truncate` is essential; it converts our partially-explored infinite
    // distribution into a fully explored finite one.
    truncate(expandedBinomial2).truncated,
    (headCount) => {
        console.log({ headCount });
        function recursive(totalSum: number, i: number): Distribution<number> {
            if (i < headCount)
                return chain(roll(6), (rollResult) =>
                    recursive(totalSum + rollResult, i + 1),
                );

            return result(totalSum);
        }

        return recursive(0, 0);
    },
);

// Because we are using a finite approximation of the binomial distribution, the
// distribution of roll results is also finite. This means that we can fully explore it.
console.dir(fullyResolveExact(totalRollModel));
/*
 * [
 *   { probability: 0.5039370078740169, value: 0 },
 *   { probability: 0.04199475065616807, value: 1 },
 *   { probability: 0.04549431321084874, value: 2 },
 *   { probability: 0.04928550597841947, value: 3 },
 *   { probability: 0.05339263147662109, value: 4 },
 *   { probability: 0.05784201743300619, value: 5 },
 *   { probability: 0.06266218555242337, value: 6 },
 *   { probability: 0.025889269628333537, value: 7 },
 *   { probability: 0.024547061825605166, value: 8 },
 *   { probability: 0.022801162200403985, value: 9 },
 *   { probability: 0.020593345970642593, value: 10 },
 *   { probability: 0.017858300119892617, value: 11 },
 *   { probability: 0.0145227795599622, value: 12 },
 *   { probability: 0.010504763293476892, value: 13 },
 *   { probability: 0.009212173131135964, value: 14 },
 *   { probability: 0.00791823282892111, value: 15 },
 *   { probability: 0.006655345743819066, value: 16 },
 *   { probability: 0.0054640160720650375, value: 17 },
 *   { probability: 0.004394536523983815, value: 18 },
 *   { probability: 0.0035086759988333023, value: 19 },
 *   { probability: 0.0028813672596478394, value: 20 },
 *   { probability: 0.002310764395191079, value: 21 },
 *   { probability: 0.0018059808496157775, value: 22 },
 *   { probability: 0.0013741048572631588, value: 23 },
 *   { probability: 0.0010185117678192768, value: 24 },
 *   { probability: 0.0007371763714721497, value: 25 },
 *   { probability: 0.000520985224069212, value: 26 },
 *   { probability: 0.00035204897227351944, value: 27 },
 *   { probability: 0.000226317196461549, value: 28 },
 *   { probability: 0.00013771426719808003, value: 29 },
 *   { probability: 0.00007898318265772335, value: 30 },
 *   { probability: 0.000042529406046466726, value: 31 }
 *   { probability: 0.00002126470302323329, value: 32 },
 *   { probability: 0.000009450979121436993, value: 33 },
 *   { probability: 0.0000035441171705388734, value: 34 },
 *   { probability: 0.00000101260490586825, value: 35 },
 *   { probability: 1.6876748431137498e-7, value: 36 },
 * ]
 *
 * (log output has been rearranged for legibility)
 *
 * Note that the approximation error from our truncation has creeped in. There should be a
 * probability of 0.5 that the sum is 0, but instead we have a probability of 0.503
 */
