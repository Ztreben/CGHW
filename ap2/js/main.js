(function (root) {
    "use strict";

    var state = {
        orbitTime: 0.35,
        spinTime: 0.2,
        orbitRate: 0.35,
        spinRate: 0.45,
        earthTilt: 23.5,
        showOrbits: true,
        projection: "perspective",
        cameraMode: "trackball",
        orient: null,
        distance: 22,
        tourT: 0,
        tourPaused: true,
        tourKeys: null,
        eclipse: "none",
        fixedEye: vec3(0, 8, 22),
        fixedAt: vec3(0, 0, 0)
    };

    var canvas;

    function frame(now) {
        var dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
        frame.last = now;
        state.orbitTime += dt * state.orbitRate;
        state.spinTime += dt * state.spinRate;
        if (state.cameraMode === "tour" && !state.tourPaused) {
            state.tourT = (state.tourT + dt * 0.045) % 1;
        }
        root.AP2.renderer.draw(state, canvas);
        root.AP2.ui.write(state);
        var status = document.getElementById("status");
        var text = root.AP2.ui.statusText(state);
        if (status.textContent !== text) {
            status.textContent = text;
        }
        var raf = root.requestAnimFrame || root.requestAnimationFrame;
        raf(frame);
    }

    function init() {
        canvas = document.getElementById("gl-canvas");
        var status = document.getElementById("status");
        if (location.protocol === "file:") {
            status.textContent = "请在课程目录执行 npm start，再打开 http://localhost:5500/ap2/ 。";
            return;
        }
        var context = canvas.getContext("webgl2", { antialias: true, depth: true });
        if (!context) {
            status.textContent = "当前浏览器创建不了 WebGL 2.0 上下文。";
            return;
        }
        state.orient = mult(rotateY(32), rotateX(-22));
        state.tourKeys = root.AP2.camera.tourKeys(24);
        root.AP2.renderer.init(context);
        root.AP2.ui.bind(state);
        root.AP2.interaction.attach(canvas, state);
        frame(performance.now());
    }

    root.addEventListener("load", init);
})(window);
