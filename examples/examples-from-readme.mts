import {
    chain,
    fairChoice,
    flip,
    fullyResolveExact,
    result,
    roll,
    weightedChoice,
} from "../src/index.mts";

// Second example

const coinModel = flip(0.5);

const coinDiceModel = chain(coinModel, (isHeads) =>
    isHeads ? roll(4) : roll(6),
);

const diceResults = fullyResolveExact(coinDiceModel);
console.dir(diceResults);

// Third example

const sentence = "The quick brown fox jumped over the lazy dog";
const words = fairChoice(sentence.split(" "));
const letterCountModel = chain(words, (word) => result(word.length));
console.dir(fullyResolveExact(letterCountModel));
