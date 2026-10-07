(function (root) {
    "use strict";

    var state = null;
    var hooks = null;

    function $(id) {
        return document.getElementById(id);
    }

    function formatScale(value) {
        return Number(value).toFixed(3);
    }

    function growthApplies(current) {
        if (current.scene === "mandelbrot") {
            return false;
        }
        if (current.scene === "gasket" && current.generator === "chaos") {
            return true;
        }
        return current.renderMode === "points";
    }

    function animLabel(current) {
        var done = current.vertexTotal > 0 && current.drawn >= current.vertexTotal;
        if (!current.animating) {
            return "继续生长";
        }
        if (done) {
            return "重新生长";
        }
        return "暂停生长";
    }

    function syncVisibility(current) {
        var show = {
            gasket: current.scene === "gasket",
            chaos: current.scene === "gasket" && current.generator === "chaos",
            depth: current.scene === "tetra" || (current.scene === "gasket" && current.generator === "recursive"),
            shaped: current.scene !== "mandelbrot",
            mandelbrot: current.scene === "mandelbrot",
            julia: current.scene === "mandelbrot" && current.mandelbrot.julia,
            tetra: current.scene === "tetra"
        };
        var nodes = document.querySelectorAll("[data-show]");
        var i;
        for (i = 0; i < nodes.length; i += 1) {
            var key = nodes[i].getAttribute("data-show");
            nodes[i].hidden = !show[key];
        }
    }

    function markSegments() {
        var labels = document.querySelectorAll(".segment label");
        var i;
        for (i = 0; i < labels.length; i += 1) {
            var input = labels[i].querySelector("input");
            labels[i].classList.toggle("on", !!(input && input.checked));
        }
    }

    function updateHints(current) {
        var recommended = root.AP1.geometry.nflakeScale(current.sides);
        var scaleHint = $("scale-hint");
        if (scaleHint) {
            scaleHint.textContent = "当前 " + current.sides + " 边形的推荐收缩比 s = " +
                formatScale(recommended) + "。n = 3 时就是教材的 1/2。";
        }
        var depthHint = $("depth-hint");
        if (depthHint) {
            if (current.scene === "tetra") {
                depthHint.textContent = "4^" + current.depth + " = " +
                    root.AP1.geometry.tetraCountForDepth(current.depth) + " 个小四面体，中间八面体留空。";
            } else {
                depthHint.textContent = "3^" + current.depth + " = " +
                    root.AP1.geometry.triangleCountForDepth(current.depth) + " 个三角形，每深一层数量 ×3。";
            }
        }
    }

    function write(current) {
        var scene = document.querySelector('input[name="scene"][value="' + current.scene + '"]');
        var generator = document.querySelector('input[name="generator"][value="' + current.generator + '"]');
        var mode = document.querySelector('input[name="mode"][value="' + current.renderMode + '"]');
        if (scene) scene.checked = true;
        if (generator) generator.checked = true;
        if (mode) mode.checked = true;

        $("sides").value = String(current.sides);
        $("sides-out").textContent = String(current.sides);
        $("copy-scale").value = String(current.scale);
        $("scale-out").textContent = formatScale(current.scale);
        $("rule").value = current.rule;
        $("point-count").value = String(current.pointCount);
        $("point-count-out").textContent = String(current.pointCount);
        $("depth").value = String(current.depth);
        $("depth-out").textContent = String(current.depth);
        $("point-size").value = String(current.pointSize);
        $("point-size-out").textContent = Number(current.pointSize).toFixed(1);
        $("palette").value = String(current.palette);
        $("max-iter").value = String(current.mandelbrot.maxIter);
        $("max-iter-out").textContent = String(current.mandelbrot.maxIter);
        $("julia-toggle").checked = current.mandelbrot.julia;
        $("julia-re").value = String(current.mandelbrot.re);
        $("julia-re-out").textContent = Number(current.mandelbrot.re).toFixed(3);
        $("julia-im").value = String(current.mandelbrot.im);
        $("julia-im-out").textContent = Number(current.mandelbrot.im).toFixed(3);
        $("auto-spin").checked = current.tetra.autoSpin;
        $("anim-btn").textContent = animLabel(current);

        markSegments();
        syncVisibility(current);
        updateHints(current);
    }

    function setStatus(text) {
        var el = $("status");
        if (el && el.textContent !== text) {
            el.textContent = text;
        }
    }

    function setAnimLabel(current) {
        var button = $("anim-btn");
        var label = animLabel(current);
        if (button && button.textContent !== label) {
            button.textContent = label;
        }
    }

    function statusText(current) {
        var modeName = { points: "点云", lines: "线框", triangles: "实体" };
        if (current.scene === "mandelbrot") {
            var view = current.mandelbrot;
            var name = view.julia ? "Julia 集" : "Mandelbrot 集";
            return name + " · 中心 (" + view.cx.toFixed(4) + ", " + view.cy.toFixed(4) +
                ") · 尺度 " + view.scale.toExponential(2) + " · 迭代 " + view.maxIter;
        }
        if (current.scene === "tetra") {
            return "3D 四面体垫片 · 深度 " + current.depth + " · " + modeName[current.renderMode] +
                (current.tetra.autoSpin ? " · 自动旋转" : " · 旋转已暂停");
        }
        if (current.generator === "chaos") {
            var phase = "已暂停";
            if (current.animating) {
                phase = current.drawn >= current.vertexTotal ? "生长完成" : "生长中";
            }
            var dense = "";
            if (current.sides > 3 && Math.abs(current.scale - 0.5) < 0.001) {
                dense = " · 中点规则会比垫片更密，可试推荐收缩比";
            }
            return "混沌游戏 · " + current.sides + " 边形 · s=" + formatScale(current.scale) +
                " · 点云 · " + current.drawn + " / " + current.vertexTotal + " · " + phase + dense;
        }
        var triangles = Math.round(current.vertexTotal / 3);
        var growth = "";
        if (current.renderMode === "points") {
            var pointPhase = current.animating ? "生长中" : "已暂停";
            if (current.animating && current.drawn >= current.vertexTotal) {
                pointPhase = "生长完成";
            }
            growth = " · " + current.drawn + " / " + current.vertexTotal + " · " + pointPhase;
        }
        return "递归细分 · 深度 " + current.depth + " · " + modeName[current.renderMode] +
            " · " + triangles + " 个三角形" + growth;
    }

    function bindRange(id, outputId, parse, assign, schedule) {
        var input = $(id);
        input.addEventListener("input", function () {
            var value = parse(input.value);
            assign(value);
            if (outputId) {
                $(outputId).textContent = outputId.indexOf("scale") >= 0 || outputId.indexOf("julia") >= 0 || outputId === "point-size-out"
                    ? (outputId === "point-size-out" ? Number(value).toFixed(1) : formatScale(value))
                    : String(value);
            }
            if (id === "sides" || id === "depth") {
                updateHints(state);
            }
            if (schedule) {
                hooks.scheduleGeometry();
            }
        });
    }

    function bindRadios(name, apply) {
        var inputs = document.querySelectorAll('input[name="' + name + '"]');
        var i;
        for (i = 0; i < inputs.length; i += 1) {
            inputs[i].addEventListener("change", function (event) {
                if (!event.target.checked) {
                    return;
                }
                apply(event.target.value);
            });
        }
    }

    function bind(nextState, nextHooks) {
        state = nextState;
        hooks = nextHooks;

        bindRadios("scene", function (value) {
            state.scene = value;
            write(state);
            hooks.invalidateGeometry();
        });

        bindRadios("generator", function (value) {
            state.generator = value;
            if (value === "chaos") {
                state.renderMode = "points";
            }
            write(state);
            hooks.invalidateGeometry();
        });

        bindRadios("mode", function (value) {
            hooks.setRenderMode(value);
        });

        bindRange("sides", "sides-out", function (v) { return parseInt(v, 10); }, function (v) {
            state.sides = v;
        }, true);
        bindRange("copy-scale", "scale-out", parseFloat, function (v) {
            state.scale = v;
        }, true);
        bindRange("point-count", "point-count-out", function (v) { return parseInt(v, 10); }, function (v) {
            state.pointCount = v;
        }, true);
        bindRange("depth", "depth-out", function (v) { return parseInt(v, 10); }, function (v) {
            state.depth = v;
        }, false);
        $("depth").addEventListener("input", function () {
            hooks.invalidateGeometry();
        });
        bindRange("point-size", "point-size-out", parseFloat, function (v) {
            state.pointSize = v;
        }, false);
        bindRange("max-iter", "max-iter-out", function (v) { return parseInt(v, 10); }, function (v) {
            state.mandelbrot.maxIter = v;
        }, false);
        bindRange("julia-re", "julia-re-out", parseFloat, function (v) {
            state.mandelbrot.re = v;
        }, false);
        bindRange("julia-im", "julia-im-out", parseFloat, function (v) {
            state.mandelbrot.im = v;
        }, false);

        $("rule").addEventListener("change", function () {
            state.rule = $("rule").value;
            hooks.invalidateGeometry();
        });
        $("palette").addEventListener("change", function () {
            state.palette = parseInt($("palette").value, 10);
            hooks.invalidateGeometry();
        });
        $("use-recommended").addEventListener("click", function () {
            state.scale = root.AP1.geometry.nflakeScale(state.sides);
            write(state);
            hooks.invalidateGeometry();
        });
        $("julia-toggle").addEventListener("change", function () {
            state.mandelbrot.julia = $("julia-toggle").checked;
            if (state.mandelbrot.julia) {
                state.mandelbrot.cx = 0;
                state.mandelbrot.cy = 0;
                state.mandelbrot.scale = 1.35;
            } else {
                state.mandelbrot.cx = -0.75;
                state.mandelbrot.cy = 0;
                state.mandelbrot.scale = 1.3;
            }
            write(state);
        });
        $("auto-spin").addEventListener("change", function () {
            state.tetra.autoSpin = $("auto-spin").checked;
        });
        $("anim-btn").addEventListener("click", function () {
            hooks.toggleAnim();
        });
        $("reset-view").addEventListener("click", function () {
            hooks.resetView();
        });

        var presets = document.querySelectorAll("[data-preset]");
        var p;
        for (p = 0; p < presets.length; p += 1) {
            presets[p].addEventListener("click", function (event) {
                hooks.applyPreset(event.currentTarget.getAttribute("data-preset"));
            });
        }

        write(state);
    }

    root.AP1 = root.AP1 || {};
    root.AP1.ui = {
        bind: bind,
        write: write,
        setStatus: setStatus,
        setAnimLabel: setAnimLabel,
        statusText: statusText,
        growthApplies: growthApplies
    };
})(typeof window !== "undefined" ? window : globalThis);
