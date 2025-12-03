# discrete-probabilities

This library supports writing TypeScript programs which work with discrete probability distributions as first-class values.

## Trivial example

We can create a model of the results of flipping a coin.

```typescript
const coinModel = flip(0.5);
```

We can then perform inference on this model.

```typescript
const outcomes = fullyResolveExact(coinModel);
console.dir(outcomes, { depth: null });
```

This then shows the likelihood of each outcome:

```typescript
[
    { probability: 0.5, value: false },
    { probability: 0.5, value: true },
];
```

Significantly more complex flows are possible; see the documentation.

## Installation

```
npm install --save-exact discrete-probabilities
```

This package contains both ESM and CommonJS entrypoints and will function under both `import` and `require`.

## Types

This package is statically typed and exports `.d.ts` files. Use of TypeScript's strict mode is recommended. TypeScript frequently infers the type argument of `Distribution` as `unknown` when doing nontrivial things with `chain` and `chainRecord`, meaning that explicit type annotations are often necessary. So long as you are running in strict mode these annotations are only to help type inference and will not impact type safety. See the documentation for details.

## Acknowledgements

The core functionality of this library is based on a research paper:

```
Kiselyov, Oleg & Shan, Chung-chieh. (2009). Embedded Probabilistic Programming. 360-384. 10.1007/978-3-642-03034-5_17.
```

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md). There is a list of desired enhancements in [WISHLIST.md](./WISHLIST.md).

## License

MIT
