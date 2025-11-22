import { type Distribution, Possibility } from "./data.mts";
import { type HamtMap } from "hamt_plus";
import hamt from "hamt_plus";

export function mapToDistribution<T>(map: HamtMap<T>): Distribution<T> {
    const result = [] as Distribution<T>;

    for (const [value, probability] of map.entries()) {
        result.push(Possibility.constant(probability, value));
    }

    return result;
}

export function fullyResolvedDistToMap<T>(
    dist: Distribution<T>,
): HamtMap<T, number> {
    let result = hamt.make() as HamtMap<T, number>;

    for (const possibility of dist) {
        possibility.match({
            constant: (probability, value) => {
                result = result.set(value, probability);
            },
            thunk: () => {
                throw new Error("Can't convert thunk-containing dist to map");
            },
        });
    }

    return result;
}

export function fullyResolvedApproximatelyEqual<T>(
    dist1: Distribution<T>,
    dist2: Distribution<T>,
): boolean {
    if (dist1.length !== dist2.length) return false;

    const map1 = fullyResolvedDistToMap(dist1);
    const map2 = fullyResolvedDistToMap(dist2);

    return probabilityMapsApproximatelyEqual(map1, map2);
}

export function probabilityMapsApproximatelyEqual<T>(
    map1: HamtMap<T, number>,
    map2: HamtMap<T, number>,
): boolean {
    for (const [value, probability1] of map1) {
        const probability2 = map2.get(value);

        if (!probability2) return false;

        const smallerProbability = Math.min(probability1, probability2);
        const epsilon = smallerProbability * 0.001;
        const min = smallerProbability - epsilon;
        const max = smallerProbability + epsilon;

        const passes = (prob: number) => prob > min && prob < max;

        if (!passes(probability1)) return false;
        if (!passes(probability2)) return false;
    }

    return true;
}
