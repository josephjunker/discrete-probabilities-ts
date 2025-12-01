import {
    fairChoice,
    flip,
    roll,
    chain,
    impossible,
    result,
    chainRecord,
    type Distribution,
    fullyResolveExact,
    explore,
    exploreToEpsilon,
    type HashMapConfig,
    type WeightedValue,
    fullyResolveSampling,
} from "../src/index.mts";

function show<T>(dist: Distribution<T>) {
    console.dir(fullyResolveExact(dist), {
        depth: null,
    });
}

const rollTwoModel = chain(roll(6), (firstRoll) =>
    chain(roll(6), (secondRoll) => result(firstRoll + secondRoll)),
);

const rollTwoModel2: Distribution<number> = chain(roll(6), (firstRoll) =>
    chain(roll(6), (secondRoll) => {
        if (firstRoll === 5 || secondRoll === 5) return impossible();

        return result(firstRoll + secondRoll);
    }),
);

const rollTwoModel3 = chainRecord(
    {
        firstRoll: roll(6),
        secondRoll: roll(6),
    },
    ({ firstRoll, secondRoll }) => result(firstRoll + secondRoll),
);

chain(roll(6), (rollResult) =>
    rollResult === 5 ? impossible() : result(rollResult),
);

const grassModel: Distribution<boolean> = chain(flip(0.3), (didRain) =>
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

const grassModel2 = chainRecord(
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

function mapToTree<T>(map: HamtMap<T, number>): Array<WeightedValue<T>> {
    const result = [] as Array<WeightedValue<T>>;
    for (const [value, probability] of map.entries()) {
        result.push({ probability, value });
    }

    return result;
}

/*
console.dir(mapToTree(samplingWalkTree(1, hamt.make(), grassModel)), {
    depth: null,
});
*/

// show(grassModel);
// show(grassModel2);
/*
console.dir(sample(grassModel, 100_000), {
    depth: null,
});
*/
// console.dir(fullyResolveSampling(grassModel, 100_000));

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
// console.dir(fullyResolveSampling(ultimateCrit(), 100_000));

function binomialDistribution(): Distribution<number> {
    function recursive(n: number): Distribution<number> {
        return chain(flip(0.5), (isHeads) =>
            isHeads ? recursive(n + 1) : result(n),
        );
    }

    return recursive(0);
}

const expandedBinomial = exploreToEpsilon(binomialDistribution(), 0.001);

// console.dir(truncate(expandedBinomial).values);

const suits = ["Hearts", "Clubs", "Diamonds", "Spades"];
const ranks = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
];

const deck = explore(
    null,
    chain(fairChoice(ranks), (rank) =>
        chain(fairChoice(suits), (suit) =>
            result({
                rank,
                suit,
            }),
        ),
    ),
);

// show(deck);

type Suit = "Clubs" | "Hearts" | "Diamonds" | "Spades";

type Card = {
    rank: number;
    suit: Suit;
};

function card(rank: number, suit: Suit): Card {
    return { rank, suit };
}

const smallDeck = fairChoice([
    card(2, "Hearts"),
    card(2, "Spades"),
    card(3, "Diamonds"),
    card(3, "Diamonds"),
    card(4, "Spades"),
]);

const suitToValue = {
    Clubs: 1,
    Hearts: 2,
    Diamonds: 3,
    Spades: 4,
};

function maxCard(left: Card, right: Card): Card {
    if (left.rank > right.rank) return left;
    if (right.rank > left.rank) return right;
    const leftSuit = suitToValue[left.suit];
    const rightSuit = suitToValue[right.suit];
    if (leftSuit > rightSuit) return left;
    if (rightSuit > leftSuit) return right;
    return left;
}

const drawTwo = chain(smallDeck, (firstCard) =>
    chain(smallDeck, (secondCard) => result(maxCard(firstCard, secondCard))),
);

const cardHashMapConfig: HashMapConfig<Card> = {
    hash: ({ rank, suit }) => rank + suitToValue[suit] * 20,
    keyEq: (left, right) =>
        left.rank === right.rank && left.suit === right.suit,
};

console.dir(fullyResolveExact(drawTwo, cardHashMapConfig));

console.dir(fullyResolveSampling(drawTwo, 100_000, cardHashMapConfig));
