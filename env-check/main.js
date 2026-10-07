"use strict";

function addCheck(container, title, ok, detail) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML =
        "<strong class=\"" + (ok ? "ok" : "bad") + "\">" +
        (ok ? "通过 · " : "未通过 · ") + title +
        "</strong><div class=\"meta\">" + detail + "</div>";
    container.appendChild(item);
}

function describeWebGL(gl) {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg
        ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);
    const vendor = dbg
        ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)
        : gl.getParameter(gl.VENDOR);

    return [
        "VERSION: " + gl.getParameter(gl.VERSION),
        "GLSL: " + gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        "VENDOR: " + vendor,
        "RENDERER: " + renderer,
        "MAX_TEXTURE_SIZE: " + gl.getParameter(gl.MAX_TEXTURE_SIZE),
        "MAX_CUBE_MAP_TEXTURE_SIZE: " + gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
        "MAX_VERTEX_ATTRIBS: " + gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
    ].join("\n");
}

function renderTriangle(gl) {
    const points = flatten([
        vec2(-1, -1),
        vec2(0, 1),
        vec2(1, -1)
    ]);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    if (!program || program === -1) {
        throw new Error("initShaders 链接失败");
    }
    gl.useProgram(program);

    const bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

window.onload = async function init() {
    const checks = document.getElementById("checks");
    const canvas = document.getElementById("gl-canvas");
    const gl = canvas.getContext("webgl2");

    addCheck(
        checks,
        "浏览器与静态服务器",
        location.protocol !== "file:",
        location.protocol === "file:"
            ? "请用 npm start 打开，不要直接双击 HTML。file:// 会拦截着色器与模块加载。"
            : "当前地址：" + location.href
    );

    if (!gl) {
        addCheck(checks, "WebGL 2.0", false, "当前浏览器拿不到 webgl2 上下文，请改用 Chrome 或较新的 Safari。");
        return;
    }

    addCheck(checks, "WebGL 2.0", true, describeWebGL(gl));

    try {
        renderTriangle(gl);
        addCheck(
            checks,
            "教材 Common 工具库",
            true,
            "已加载 initShaders.js / MV.js / webgl-utils.js，并用 vec2 + flatten 画出红色三角形。"
        );
    } catch (error) {
        addCheck(checks, "教材 Common 工具库", false, String(error && error.message ? error.message : error));
    }

    try {
        const three = await import("/vendor/three.module.js");
        addCheck(checks, "Three.js（课程允许的备选栈）", true, "revision r" + three.REVISION);
    } catch (error) {
        addCheck(
            checks,
            "Three.js（课程允许的备选栈）",
            false,
            "未找到 three。公共库应在 ~/GraphicsToolkit/vendor。\n" + error
        );
    }

    try {
        const gui = await import("/vendor/lil-gui.esm.js");
        addCheck(checks, "lil-gui 参数面板", true, "可用于 AP1–AP3 的控件面板。\nexport: " + Object.keys(gui).join(", "));
    } catch (error) {
        addCheck(
            checks,
            "lil-gui 参数面板",
            false,
            "未找到 lil-gui。公共库应在 ~/GraphicsToolkit/vendor。\n" + error
        );
    }
};
