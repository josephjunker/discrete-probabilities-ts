# discrete-probabilities

This library supports writing TypeScript programs which work with discrete probability distributions as first-class values.

## Installation

```
npm install --save-exact discrete-probabilities
```

This package contains both ESM and CommonJS entrypoints and will function under both `import` and `require`.

## Basic concepts

We can create a model of the results of flipping a coin, and then perform inference on this model.

```typescript
import { flip, fullyResolveExact } from "discrete-probabilities";
const coinModel = flip(0.5);
const outcomes = fullyResolveExact(coinModel);
console.dir(outcomes);
```

This then shows the likelihood of each outcome:

```typescript
[
    { probability: 0.5, value: false },
    { probability: 0.5, value: true },
];
```

### Dependent probabilities

Probability distributions can depend on other probability distributions. Let's model flipping a coin, and then rolling a die based on the results of the coin flip. If the coin lands on heads then we'll roll a four-sided die, and if it lands on tails we'll roll a six-sided die. What are the probabilities of each possible die value?

```typescript
import { chain, flip, fullyResolveExact, roll } from "discrete-probabilities";

const coinModel = flip(0.5);

const coinDiceModel = chain(coinModel, (isHeads) =>
    isHeads ? roll(4) : roll(6),
);

const diceResults = fullyResolveExact(coinDiceModel);
console.dir(diceResults);
```

The result here will be:

```typescript
[
    { probability: 0.20833333333333331, value: 1 },
    { probability: 0.20833333333333331, value: 2 },
    { probability: 0.20833333333333331, value: 3 },
    { probability: 0.20833333333333331, value: 4 },
    { probability: 0.08333333333333333, value: 5 },
    { probability: 0.08333333333333333, value: 6 },
];
```

### Custom distribution results

Distributions are not limited to built-in types. Arbitrary code can be put into `chain`, and this code can return values of any desired type. For instance, here we create a distribution over strings and then process them into numbers. Given a word from this common sentence, how many letters will that word have?

```typescript
import {
    chain,
    fairChoice,
    fullyResolveExact,
    result,
} from "discrete-probabilities";

const sentence = "The quick brown fox jumped over the lazy dog";
const words = fairChoice(sentence.split(" "));

// We have to wrap our final result in a call to `result`.
const letterCountModel = chain(words, (word) => result(word.length));
console.dir(fullyResolveExact(letterCountModel));
```

Results in:

```typescript
[
    { probability: 0.4444444444444444, value: 3 },
    { probability: 0.2222222222222222, value: 4 },
    { probability: 0.2222222222222222, value: 5 },
    { probability: 0.1111111111111111, value: 6 },
];
```

### Distributions over objects

When a distribution is over objects (rather than over primitive values) a custom hashing and comparator object must be provided. See the [non-primitive types](./examples/non-primitive-types.mts) example for details.

### Infinite distributions

Recursion can be used to create infinite distributions. Working with such distributions requires some care, but they can be used. See the [infinite distributions](./examples/infinite-distributions.mts) example for details.

### Approximate inference

`fullyResolveExact` performs exact inference over a distribution, fully exploring it in order to determine the precise probability of every outcome. A sufficiently large model will make this impossible due to memory limitations. In that case, a sampling-based approach can be used to perform approximate inference. With a large enough number of samples the computation will begin to converge on an accurate result. See the [sampling](./examples/sampling.mts) example for details.

## API Documentation

See [api-documentation.md](./documentation/api-documentation.md).

## Types

This package is statically typed and exports `.d.ts` files. Use of TypeScript's strict mode is recommended. TypeScript frequently infers the type argument of `Distribution` as `unknown` when doing nontrivial things with `chain` and `chainRecord`, meaning that explicit type annotations are often necessary. So long as you are running in strict mode these annotations are only to help type inference and will not impact type safety. See the documentation for details.

## Acknowledgements

The core functionality of this library is based on a research paper:

> Kiselyov, Oleg & Shan, Chung-chieh. (2009). Embedded Probabilistic Programming. 360-384. 10.1007/978-3-642-03034-5_17.

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) before opening PRs, issues, or discussions. There is a list of desired enhancements in [WISHLIST.md](./WISHLIST.md).

## License

MIT
