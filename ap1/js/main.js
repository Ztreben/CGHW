(function (root) {
    "use strict";

    var state = {
        scene: "gasket",
        generator: "chaos",
        sides: 3,
        scale: 0.5,
        rule: "any",
        pointCount: 20000,
        depth: 4,
        pointSize: 2.5,
        palette: 0,
        renderMode: "points",
        animating: true,
        drawn: 0,
        vertexTotal: 0,
        view: { panX: 0, panY: 0, zoom: 1 },
        mandelbrot: {
            cx: -0.75,
            cy: 0,
            scale: 1.3,
            maxIter: 160,
            julia: false,
            re: -0.8,
            im: 0.156
        },
        tetra: {
            rotX: 24,
            rotY: 36,
            dist: 3.3,
            autoSpin: true
        }
    };

    var canvas = null;
    var geometryDirty = true;
    var geometryTimer = 0;
    var palette = null;

    function currentPalette() {
        return root.AP1.geometry.PALETTES[state.palette].colors;
    }

    function rebuild() {
        var previousTotal = state.vertexTotal;
        var previousDrawn = state.drawn;
        var mesh = null;
        palette = currentPalette();

        if (state.scene === "tetra") {
            mesh = root.AP1.geometry.subdivideTetra(state.depth, palette);
        } else if (state.scene === "gasket" && state.generator === "recursive") {
            mesh = root.AP1.geometry.subdivideTriangle(state.depth, palette);
        } else if (state.scene === "gasket") {
            mesh = root.AP1.geometry.chaosGame({
                sides: state.sides,
                count: state.pointCount,
                scale: state.scale,
                rule: state.rule,
                palette: palette
            });
        }

        if (mesh) {
            state.vertexTotal = mesh.positions.length;
            root.AP1.renderer.upload(mesh);
        } else {
            state.vertexTotal = 0;
        }

        if (!root.AP1.ui.growthApplies(state)) {
            state.drawn = state.vertexTotal;
        } else if (!state.animating) {
            state.drawn = state.vertexTotal;
        } else if (previousTotal === state.vertexTotal) {
            state.drawn = Math.min(previousDrawn, state.vertexTotal);
        } else {
            state.drawn = 0;
        }
        geometryDirty = false;
    }

    function advanceGrowth() {
        if (!state.animating || !root.AP1.ui.growthApplies(state)) {
            return;
        }
        if (state.drawn >= state.vertexTotal) {
            return;
        }
        var step = Math.max(1, Math.ceil(state.vertexTotal / 140));
        state.drawn = Math.min(state.vertexTotal, state.drawn + step);
    }

    function resetView() {
        if (state.scene === "mandelbrot") {
            if (state.mandelbrot.julia) {
                state.mandelbrot.cx = 0;
                state.mandelbrot.cy = 0;
                state.mandelbrot.scale = 1.35;
            } else {
                state.mandelbrot.cx = -0.75;
                state.mandelbrot.cy = 0;
                state.mandelbrot.scale = 1.3;
            }
        } else if (state.scene === "tetra") {
            state.tetra.rotX = 24;
            state.tetra.rotY = 36;
            state.tetra.dist = 3.3;
        } else {
            state.view.panX = 0;
            state.view.panY = 0;
            state.view.zoom = 1;
        }
    }

    function setRenderMode(mode) {
        state.renderMode = mode;
        if (state.scene === "mandelbrot") {
            state.scene = "gasket";
            state.generator = "recursive";
            invalidateGeometry();
        } else if (state.scene === "gasket" && state.generator === "chaos" && mode !== "points") {
            state.generator = "recursive";
            invalidateGeometry();
        } else if (mode === "points" && state.animating && root.AP1.ui.growthApplies(state)) {
            state.drawn = 0;
        }
        root.AP1.ui.write(state);
    }

    function toggleAnim() {
        var done = state.vertexTotal > 0 && state.drawn >= state.vertexTotal;
        if (state.animating && done && root.AP1.ui.growthApplies(state)) {
            state.drawn = 0;
        } else if (state.animating) {
            state.animating = false;
        } else {
            state.animating = true;
            if (done) {
                state.drawn = 0;
            }
        }
        root.AP1.ui.write(state);
    }

    function applyPreset(name) {
        state.scene = "gasket";
        state.generator = "chaos";
        state.renderMode = "points";
        state.rule = "any";
        state.animating = true;
        state.view.panX = 0;
        state.view.panY = 0;
        state.view.zoom = 1;
        if (name === "pentagon") {
            state.sides = 5;
            state.scale = root.AP1.geometry.nflakeScale(5);
            state.pointCount = 40000;
            state.pointSize = 1.8;
        } else if (name === "hexagon") {
            state.sides = 6;
            state.scale = root.AP1.geometry.nflakeScale(6);
            state.pointCount = 40000;
            state.pointSize = 1.8;
        } else if (name === "mandelbrot") {
            state.scene = "mandelbrot";
            state.mandelbrot.julia = false;
            state.mandelbrot.cx = -0.75;
            state.mandelbrot.cy = 0;
            state.mandelbrot.scale = 1.3;
            state.mandelbrot.maxIter = 160;
        } else if (name === "mandelbrot-detail") {
            state.scene = "mandelbrot";
            state.mandelbrot.julia = false;
            state.mandelbrot.cx = -0.743643;
            state.mandelbrot.cy = 0.131825;
            state.mandelbrot.scale = 0.012;
            state.mandelbrot.maxIter = 320;
        } else {
            state.sides = 3;
            state.scale = 0.5;
            state.pointCount = 20000;
            state.pointSize = 2.5;
        }
        invalidateGeometry();
        root.AP1.ui.write(state);
    }

    function invalidateGeometry() {
        root.clearTimeout(geometryTimer);
        geometryDirty = true;
    }

    function frame() {
        if (geometryDirty) {
            rebuild();
        }
        advanceGrowth();
        if (state.scene === "tetra" && state.tetra.autoSpin && !root.AP1.interaction.isDragging()) {
            state.tetra.rotY += 0.22;
        }
        var surface = root.AP1.renderer.resize(canvas);
        root.AP1.renderer.draw(state, surface);
        root.AP1.ui.setStatus(root.AP1.ui.statusText(state));
        root.AP1.ui.setAnimLabel(state);
        var raf = root.requestAnimFrame || root.requestAnimationFrame;
        raf(frame);
    }

    function init() {
        canvas = document.getElementById("gl-canvas");
        var status = document.getElementById("status");
        if (location.protocol === "file:") {
            status.textContent = "请在课程目录执行 npm start，再用 http://localhost:5500/ap1/ 打开。不要直接双击 HTML。";
            return;
        }

        var context = canvas.getContext("webgl2", {
            antialias: true,
            depth: true,
            stencil: false,
            preserveDrawingBuffer: true
        });
        if (!context) {
            status.textContent = "当前浏览器创建不了 WebGL 2.0 上下文，请换 Chrome 或较新的 Safari。";
            return;
        }

        root.AP1.renderer.init(context);
        root.AP1.ui.bind(state, {
            invalidateGeometry: invalidateGeometry,
            scheduleGeometry: function () {
                root.clearTimeout(geometryTimer);
                geometryTimer = root.setTimeout(function () {
                    geometryDirty = true;
                }, 90);
            },
            setRenderMode: setRenderMode,
            toggleAnim: toggleAnim,
            resetView: resetView,
            applyPreset: applyPreset
        });
        root.AP1.interaction.attach(canvas, state, {
            setRenderMode: setRenderMode,
            toggleAnim: toggleAnim,
            resetView: resetView
        });
        frame();
    }

    root.addEventListener("load", init);
})(window);
