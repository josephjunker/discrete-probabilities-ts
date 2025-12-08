# API Documentation

This document covers all of the exports from this package, grouped by topic. This package's exports contains extensive docstring comments, which provide more detailed information on each export. There are a great deal of explanatory comments within this repo's examples directory as well.

## Constructing distributions

- `Possibility<T>`: A class for representing elements of distributions. You will likely never need to construct possibilities directly.

- `Distribution<T>`: The type of distributions; an array of Possibilities.

- `Choices<T>`: The type of an array of values of type `T` with weights attached. Used as an argument to `weightedChoice`.

- `weightedChoice`: Creates a distribution of weighted values.

- `fairChoice`: Creates a distribution of values which are all weighted equally.

- `flip`: Weighted coin flip. Creates a `Distribution<boolean>`, which returns `true` with the specified probability.

- `roll`: Roll a fair die with the specified number of sides. Creates a `Distribution<number>`.

- `binomial`: Simulate a binomial distribution. This is an infinite distribution; see the [infinite distributions](../examples/infinite-distributions.mts) example for an explanation of how to work with it.

## Composing distributions

See the [Bayesian inference](../examples/bayesian-inference.mts) example for a crash course on composing and working with nontrivial distributions.

- `chain`: Create one distribution based on applying arbitrary code to another.

- `chainRecord`: A more convenient way to work with nested chains.

- `result`: Wrap a value such that it can be returned from `chain` or `chainRecord`.

- `impossible`: Return from a call to `chain` or `chainRecord` to indicate that the current set of assumptions is impossible, and should be discarded when computing the final probability distribution.

## Working with intermediate distributions

See the [infinite distributions](../examples/infinite-distributions.mts) example for an explanation of the role of each of these.

- `explore`: Partially flatten a distribution, returning a new distribution.

- `truncate`: Discard the unexplored part of a distribution, introducing a rounding error.

- `exploreToEpsilon`: Explore a distribution until the rounding error that will result from its truncation is acceptably small.

- `sample`: Perform approximate inference on a distribution, returning a new distribution.

- `shallowNormalize`: Normalize the probabilities of an intermediate distribution, such that the weights of its branches sum to `1`. Unlikely to be used in practice.

- `rejectionSampling`: An inferior sampling mechanism, used as a point of comparison for `sample`. Not likely to be used in practice; see the [sampling example](../examples/sampling.mts) for more information.

## Getting results

- `WeightedValue<T>`: An object which holds a value and a probability for that value.

- `fullyResolveExact`: Turn a `Distribution<T>` into an `Array<WeightedValue<T>>`. The main point of this library, when working with models which are small enough to fit into memory.

- `fullyResolveSampling`: Turn a `Distribution<T>` into an `Array<WeightedValue<T>>`. The main point of this library, when working with models which are too large to fit into memory. The number of samples is configurable, and higher values will give more accurate results.

- `HashMapConfig`: The type of a config that must be passed to `fullyResolveExact`, `fullyResolveSampling`, `explore`, or `sample` when working with distributions of objects. See the [non-primitive types example](../examples/non-primitive-types.mts) for an explanation.
