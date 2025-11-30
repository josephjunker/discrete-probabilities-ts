import { type Distribution, Possibility } from "./data.mts";

export type Choices<T> = Array<[number, T]>;

export function weightedChoice<T>(choices: Choices<T>): Distribution<T> {
    if (choices.length === 0)
        throw new Error("Cannot take a weighted choice of nothing");
    return choices.map(([prob, value]) => Possibility.constant(prob, value));
}

export function fairChoice<T>(choices: Array<T>): Distribution<T> {
    if (choices.length === 0)
        throw new Error("Cannot take a fair choice of nothing");
    const share = 1 / choices.length;

    return choices.map((choice) => Possibility.constant(share, choice));
}

export function flip(p: number): Distribution<boolean> {
    return weightedChoice([
        [p, true],
        [1 - p, false],
    ]);
}

export function roll(sides: number): Distribution<number> {
    const odds = 1 / sides;
    const choices = [] as Choices<number>;

    for (let i = 1; i <= sides; i++) {
        choices.push([odds, i]);
    }

    return weightedChoice(choices);
}

export function binomial(p: number): Distribution<number> {
    function recursive(n: number): Distribution<number> {
        return chain(flip(p), (isHeads) =>
            isHeads ? recursive(n + 1) : result(n),
        );
    }

    return recursive(0);
}

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

type DistToDict<T extends Record<string, Distribution<unknown>>> = {
    [Name in keyof T]: T[Name] extends Distribution<infer Out> ? Out : never;
};

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

export function impossible<T>(): Distribution<T> {
    return [];
}

export function result<T>(value: T): Distribution<T> {
    return [Possibility.constant(1, value)];
}
