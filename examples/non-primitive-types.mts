/*
 * It is possible to define a `Distribution` over any type of data. When the data type in
 * question does not use pointer equality (i.e. when the type is an object) it is necessary to
 * define custom equality operators for the type. All of the inference functions take these
 * operators as an optional final argument.
 *
 * Let's demonstrate this using a deck of cards. Here we define a card as an object which
 * contains fields for the card's rank and suit.
 */

import {
    chain,
    fairChoice,
    fullyResolveExact,
    result,
    type HashMapConfig,
} from "../src/index.mts";

// Very reduced deck, to make examples smaller
type Suit = "Hearts" | "Diamonds" | "Spades";
type Rank = 2 | 3 | 4;

// Our compound type
type Card = {
    suit: Suit;
    rank: Rank;
};

/*
 * In order to create distributions over Cards, we need to create a HashMapConfig<card> object.
 * This object defines how to get a numeric hash code for a card, and how to compare two
 * cards for equality.
 */

function suitToNumber(suit: Suit): number {
    switch (suit) {
        case "Hearts":
            return 20;
        case "Diamonds":
            return 40;
        case "Spades":
            return 60;
    }
}

function hashCard(card: Card): number {
    return suitToNumber(card.suit) + card.rank;
}

function cardsAreEqual(left: Card, right: Card): boolean {
    return left.rank === right.rank && left.suit === right.suit;
}

const hashMapConfig: HashMapConfig<Card> = {
    hash: hashCard,
    equals: cardsAreEqual,
};

// Let's make a small deck to play with. First, a helper function:
function card(rank: Rank, suit: Suit): Card {
    return { rank, suit };
}

// Let's define a deck which contains a few different cards, and multiple
// copies of the 3 of Diamonds.
const smallDeck = fairChoice([
    card(2, "Hearts"),
    card(2, "Spades"),
    card(3, "Diamonds"),
    card(3, "Diamonds"),
    card(4, "Spades"),
]);

/*
 * Say we draw a card from this deck twice, with replacement, and write down what the highest
 * card was that we drew. (For an example which doesn't use replacement, check
 * `examples/without-replacement.mts`.) What is the distribution of our highest card?
 *
 * First we need to define how to compare two cards. If their rank matches, we will compare
 * their suit.
 */

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

// Draw a card from the deck, and then draw a second card from the deck. Note that we draw
// from the same `smallDeck` distribution each time, so the same card can be drawn twice.
const drawTwo = chain(smallDeck, (firstCard) =>
    chain(smallDeck, (secondCard) => result(maxCard(firstCard, secondCard))),
);

// We can finally perform inference. It is essential that we remember to pass the config object
// to the inference function!

console.dir(fullyResolveExact(drawTwo, hashMapConfig));
/*
 * [
 *     {
 *         probability: 0.35999999999999993,
 *         value: { rank: 4, suit: 'Spades' }
 *     },
 *     {
 *         probability: 0.48,
 *         value: { rank: 3, suit: 'Diamonds' } },
 *     {
 *         probability: 0.03999999999999999,
 *         value: { rank: 2, suit: 'Hearts' }
 *     },
 *     {
 *         probability: 0.11999999999999997,
 *         value: { rank: 2, suit: 'Spades' }
 *     }
 * ]
 */

/*
 * If we had forgotten to provide the config then we would have gotten the incorrect answer.
 */

// THIS IS WRONG
console.dir(fullyResolveExact(drawTwo));
/*
 *  [
 *      { probability: 0.12, value: { rank: 2, suit: 'Spades' } },
 *      { probability: 0.04, value: { rank: 2, suit: 'Hearts' } },
 *      { probability: 0.24, value: { rank: 3, suit: 'Diamonds' } },
 *      { probability: 0.24, value: { rank: 3, suit: 'Diamonds' } },
 *      { probability: 0.36, value: { rank: 4, suit: 'Spades' } }
 *  ]
 *
 * We put two copies of the 3 of diamonds into our deck. These two should be equivalent,
 * but because we forgot to provide the config for our hashmap they were instead tracked as
 * distinct results.
 */
