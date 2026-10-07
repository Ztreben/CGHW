(function (root) {
    "use strict";

    var dragging = false;
    var lastX = 0;
    var lastY = 0;

    function ndc(event, canvas) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: ((event.clientY - rect.top) / rect.height) * 2 - 1
        };
    }

    function takeOver(state, canvas) {
        if (state.cameraMode === "trackball") {
            return;
        }
        var eye = currentEye(state);
        state.orient = root.AP2.camera.orientMatchingEye(eye);
        state.distance = Math.max(4, Math.sqrt(eye[0] * eye[0] + eye[1] * eye[1] + eye[2] * eye[2]));
        state.cameraMode = "trackball";
        state.tourPaused = true;
        canvas.classList.remove("touring");
    }

    function currentEye(state) {
        if (state.cameraMode === "tour") {
            return root.AP2.camera.sampleTour(state.tourKeys, state.tourT);
        }
        if (state.cameraMode === "fixed") {
            return state.fixedEye;
        }
        return root.AP2.camera.eyeFromOrient(state.orient, state.distance);
    }

    function attach(canvas, state) {
        canvas.addEventListener("pointerdown", function (event) {
            if (event.button !== 0) {
                return;
            }
            takeOver(state, canvas);
            dragging = true;
            var p = ndc(event, canvas);
            lastX = p.x;
            lastY = p.y;
            canvas.classList.add("dragging");
            if (canvas.setPointerCapture) {
                try {
                    canvas.setPointerCapture(event.pointerId);
                } catch (error) {
                    // 合成事件或尚未激活的指针会拒绝捕获。
                }
            }
            event.preventDefault();
        });

        canvas.addEventListener("pointermove", function (event) {
            if (!dragging) {
                return;
            }
            var p = ndc(event, canvas);
            state.orient = root.AP2.camera.trackballRotate(state.orient, lastX, lastY, p.x, p.y);
            lastX = p.x;
            lastY = p.y;
        });

        function endDrag() {
            dragging = false;
            canvas.classList.remove("dragging");
        }

        canvas.addEventListener("pointerup", endDrag);
        canvas.addEventListener("pointercancel", endDrag);

        canvas.addEventListener("wheel", function (event) {
            event.preventDefault();
            var dy = event.deltaY;
            if (event.deltaMode === 1) {
                dy *= 16;
            }
            state.distance = Math.max(4, Math.min(48, state.distance * Math.pow(1.0012, dy)));
        }, { passive: false });

        window.addEventListener("keydown", function (event) {
            if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
                return;
            }
            if (event.key === "o" || event.key === "O") {
                state.projection = state.projection === "perspective" ? "ortho" : "perspective";
                event.preventDefault();
            } else if (event.key === " " || event.code === "Space") {
                if (state.cameraMode !== "tour") {
                    state.cameraMode = "tour";
                    state.tourPaused = false;
                } else {
                    state.tourPaused = !state.tourPaused;
                }
                event.preventDefault();
            } else if (event.key === "r" || event.key === "R") {
                state.cameraMode = "trackball";
                state.orient = mult(rotateY(28), rotateX(-18));
                state.distance = 20;
                state.projection = "perspective";
                state.tourPaused = true;
                event.preventDefault();
            }
        });
    }

    root.AP2 = root.AP2 || {};
    root.AP2.interaction = {
        attach: attach,
        currentEye: currentEye
    };
})(typeof window !== "undefined" ? window : globalThis);
