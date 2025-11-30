import { type Distribution, Possibility } from "./data.mts";

/**
 * A compact definition of weighted choices. The weights do not need to add up to 1; they will be
 * normalized as needed.
 */
export type Choices<T> = Array<[number, T]>;

/**
 * Get a distribution which returns one of the provided choices. Choices will be selected in proportion
 * to their provided weights. If all weights are equal, {@link fairChoice} may be used instead
 */
export function weightedChoice<T>(choices: Choices<T>): Distribution<T> {
    if (choices.length === 0)
        throw new Error("Cannot take a weighted choice of nothing");
    return choices.map(([prob, value]) => Possibility.constant(prob, value));
}

/**
 * Get a distribution which returns one of the provided choices, with each choice having equal
 * probability. If the goal is to have some choices more common than others, {@link weightedChoice}
 * may be used instead.
 */
export function fairChoice<T>(choices: Array<T>): Distribution<T> {
    if (choices.length === 0)
        throw new Error("Cannot take a fair choice of nothing");
    const share = 1 / choices.length;

    return choices.map((choice) => Possibility.constant(share, choice));
}

/**
 * Flip a (possibily biased) coin, returning `true` or `false` with the provided probability.
 *
 * @param p The probability that the value will be `true`. Must be between 0 and 1 (exclusive).
 */
export function flip(p: number): Distribution<boolean> {
    return weightedChoice([
        [p, true],
        [1 - p, false],
    ]);
}

/**
 * Roll a die with the given number of sides. This returns a number between 1 and the provided
 * number of sides (inclusive). All values are equally likely.
 *
 * @param sides The number of sides on the die. Must be greater than or equal to 1.
 */
export function roll(sides: number): Distribution<number> {
    if (sides < 1) throw new Error("`sides` must be at least 1");

    const odds = 1 / sides;
    const choices = [] as Choices<number>;

    for (let i = 1; i <= sides; i++) {
        choices.push([odds, i]);
    }

    return weightedChoice(choices);
}

/**
 * Flip a (possibly biased) coin. If it is heads, flip it again. Repeat this until the coin lands
 * on tails. Return the number of heads.
 *
 * This is an infinite distribution. Inference will diverge if it is provided to {@link explore}
 * or {@link sample} without a maximum depth provided. Working with binomial distributions will
 * be easier and inference will be more efficient if they are first flattened into approximate
 * finite distributions using {@link exploreToEpsilon}.
 *
 * @param p The probability of the coin landing on heads
 * @returns
 */
export function binomial(p: number): Distribution<number> {
    function recursive(n: number): Distribution<number> {
        return chain(flip(p), (isHeads) =>
            isHeads ? recursive(n + 1) : result(n),
        );
    }

    return recursive(0);
}

/**
 * Apply a function to the results of sampling a distribution, returning a new distribution.
 * Returning an empty distribution indicates that the sampled value was impossible, and will result
 * in that value being omitted from probability calculations. (See documentation for more details.)
 * This can be done explicitly by using the {@link impossible} function. Returning a final result
 * must be done by returning a distribution containing a single value; this can be done succinctly
 * using the {@link result} function.
 *
 * An explicit type annotation is frequently needed on `chain` methods, due to limitations in
 * TypeScript's type inference. As long as TypeScript is running in strict mode this is perfectly safe;
 * an incorrect annotation will result in TypeScript reporting an error, and will not cause runtime
 * errors to be missed.
 *
 * (`chain` is the "bind"/"flatMap" function on the Distribution monad.)
 *
 * `chain` will produce Distributions which contain lazy thunks. These distributions may be flattened
 * using {@link explore} or {@link sample}.
 *
 * @example
 * // Sum the results of rolling a pair of dice
 * chain(roll(6), (firstRoll) =>
 *     chain(roll(6), (secondRoll) =>
 *         result(firstRoll + secondRoll)));
 *
 * @example
 * // Roll two dice and observe that neither of them rolled a 5. What is the distribution
 * // of their sums?
 * const rollTwoModel2: Distribution<number> = chain(roll(6), (firstRoll) =>
 *     chain(roll(6), (secondRoll) => {
 *         if (firstRoll === 5 || secondRoll === 5) return impossible();
 *
 *         return result(firstRoll + secondRoll);
 *     }),
 * );
 */
export function chain<TIn, TOut>(
    distribution: Distribution<TIn>,
    fn: (arg: TIn) => Distribution<TOut>,
): Distribution<TOut> {
    return distribution.map((node) =>
        node.match({
            constant: (prob, value) => Possibility.thunk(prob, () => fn(value)),
            thunk: (prob, innerFn) =>
                Possibility.thunk(prob, () => chain(innerFn(), fn)),
        }),
    );
}

/**
 * Utility function. See {@link chainRecord} for usage example.
 */
type DistToDict<T extends Record<string, Distribution<unknown>>> = {
    [Name in keyof T]: T[Name] extends Distribution<infer Out> ? Out : never;
};

/**
 * Helper function for making multiple calls to {@link chain} without excessive nesting.
 * See `chain`'s documentation for more details.
 *
 * As with `chain`, an explicit type annotation is often needed to prevent TypeScript from inferring
 * the result type as `Distribution<unknown>`. So long as TypeScript is running in strict mode these
 * annotations are safe. Providing the wrong type to them will result in a compile time type error,
 * and will not cause runtime errors.
 *
 * @param dists An object whose keys are strings and whose values are Distributions
 * @param fn A single argument function from an object to a Distribution. The function will receive an
 *      object whose entries are the result of sampling from each of the specified distributions. (See
 *      example below.)
 *
 * @example
 * const rollTwoModel: Distribution<number> = chainRecord(
 *    {
 *        firstRoll: roll(6),
 *        secondRoll: roll(6),
 *    },
 *    ({ firstRoll, secondRoll }) => result(firstRoll + secondRoll));
 */
export function chainRecord<
    Dists extends Record<string, Distribution<unknown>>,
    TOut,
>(
    dists: Dists,
    fn: (args: DistToDict<Dists>) => Distribution<TOut>,
): Distribution<TOut> {
    const entries = [...Object.entries(dists)];

    const unsafeCastFunction = fn as (
        arg: Record<string, unknown>,
    ) => Distribution<TOut>;

    function recursive(
        i: number,
        argsSoFar: Record<string, unknown>,
    ): Distribution<TOut> {
        const entry = entries[i];
        if (!entry) return unsafeCastFunction(argsSoFar);

        const [name, distribution] = entry;

        return chain(distribution, (arg) => {
            return recursive(i + 1, { [name]: arg, ...argsSoFar });
        });
    }

    return recursive(0, {});
}

/**
 * Return from a call to `chain` to indicate that the observed sample is impossible.
 *
 * Equivalent to returning an empty array.
 *
 * @example
 * // Simulate the results of rolling a die, given the knowledge that the die did not roll a 5.
 * chain(roll(6), (rollResult) =>
 *     rollResult === 5 ? impossible() : result(rollResult),
 * );
 */
export function impossible<T>(): Distribution<T> {
    return [];
}

/**
 * Return from a call to `chain` to indicate that a final result was produced.
 *
 * Equivalent to returning a Distribution with a single constant value.
 *
 * @example
 * // Sum the results of rolling a pair of dice
 * chain(roll(6), (firstRoll) =>
 *     chain(roll(6), (secondRoll) =>
 *         result(firstRoll + secondRoll)));
 */
export function result<T>(value: T): Distribution<T> {
    return [Possibility.constant(1, value)];
}
