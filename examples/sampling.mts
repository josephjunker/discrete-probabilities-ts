/*
 * When a model is very large, memory limitations may make it impossible to fully explore the
 * possibility space. When that occurs, sampling becomes necessary.
 *
 * It may be tempting to think that sampling would be easy: just run the models repeatedly with
 * random inputs and count up the results, right? Unfortunately it is not that easy, as we will
 * see below.
 */

import {
    chain,
    type Distribution,
    fullyResolveExact,
    fullyResolveSampling,
    rejectionSampling,
    result,
    roll,
    sample,
} from "../src/index.mts";

/*
 * In the role-playing game Dungeons & Dragons, characters roll dice to determine the success or
 * failure of actions. Rolling a 20 on a 20-sided die is referred to as a "critical success".
 *
 * Imagine a hypothetical (and poorly-balanced) skill in this game. A player may roll 2d6 to
 * determine how much damage they do to an enemy. If they roll the max value (12) then they
 * can roll a d20 to attempt to add additional damage; on a 20 they will repeat this process up
 * to two more times.
 *
 * What is the probability that the player achieves the maximum 36 damage?
 */
function repeatedCritModel() {
    // Create the distributions we'll be working with
    const d6 = roll(6);
    const d20 = roll(20);

    function recursive(remainingAttacks: number): Distribution<boolean> {
        return chain(d6, (firstRoll) =>
            chain(d6, (secondRoll) => {
                if (remainingAttacks === 0)
                    return result(firstRoll + secondRoll === 12);

                if (firstRoll + secondRoll === 12)
                    return chain(d20, (critRoll) =>
                        critRoll === 20
                            ? recursive(remainingAttacks - 1)
                            : result(false),
                    );

                return result(false);
            }),
        );
    }

    return recursive(2);
}

/*
 * Analytically, we can compute the probability of this outcome without using the library:
 */

const probOf12 = (1 / 6) * (1 / 6);
const probOf20 = 1 / 20;
const analyticalProbability =
    probOf12 * probOf20 * probOf12 * probOf20 * probOf12;

console.log(analyticalProbability); // 5.3583676268861454e-8

/*
 * There is approximately a 1 in 18 million chance of this outcome. We can find this result
 * by exploring the model as well.
 */
console.log(fullyResolveExact(repeatedCritModel()));
/*
 * [
 *    { probability: 0.9999999464163237, value: false },
 *    { probability: 5.3583676268861414e-8, value: true }
 * ]
 */

/*
 * Now, what happens if we attempt the naieve sampling method described above? Simulating
 * inputs to the model fully randomly is referred to as "rejection sampling". This library
 * does provide a way to use this approach, but it is highly inaccurate when running models
 * which have low probability outcomes.
 */

// Run 10 million samples; takes around 4 seconds on my machine
console.dir(rejectionSampling(repeatedCritModel(), 10_000_000));
/*
 * [ Constant { probability: 1, value: false } ]
 *
 * In ten million samples we didn't get a single success, so we erroneously report that
 * there is no possibility of returning `true`. This isn't surprising, given that there's
 * only a 1 in 18 million chance of success. To get an accurate estimate we would have to
 * run many many times 18 million, which is not practical.
 */

/*
 * Fortunately this library provides a sampling method which is significantly more accurate
 * than naieve rejection sampling.
 */

// Run 10 thousand samples; takes around 0.15 seconds on my machine
console.dir(fullyResolveSampling(repeatedCritModel(), 10_000));
/*
 * [
 *   { probability: 0.9999999456018519, value: false },
 *   { probability: 5.439814814815983e-8, value: true }
 * ]
 *
 * Not perfect, but not too far off either! Running repeatedly will give different results. We
 * can increase the accuracy by upping the number of samples.
 */

// Run 1 million samples; takes around 4 seconds on my machine
console.dir(fullyResolveSampling(repeatedCritModel(), 1_000_000));
/*
 * [
 *   { probability: 0.9999999472685185, value: false },
 *   { probability: 5.273148148707216e-8, value: true }
 * ]
 *
 * Running the script a few times will show that there's much less variance in the results
 * at higher sample counts.
 */

/*
 * Just like how `explore` can be used to create intermediate Distributions for reuse,
 * we don't have to fully convert sampled distributions into flat probability results.
 * Instead of calling `fullyResolveSampling`, we can call `sample` directly:
 */
const sampled = sample(repeatedCritModel(), 10_000);
console.dir(sampled);
/*
 * [
 *  Constant { probability: 0.9999999525460848, value: false },
 *  Constant { probability: 4.745370370370368e-8, value: true }
 * ]
 *
 * `sampled` is now a Distribution which can be used in further models. In general, simplifying
 * distributions using `explore` or `sample` can speed up their later usage. Be aware though
 * that sampling introduces error margins, which can be multiplied as the new distributions are
 * used further.
 */

/*
 * It's worth noting that, per-sample, using `fullyResolveSampling` is an order of magnitude
 * slower than naive rejection sampling. All the same, the enhanced sampling procedure can
 * get reasonably accurate results with only 10,000 samples, while naive rejection sampling
 * failed miserably when given 1000x as many.
 *
 * Why is this? A full explanation can be found by reading "Embedded probabilistic programming",
 * but briefly, `sample` combines both stochastic sampling and exact lookahead exploration. This
 * is why we can only sample from finite distributions. Running `sample(distribution, 1)` makes
 * a single pass over the distribution, but during this pass the inference algorithm will
 * perform a "trace" which collects multiple sample points while unfolding the nested
 * Distribution.
 */
