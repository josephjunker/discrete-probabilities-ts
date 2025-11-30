/**
 * The combination of a value and a probability. Possibilities are lazy, and the value
 * may be internally held in a thunk. Lazy probabilities may be infinite.
 */
export abstract class Possibility<T> {
    abstract probability: number;

    /**
     * Pattern match on a Possibility, to handle it as a constant value or a lazy thunk.
     *
     * @param branches
     */
    abstract match<S>(branches: {
        constant: (probability: number, value: T) => S;
        thunk: (probability: number, fn: () => Distribution<T>) => S;
    }): S;

    /**
     * Convenience method to create a new Possibility with the same contents but a different
     * probability.
     *
     * @param newProbability
     */
    abstract withProbability(newProbability: number): Possibility<T>;

    /**
     * Attempt to cast this Possibility to a constant, returning `null` if the value is not a constant
     */
    abstract tryGetConstant(): { probability: number; value: T } | null;

    /**
     * Attempt to cast this Possibility to a lazy thunk, returning `null` if the value is not a constant
     */
    abstract tryGetThunk(): {
        probability: number;
        fn: () => Distribution<T>;
    } | null;

    /**
     * Create a Possibility with a constant value.
     *
     * @param probability
     * @param value
     */
    static constant<T>(probability: number, value: T): Possibility<T> {
        return new Constant(probability, value);
    }

    /**
     * Create a Possibility which holds a lazy thunk
     *
     * @param probability
     * @param fn A nullary function which returns a Distribution.
     */
    static thunk<T>(
        probability: number,
        fn: () => Distribution<T>,
    ): Possibility<T> {
        return new Thunk(probability, fn);
    }
}

/**
 * A Distribution is an array of {@link Possibility}. When these Possibilities contain lazy thunks,
 * exploring or sampling the distribution is a potentially infinite operation and may diverge.
 *
 * The Possibilities in this array do not need their total probability to add up to 1;
 * normalization will be applied as needed.
 *
 * When receiving a Distribution from a method you may need to call {@link shallowNormalize} on it
 * in order to make its total probabilities add up to 1. Alternatively, if the goal is to retrieve
 * final results, {@link fullyResolveExact} or {@link fullyResolveSampling} will provide normalized
 * probabilities rather than Possibility objects.
 */
export type Distribution<T> = Array<Possibility<T>>;

/**
 * @private
 */
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

/**
 * @private
 */
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

/**
 * Configuration for value-indexed hashmaps, which are needed for inference when a {@link Distribution}
 * returns non-primitive data.
 */
export type HashMapConfig<T> = {
    /**
     * Hashing function. Equivalent values **must** resolve to equal hashes. It is valid for unequivalent values
     * to receive the same hash, but this may decrease efficiency.
     */
    hash: (key: T) => number;
    /**
     * Equality testing function. This **must** return true when values are equivalent, and false when they
     * are unequivalent.
     * @returns
     */
    keyEq: (a: T, b: T) => boolean;
};

/**
 * A value with a given probability. Probabilities within WeightedValues should always be between
 * 0 (exclusive) and 1 (inclusive).
 */
export type WeightedValue<T> = {
    probability: number;
    value: T;
};
