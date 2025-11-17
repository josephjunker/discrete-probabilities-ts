import {
    flip,
    roll,
    chain,
    impossible,
    result,
    multiChain,
    type Distribution,
    fullyResolveExact,
    explore,
    exploreToEpsilon,
    truncate,
} from "../src/index";

function show<T>(dist: Distribution<T>) {
    console.dir(fullyResolveExact(dist), {
        depth: null,
    });
}

const grassModel = chain(flip(0.3), (didRain) =>
    chain(flip(0.5), (sprinklerDidRun) =>
        chain(flip(0.9), (rainCausesWetGrass) =>
            chain(flip(0.8), (sprinklerCausesWetGrass) =>
                chain(flip(0.1), (somethingElseCausesWetGrass) => {
                    const grassIsWet =
                        (didRain && rainCausesWetGrass) ||
                        (sprinklerDidRun && sprinklerCausesWetGrass) ||
                        somethingElseCausesWetGrass;

                    if (!grassIsWet) return impossible();
                    return result(didRain);
                }),
            ),
        ),
    ),
);

const grassModel2 = multiChain(
    {
        didRain: flip(0.3),
        sprinklerDidRun: flip(0.5),
        rainCausesWetGrass: flip(0.9),
        sprinklerCausesWetGrass: flip(0.8),
        somethingElseCausesWetGrass: flip(0.1),
    },
    ({
        didRain,
        sprinklerDidRun,
        rainCausesWetGrass,
        sprinklerCausesWetGrass,
        somethingElseCausesWetGrass,
    }): Distribution<boolean> => {
        const grassIsWet =
            (didRain && rainCausesWetGrass) ||
            (sprinklerDidRun && sprinklerCausesWetGrass) ||
            somethingElseCausesWetGrass;

        return grassIsWet ? result(didRain) : impossible();
    },
);

// show(grassModel);
// show(grassModel2);

function slipperyCoin(): Distribution<boolean> {
    let lost = flip(0.9);
    let toss = flip(0.5);

    function recursive(n: number): Distribution<boolean> {
        return chain(lost, (isLost) =>
            isLost
                ? result(false)
                : chain(toss, (isHeads) => {
                      if (n === 0) return result(isHeads);
                      if (isHeads) return recursive(n - 1);
                      return result(false);
                  }),
        );
    }

    return recursive(9);
}

// show(slipperyCoin());

function ultimateCrit() {
    const d6 = roll(6);
    const d20 = roll(20);

    function recursive(n: number): Distribution<boolean> {
        return chain(d6, (firstRoll) =>
            chain(d6, (secondRoll) => {
                if (n === 0) return result(firstRoll + secondRoll === 12);

                if (firstRoll + secondRoll === 12)
                    return chain(d20, (critRoll) =>
                        critRoll ? recursive(n - 1) : result(false),
                    );

                return result(false);
            }),
        );
    }

    return recursive(3);
}

// show(ultimateCrit());

function binomialDistribution(): Distribution<number> {
    function recursive(n: number): Distribution<number> {
        return chain(flip(0.5), (isHeads) =>
            isHeads ? recursive(n + 1) : result(n),
        );
    }

    return recursive(0);
}

const expandedBinomial = exploreToEpsilon(binomialDistribution(), 0.001);

console.dir(truncate(expandedBinomial).values);
