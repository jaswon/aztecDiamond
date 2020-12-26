export type Pair = [number, number];

// Z -> N
export const fold = (x: number): number => (x>0) ? 2*x-1 : -2*x;

// N -> Z
export const unfold = (n: number): number => (n % 2 == 1 ? n+1 : -n) / 2;


// ZxZ -> N
export function pair([x, y]: Pair): number {
    const fx = fold(x);
    const fy = fold(y);
    return fx + (fx >= fy ? fx*fx+fy : fy*fy)
}

// N -> ZxZ
export function unpair(z: number): Pair {
    const frz = Math.floor(Math.sqrt(z));
    const a = z - frz*frz;
    if (a < frz) {
        return [unfold(a), unfold(frz)];
    } else {
        return [unfold(frz), unfold(a-frz)];
    }
}

