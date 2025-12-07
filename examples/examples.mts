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
    equals: (left, right) =>
        left.rank === right.rank && left.suit === right.suit,
};

console.dir(fullyResolveExact(drawTwo, cardHashMapConfig));

console.dir(fullyResolveSampling(drawTwo, 100_000, cardHashMapConfig));
