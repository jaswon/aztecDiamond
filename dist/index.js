(() => {
  // src/math.ts
  var fold = (x) => x > 0 ? 2 * x - 1 : -2 * x;
  var unfold = (n) => (n % 2 == 1 ? n + 1 : -n) / 2;
  function pair([x, y]) {
    const fx = fold(x);
    const fy = fold(y);
    return fx + (fx >= fy ? fx * fx + fy : fy * fy);
  }
  function unpair(z) {
    const frz = Math.floor(Math.sqrt(z));
    const a = z - frz * frz;
    if (a < frz) {
      return [unfold(a), unfold(frz)];
    } else {
      return [unfold(frz), unfold(a - frz)];
    }
  }

  // src/index.ts
  function encode([x, y, xv, yv]) {
    const z = pair([x, y]);
    const dir = yv == 0 ? xv < 0 ? 2 : 0 : yv < 0 ? 3 : 1;
    return z * 4 + dir;
  }
  var dirDecode = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  function decode(m) {
    const [xv, yv] = dirDecode[m % 4];
    const [x, y] = unpair(Math.floor(m / 4));
    return [x, y, xv, yv];
  }
  var transitionTime = 400;
  async function run(ctx) {
    let minos = new Set();
    let order = 1;
    const fillables = new Set();
    fillables.add(pair([0, 1]));
    const id = ctx.getTransform();
    const draw = async (fn) => new Promise((res) => {
      let done;
      let last = performance.now();
      function loop(now) {
        if (done)
          return res();
        requestAnimationFrame(loop);
        ctx.setTransform(id);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        done = fn(ctx, now - last);
        last = now;
      }
      loop(last);
    });
    const fillMinos = (ms = minos) => {
      for (let encMino of ms) {
        const [x, y, xv, yv] = decode(encMino);
        if (xv == 0) {
          ctx.fillStyle = yv > 0 ? "blue" : "green";
          ctx.fillRect(x + 1, y + 1, -2, -1);
        } else {
          ctx.fillStyle = xv > 0 ? "red" : "yellow";
          ctx.fillRect(x + 1, y + 1, -1, -2);
        }
      }
    };
    while (true) {
      const fillCheckOrder = [...fillables.values()].sort((a, b) => {
        const [ax, ay] = unpair(a);
        const [bx, by] = unpair(b);
        return bx + by - (ax + ay);
      });
      const toFill = new Set();
      for (let fill of fillCheckOrder) {
        if (fillables.has(fill)) {
          const [fx, fy] = unpair(fill);
          fillables.delete(fill);
          fillables.delete(pair([fx - 1, fy - 1]));
          fillables.delete(pair([fx - 1, fy + 1]));
          fillables.delete(pair([fx + 1, fy - 1]));
          fillables.delete(pair([fx + 1, fy + 1]));
          if (Math.random() < 0.5) {
            toFill.add(encode([fx, fy, 1, 0]));
            toFill.add(encode([fx - 1, fy, -1, 0]));
          } else {
            toFill.add(encode([fx, fy, 0, 1]));
            toFill.add(encode([fx, fy - 1, 0, -1]));
          }
        }
      }
      await draw((() => {
        let t = transitionTime;
        return (ctx2, dt) => {
          t -= dt;
          ctx2.translate(ctx2.canvas.width / 2, ctx2.canvas.height / 2);
          ctx2.scale(ctx2.canvas.width / (order * 2 + 2), -ctx2.canvas.height / (order * 2 + 2));
          ctx2.globalAlpha = 1;
          fillMinos();
          ctx2.globalAlpha = 1 - t / transitionTime;
          fillMinos(toFill);
          return t < 0;
        };
      })());
      for (let m of toFill) {
        minos.add(m);
      }
      const toDelete = new Set();
      for (let m of minos) {
        const [x, y, xv, yv] = decode(m);
        const c = encode(xv == 0 ? [x, y + yv, xv, -yv] : [x + xv, y, -xv, yv]);
        if (minos.has(c)) {
          minos.delete(c);
          toDelete.add(c);
          minos.delete(m);
          toDelete.add(m);
        }
      }
      if (toDelete.size > 0) {
        await draw((() => {
          let t = transitionTime;
          return (ctx2, dt) => {
            t -= dt;
            ctx2.translate(ctx2.canvas.width / 2, ctx2.canvas.height / 2);
            ctx2.scale(ctx2.canvas.width / (order * 2 + 2), -ctx2.canvas.height / (order * 2 + 2));
            ctx2.globalAlpha = 1;
            fillMinos();
            if (t > 0) {
              ctx2.globalAlpha = t / transitionTime;
              fillMinos(toDelete);
            }
            return t < 0;
          };
        })());
      }
      await draw((() => {
        let t = transitionTime;
        return (ctx2, dt) => {
          t -= dt;
          const f = 1 - t / transitionTime;
          ctx2.translate(ctx2.canvas.width / 2, ctx2.canvas.height / 2);
          ctx2.scale(ctx2.canvas.width / ((order + f) * 2 + 2), -ctx2.canvas.height / ((order + f) * 2 + 2));
          ctx2.globalAlpha = 1;
          fillMinos();
          return t < 0;
        };
      })());
      order += 1;
      fillables.clear();
      for (let i = 0; i < order; i++) {
        for (let j = 0; j < order; j++) {
          fillables.add(pair([i - j, order - i - j]));
        }
      }
      const newMinos = new Set();
      for (let encMino of minos) {
        const [ox, oy, xv, yv] = decode(encMino);
        const [x, y] = [ox + xv, oy + yv];
        let xis, yis;
        if (xv == 0) {
          xis = [-1, 0, 1];
          yis = [0, 1];
        } else {
          xis = [0, 1];
          yis = [-1, 0, 1];
        }
        for (let xi of xis) {
          for (let yi of yis) {
            fillables.delete(pair([x + xi, y + yi]));
          }
        }
        newMinos.add(encode([x, y, xv, yv]));
      }
      const toMove = minos;
      minos = newMinos;
      await draw((() => {
        let t = transitionTime;
        return (ctx2, dt) => {
          t -= dt;
          const f = 1 - t / transitionTime;
          ctx2.translate(ctx2.canvas.width / 2, ctx2.canvas.height / 2);
          ctx2.scale(ctx2.canvas.width / (order * 2 + 2), -ctx2.canvas.height / (order * 2 + 2));
          for (let encMino of toMove) {
            const [x, y, xv, yv] = decode(encMino);
            if (xv == 0) {
              ctx2.fillStyle = yv > 0 ? "blue" : "green";
              ctx2.fillRect(x + 1, y + 1 + f * yv, -2, -1);
            } else {
              ctx2.fillStyle = xv > 0 ? "red" : "yellow";
              ctx2.fillRect(x + 1 + f * xv, y + 1, -1, -2);
            }
          }
          return t < 0;
        };
      })());
    }
  }
  window.addEventListener("load", () => {
    const canvas = document.querySelector("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    run(ctx);
  });
})();
