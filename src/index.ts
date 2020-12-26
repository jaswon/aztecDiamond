import { pair, unpair } from "./math";

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

type Mino = [number, number, number, number]; // [x,y,xv,yv]
type EncMino = ReturnType<typeof encode>;

function encode([x,y,xv,yv]: Mino) {
    const z = pair([x,y]);
    const dir = (yv == 0) ? (xv < 0 ? 2 : 0) : (yv < 0 ? 3 : 1);
    return z*4+dir;
}

const dirDecode = [ [1,0], [0,1], [-1,0], [0,-1] ];

function decode(m: EncMino): Mino {
    const [xv,yv] = dirDecode[m % 4];
    const [x,y] = unpair(Math.floor(m/4));
    return [x,y,xv,yv];
}

const transitionTime = 400;

async function run(ctx: CanvasRenderingContext2D) {
    let minos: Set<EncMino> = new Set();
    let order = 1;

    const fillables: Set<number> = new Set();
    fillables.add(pair([0,1]));

    const id = ctx.getTransform();

    const draw = async (fn: (ctx: CanvasRenderingContext2D, dt: number) => boolean): Promise<void> => new Promise(
        res => {
            let done: boolean;
            let last: number = performance.now();
            function loop(now: number) {
                if (done) return res();

                requestAnimationFrame(loop);
                ctx.setTransform(id);
                ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
                done = fn(ctx, now-last);
                last = now;
            }
            loop(last);
        }
    )


    const fillMinos = (ms: Set<EncMino> = minos) => {
        for (let encMino of ms) {
            const [x,y,xv,yv] = decode(encMino);
            if (xv == 0) { // horizontal
                ctx.fillStyle = (yv > 0) ? "blue" : "green";
                ctx.fillRect(x+1,y+1,-2,-1);
            } else { // vertical
                ctx.fillStyle = (xv > 0) ? "red" : "yellow";
                ctx.fillRect(x+1,y+1,-1,-2);
            }
        }
    }

    while (true) {
        // fill squares
        const fillCheckOrder = [...fillables.values()].sort((a,b) => {
            const [ax,ay] = unpair(a);
            const [bx,by] = unpair(b);
            return (bx+by)-(ax+ay);
        })

        const toFill: Set<EncMino> = new Set();

        for (let fill of fillCheckOrder) {
            if (fillables.has(fill)) {
                const [fx,fy] = unpair(fill)

                fillables.delete(fill)
                fillables.delete(pair([fx-1, fy-1]));
                fillables.delete(pair([fx-1, fy+1]));
                fillables.delete(pair([fx+1, fy-1]));
                fillables.delete(pair([fx+1, fy+1]));

                if (Math.random() < 0.5) { // add vertical dominos
                    toFill.add(encode([fx,fy,1,0]));
                    toFill.add(encode([fx-1,fy,-1,0]));
                } else { // add horizontal dominos
                    toFill.add(encode([fx,fy,0,1]));
                    toFill.add(encode([fx,fy-1,0,-1]));
                }
            }
        }

        await draw((() => {
            let t = transitionTime ;
            return (ctx: CanvasRenderingContext2D, dt: number) => {
                t -= dt;

                ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
                ctx.scale(ctx.canvas.width/(order*2+2), -ctx.canvas.height/(order*2+2));

                ctx.globalAlpha = 1;
                fillMinos();
                ctx.globalAlpha = 1 - t/transitionTime;
                fillMinos(toFill);
                return t < 0;
            }
        })());

        for (let m of toFill) {
            minos.add(m);
        }

        const toDelete: Set<EncMino> = new Set();

        // cancel collisions
        for (let m of minos) {
            const [x,y,xv,yv] = decode(m);
            const c = encode(
                xv == 0
                    ? [x, y+yv, xv, -yv]
                    : [x+xv, y, -xv, yv]
            );
            if (minos.has(c)) {
                minos.delete(c);
                toDelete.add(c);
                minos.delete(m);
                toDelete.add(m);
            }
        }

        if (toDelete.size > 0) {
            await draw((() => {
                let t = transitionTime ;
                return (ctx: CanvasRenderingContext2D, dt: number) => {
                    t -= dt;

                    ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
                    ctx.scale(ctx.canvas.width/(order*2+2), -ctx.canvas.height/(order*2+2));

                    ctx.globalAlpha = 1;
                    fillMinos();
                    if (t>0) {
                        ctx.globalAlpha = t/transitionTime;
                        fillMinos(toDelete);
                    }
                    return t < 0;
                }
            })());
        }

        // move minos
        await draw((() => {
            let t = transitionTime ;
            return (ctx: CanvasRenderingContext2D, dt: number) => {
                t -= dt;
                const f = 1 - t/transitionTime;

                ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
                ctx.scale(ctx.canvas.width/((order+f)*2+2), -ctx.canvas.height/((order+f)*2+2));

                ctx.globalAlpha = 1;
                fillMinos();
                return t < 0;
            }
        })());
        order += 1;

        fillables.clear();
        for (let i = 0; i < order; i++) {
            for (let j = 0; j < order; j++) {
                fillables.add(pair([i-j,order-i-j]))
            }
        }
        const newMinos: Set<EncMino> = new Set();
        for (let encMino of minos) {
            const [ox,oy,xv,yv] = decode(encMino);
            const [x,y] = [ox+xv, oy+yv];
            let xis, yis;

            if (xv == 0) { // horizontal
                xis = [-1,0,1];
                yis = [0,1];
            } else { // vertical
                xis = [0,1];
                yis = [-1,0,1];
            }

            for (let xi of xis) {
                for (let yi of yis) {
                    fillables.delete(pair([x+xi, y+yi]));
                }
            }

            newMinos.add(encode([x, y, xv, yv]));
        }
        const toMove = minos;
        minos = newMinos;

        await draw((() => {
            let t = transitionTime ;
            return (ctx: CanvasRenderingContext2D, dt: number) => {
                t -= dt;
                const f = 1-t/transitionTime;

                ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
                ctx.scale(ctx.canvas.width/(order*2+2), -ctx.canvas.height/(order*2+2));
                for (let encMino of toMove) {
                    const [x,y,xv,yv] = decode(encMino);
                    if (xv == 0) { // horizontal
                        ctx.fillStyle = (yv > 0) ? "blue" : "green";
                        ctx.fillRect(x+1,y+1+f*yv,-2,-1);
                    } else { // vertical
                        ctx.fillStyle = (xv > 0) ? "red" : "yellow";
                        ctx.fillRect(x+1+f*xv,y+1,-1,-2);
                    }
                }
                return t < 0;
            }
        })());

    }
}

window.addEventListener("load", () => {
    const canvas = document.querySelector("canvas")!;
    canvas.width = 1080;
    canvas.height = 1080;

    const ctx = canvas.getContext("2d")!;

    run(ctx);
})
