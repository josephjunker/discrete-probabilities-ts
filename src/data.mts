export abstract class Possibility<T> {
    abstract probability: number;

    abstract match<S>(branches: {
        constant: (probability: number, value: T) => S;
        thunk: (probability: number, fn: () => Distribution<T>) => S;
    }): S;

    abstract withProbability(newProbability: number): Possibility<T>;

    abstract tryGetConstant(): { probability: number; value: T } | null;
    abstract tryGetThunk(): {
        probability: number;
        fn: () => Distribution<T>;
    } | null;

    static constant<T>(probability: number, value: T): Possibility<T> {
        return new Constant(probability, value);
    }

    static thunk<T>(
        probability: number,
        fn: () => Distribution<T>,
    ): Possibility<T> {
        return new Thunk(probability, fn);
    }
}

export type Distribution<T> = Array<Possibility<T>>;

class Constant<T> extends Possibility<T> {
    public probability: number;
    public value: T;

    constructor(probability: number, value: T) {
        super();
        this.probability = probability;
        this.value = value;
    }

    match<S>(branches: {
        constant: (probability: number, value: T) => S;
        thunk: (probability: number, fn: () => Distribution<T>) => S;
    }): S {
        return branches.constant(this.probability, this.value);
    }

    withProbability(newProbability: number) {
        return new Constant(newProbability, this.value);
    }

    tryGetConstant(): { probability: number; value: T } | null {
        return {
            probability: this.probability,
            value: this.value,
        };
    }

    tryGetThunk(): {
        probability: number;
        fn: () => Distribution<T>;
    } | null {
        return null;
    }
}

class Thunk<T> extends Possibility<T> {
    public probability: number;
    public fn: () => Distribution<T>;

    constructor(probability: number, fn: () => Distribution<T>) {
        super();
        this.probability = probability;
        this.fn = fn;
    }

    match<S>(branches: {
        constant: (probability: number, value: T) => S;
        thunk: (probability: number, fn: () => Distribution<T>) => S;
    }): S {
        return branches.thunk(this.probability, this.fn);
    }

    withProbability(newProbability: number) {
        return new Thunk(newProbability, this.fn);
    }

    tryGetConstant(): { probability: number; value: T } | null {
        return null;
    }

    tryGetThunk(): {
        probability: number;
        fn: () => Distribution<T>;
    } | null {
        return {
            probability: this.probability,
            fn: this.fn,
        };
    }
}

export type HashMapConfig<T> = {
    hash: (key: T) => number;
    keyEq: (a: T, b: T) => boolean;
};
