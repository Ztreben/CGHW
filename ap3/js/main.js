(function (root) {
    "use strict";

    var state = {
        yaw: -24,
        pitch: 28,
        distance: 9.4,
        ambientOn: 1,
        diffuseOn: 1,
        specularOn: 1,
        normalOn: 1,
        compare: 0,
        shadeMode: 0,
        shadowExtent: 5.5,
        bias: 0.002,
        current: null
    };
    var canvas;

    function frame() {
        root.AP3.renderer.draw(state, canvas);
        var raf = root.requestAnimFrame || root.requestAnimationFrame;
        raf(frame);
    }

    function init() {
        canvas = document.getElementById("gl-canvas");
        var status = document.getElementById("status");
        if (location.protocol === "file:") {
            status.textContent = "请在课程目录执行 npm start，再打开 http://localhost:5500/ap3/ 。";
            return;
        }
        var context = canvas.getContext("webgl2", { antialias: true, depth: true });
        if (!context) {
            status.textContent = "当前浏览器创建不了 WebGL 2.0 上下文。";
            return;
        }
        root.AP3.renderer.init(context);
        var objects = root.AP3.renderer.objects();
        state.current = objects[4];
        root.AP3.ui.bind(state);
        root.AP3.interaction.attach(canvas, state, function (x, y) {
            if (state.compare) {
                status.textContent = "并排对比时不拾取。取消对比后再点击物体。";
                return;
            }
            var hit = root.AP3.renderer.pick(canvas, x, y, state);
            status.textContent = hit ? ("已选中 " + hit.name + "，右侧滑条改的是它的材质。") : "没有点中物体。";
            root.AP3.ui.write(state);
        });
        status.textContent = "已选中木箱。点击其他物体可改它的材质；地面能看到方向光和点光源的影子。";
        frame();
    }

    root.addEventListener("load", init);
})(window);
