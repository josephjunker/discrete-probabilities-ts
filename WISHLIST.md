There are a number of enhancements which would be welcome additions to this project. If you are interested in contributing to this project, any one of these would be welcome. (It is okay to open discussions before working on them if you would like further context.) Please see [Contributing.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before opening any pull requests.

### Examples

This is the place where there is the most low-hanging fruit. There's a ton of research out there on probabilistic programming, and it would be great to see how much of it can be applied in a fully discrete setting.

Things I would like the most:

- Recommendation systems

- Bayesian spam filtering

- Generative probabilistic grammars

- An example whose memory requirements mandate the usage of sampling

The original "Embedded Probabilistic Programming" paper references a probabilistic programming language benchmark suite. That could be a good source of problems.

Examples using cards and dice are fine, but please do not submit examples based off of gambling or casino games.

### Additional distributions

There are a large number of potentially interesting probability distributions out there, and this project only supports a couple of them. More distributions would open up more possible usages.

### Sampling improvements

It would be useful to be able to sample from infinite distributions. This would probably involve setting either a max depth to explore, an acceptable error margin, or both. This is kind of weird though because the point of the implementation of `sample` is to maintain accuracy at very low probabilities. So setting an acceptable error margin would have to be done very carefully. I wonder whether it could be set based on the number of samples discovered in the trace-- by the time you've collected 99% of the samples, further samples are unlikely to reveal as much new information? There's room to experiment.

From what I've seen in casual exploration, the state of the art for most probabilistic programming systems is "Markov chain Monte Carlo". I have no idea how this works, or if it is something that makes sense for discrete distributions. If it does, it could be a nice thing to have.

It could be nice to set the number of samples dynamically. Rather than saying that I want 1 million samples, could I say that I want to sample until the variance has decreased beneath a certain amount?

### Utility functions

It would be nice to have some utilities for demonstrating and viewing the output of inference.

- Statistical functions for checking the variance of sampling, to ensure that it is converging on reliable results.

- Some sort of histogram viewer for final probabilities. I'd prefer to not add additional dependencies for this.

### Recursion schemes

As can be seen in the [infinite distribution example](./examples/infinite-distributions.mts), doing sampling repeatedly involves writing sometimes tricky recursive code. This could probably be improved by providing proper fold/unfold functions. There is a design space to explore here.

### Tooling

I used `tsup` for this project before I realized it was deprecated. I would like to switch to `esbuild`.

I would like to use eslint. The lint settings should be as strict as possible while not alerting on existing patterns within the codebase.

It would be very nice to generate documentation pages from the docstrings in the codebase. I know this is tractable, I just haven't spent the time to set it up.

### Performance improvements

Zero work has gone into sampling performance. There's probably a ton of room for improvement. An immutable hashmap is used as the basic data structure; this could probably be made more efficient using a mutable one (though it would have to properly support custom hashing and equality operators.)

The best way to improve performance, I think, would be to keep the existing implementation as a reference, define optimized versions of the various operations, and then test that the two always return equivalent results. `fast-check` will help here, but writing tests for sampling functions (which rely on randomness) will be hard.

### Type Safety

It could be beneficial to make inference functions statically reject non-primitive models if they aren't given a hashmap config. I'm sure this could be done with fancy conditional types, but I'd rather have one set of functions for reference types and one for value types.
