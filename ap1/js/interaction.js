(function (root) {
    "use strict";

    var dragging = false;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function wheelPixels(event) {
        var dy = event.deltaY;
        if (event.deltaMode === 1) {
            dy *= 16;
        } else if (event.deltaMode === 2) {
            dy *= 160;
        }
        return dy;
    }

    function cursorNDC(event, canvas) {
        var rect = canvas.getBoundingClientRect();
        var nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        var ny = 1 - ((event.clientY - rect.top) / rect.height) * 2;
        return { x: nx, y: ny, rect: rect };
    }

    function aspectOf(canvas) {
        return canvas.width / Math.max(1, canvas.height);
    }

    function zoomGasket(state, cursor, factor) {
        var z1 = state.view.zoom;
        var z2 = clamp(z1 * factor, 0.2, 28);
        var k = z2 / z1;
        state.view.panX = cursor.x - k * (cursor.x - state.view.panX);
        state.view.panY = cursor.y - k * (cursor.y - state.view.panY);
        state.view.zoom = z2;
    }

    function zoomMandelbrot(state, cursor, canvas, factor) {
        var view = state.mandelbrot;
        var aspect = aspectOf(canvas);
        var mx = view.cx + cursor.x * aspect * view.scale;
        var my = view.cy + cursor.y * view.scale;
        var next = clamp(view.scale * factor, 1e-5, 2.6);
        view.cx = mx - cursor.x * aspect * next;
        view.cy = my - cursor.y * next;
        view.scale = next;
    }

    function attach(canvas, state, hooks) {
        var lastX = 0;
        var lastY = 0;

        canvas.addEventListener("pointerdown", function (event) {
            if (event.button !== 0) {
                return;
            }
            dragging = true;
            lastX = event.clientX;
            lastY = event.clientY;
            canvas.classList.add("dragging");
            if (canvas.setPointerCapture) {
                try {
                    canvas.setPointerCapture(event.pointerId);
                } catch (error) {
                    // 指针还没真正按下时，部分浏览器会拒绝捕获。拖拽仍继续。
                }
            }
            event.preventDefault();
        });

        canvas.addEventListener("pointermove", function (event) {
            if (!dragging) {
                return;
            }
            var dx = event.clientX - lastX;
            var dy = event.clientY - lastY;
            lastX = event.clientX;
            lastY = event.clientY;
            var rect = canvas.getBoundingClientRect();

            if (state.scene === "tetra") {
                state.tetra.rotY += dx * 0.45;
                state.tetra.rotX = clamp(state.tetra.rotX + dy * 0.35, -80, 80);
            } else if (state.scene === "mandelbrot") {
                var aspect = aspectOf(canvas);
                state.mandelbrot.cx -= (dx / rect.width) * 2 * aspect * state.mandelbrot.scale;
                state.mandelbrot.cy += (dy / rect.height) * 2 * state.mandelbrot.scale;
            } else {
                state.view.panX += (dx / rect.width) * 2;
                state.view.panY -= (dy / rect.height) * 2;
            }
        });

        function endDrag() {
            dragging = false;
            canvas.classList.remove("dragging");
        }

        canvas.addEventListener("pointerup", endDrag);
        canvas.addEventListener("pointercancel", endDrag);

        canvas.addEventListener("wheel", function (event) {
            event.preventDefault();
            var cursor = cursorNDC(event, canvas);
            var steps = wheelPixels(event);
            if (state.scene === "tetra") {
                state.tetra.dist = clamp(state.tetra.dist * Math.pow(1.0012, steps), 1.8, 9);
            } else if (state.scene === "mandelbrot") {
                zoomMandelbrot(state, cursor, canvas, Math.pow(1.0012, steps));
            } else {
                zoomGasket(state, cursor, Math.pow(0.9988, steps));
            }
        }, { passive: false });

        canvas.addEventListener("dblclick", function () {
            hooks.resetView();
        });

        window.addEventListener("keydown", function (event) {
            if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
                return;
            }
            var tag = event.target && event.target.tagName;
            if (tag === "TEXTAREA" || (tag === "INPUT" && event.target.type === "text")) {
                return;
            }
            if (event.key === "1") {
                hooks.setRenderMode("points");
                event.preventDefault();
            } else if (event.key === "2") {
                hooks.setRenderMode("lines");
                event.preventDefault();
            } else if (event.key === "3") {
                hooks.setRenderMode("triangles");
                event.preventDefault();
            } else if (event.key === " " || event.code === "Space") {
                hooks.toggleAnim();
                event.preventDefault();
            } else if (event.key === "r" || event.key === "R") {
                hooks.resetView();
                event.preventDefault();
            }
        });
    }

    root.AP1 = root.AP1 || {};
    root.AP1.interaction = {
        attach: attach,
        isDragging: function () {
            return dragging;
        }
    };
})(typeof window !== "undefined" ? window : globalThis);
