(() => {
  // src/index.ts
  window.addEventListener("load", () => {
    const canvas = document.querySelector("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
  });
})();
