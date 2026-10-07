(function (root) {
    "use strict";

    var dragging = false;
    var moved = false;
    var lastX = 0;
    var lastY = 0;

    function attach(canvas, state, onPick) {
        canvas.addEventListener("pointerdown", function (event) {
            if (event.button !== 0) {
                return;
            }
            dragging = true;
            moved = false;
            lastX = event.clientX;
            lastY = event.clientY;
            if (canvas.setPointerCapture) {
                try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* 忽略未激活指针 */ }
            }
        });
        canvas.addEventListener("pointermove", function (event) {
            if (!dragging) {
                return;
            }
            var dx = event.clientX - lastX;
            var dy = event.clientY - lastY;
            if (Math.abs(dx) + Math.abs(dy) > 3) {
                moved = true;
            }
            state.yaw += dx * 0.35;
            state.pitch = Math.max(-5, Math.min(75, state.pitch - dy * 0.25));
            lastX = event.clientX;
            lastY = event.clientY;
        });
        function end(event) {
            if (!dragging) {
                return;
            }
            dragging = false;
            if (!moved) {
                onPick(event.clientX, event.clientY);
            }
        }
        canvas.addEventListener("pointerup", end);
        canvas.addEventListener("pointercancel", function () { dragging = false; });
        canvas.addEventListener("wheel", function (event) {
            event.preventDefault();
            state.distance = Math.max(3.5, Math.min(16, state.distance * Math.pow(1.0011, event.deltaY)));
        }, { passive: false });
    }

    root.AP3 = root.AP3 || {};
    root.AP3.interaction = { attach: attach };
})(typeof window !== "undefined" ? window : globalThis);
