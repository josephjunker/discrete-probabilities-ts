There are a number of enhancements which would be welcome additions to this project. If you are interested in contributing to this project, any one of these would be welcome. (It is okay to open discussions before working on them if you would like further context.) Please see [Contributing.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before opening any pull requests.

### Examples

This is the place where there is the most low-hanging fruit. There's a ton of research out there on probabilistic programming, and it would be great to see how much of it can be applied in a fully discrete setting.

Things I would like the most:

- Recommendation systems

- Bayesian spam filtering

- Generative probabilistic grammars

Examples using cards and dice are fine, but please do not submit examples based off of gambling or casino games.

### Additional distributions

There are a large number of potentially interesting probability distributions out there, and this project only supports a couple of them. More distributions would open up more possible usages.

### Utility functions

It would be nice to have some utilities for demonstrating and viewing the output of inference.

- Statistical functions for checking the variance of sampling, to ensure that it is converging on reliable results.

- Some sort of histogram viewer for final probabilities. I'd prefer to not add additional dependencies for this.

### Recursion schemes

As can be seen in the [infinite distribution example](./examples/infinite-distributions.mts), doing sampling repeatedly involves writing sometimes tricky recursive code. This could probably be improved by providing proper fold/unfold functions. There is a design space to explore here.

### Tooling

I used `tsup` for this project before I realized it was deprecated. I would like to switch to `esbuild`.

I would like to use eslint. The lint settings should be as strict as possible while not alerting on existing patterns within the codebase.
