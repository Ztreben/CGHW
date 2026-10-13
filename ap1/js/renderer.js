(function (root) {
    "use strict";

    var gl = null;
    var meshProgram = null;
    var mandelProgram = null;
    var meshLoc = null;
    var mandelLoc = null;
    var posBuffer = null;
    var colorBuffer = null;
    var linePosBuffer = null;
    var lineColorBuffer = null;
    var quadBuffer = null;
    var meshKind = "points";
    var meshCount = 0;
    var lineCount = 0;
    var warned = false;

    function compile(vsId, fsId) {
        var program = initShaders(gl, vsId, fsId);
        if (!program || program === -1) {
            throw new Error("着色器链接失败：" + vsId);
        }
        return program;
    }

    function meshLocations(program) {
        return {
            aPosition: gl.getAttribLocation(program, "aPosition"),
            aColor: gl.getAttribLocation(program, "aColor"),
            uMVP: gl.getUniformLocation(program, "uMVP"),
            uPointSize: gl.getUniformLocation(program, "uPointSize"),
            uRoundPoints: gl.getUniformLocation(program, "uRoundPoints")
        };
    }

    function init(context) {
        gl = context;
        meshProgram = compile("shader-vs", "shader-fs");
        mandelProgram = compile("mandelbrot-vs", "mandelbrot-fs");
        meshLoc = meshLocations(meshProgram);
        mandelLoc = {
            aPosition: gl.getAttribLocation(mandelProgram, "aPosition"),
            uCenter: gl.getUniformLocation(mandelProgram, "uCenter"),
            uScale: gl.getUniformLocation(mandelProgram, "uScale"),
            uAspect: gl.getUniformLocation(mandelProgram, "uAspect"),
            uMaxIter: gl.getUniformLocation(mandelProgram, "uMaxIter"),
            uJulia: gl.getUniformLocation(mandelProgram, "uJulia"),
            uJuliaC: gl.getUniformLocation(mandelProgram, "uJuliaC"),
            uPalette: gl.getUniformLocation(mandelProgram, "uPalette")
        };

        posBuffer = gl.createBuffer();
        colorBuffer = gl.createBuffer();
        linePosBuffer = gl.createBuffer();
        lineColorBuffer = gl.createBuffer();
        quadBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1
        ]), gl.STATIC_DRAW);

        gl.clearColor(18 / 255, 24 / 255, 32 / 255, 1);
        gl.clearDepth(1);
        gl.depthFunc(gl.LESS);
        gl.disable(gl.CULL_FACE);
        gl.lineWidth(1);
    }

    function uploadArray(buffer, data) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STATIC_DRAW);
    }

    function buildLines(positions, colors) {
        var linePositions = [];
        var lineColors = [];
        var i;
        for (i = 0; i + 2 < positions.length; i += 3) {
            var tri = [i, i + 1, i + 2];
            var e;
            for (e = 0; e < 3; e += 1) {
                var i0 = tri[e];
                var i1 = tri[(e + 1) % 3];
                linePositions.push(positions[i0], positions[i1]);
                lineColors.push(colors[i0], colors[i1]);
            }
        }
        return { positions: linePositions, colors: lineColors };
    }

    function upload(mesh) {
        meshKind = mesh.kind;
        meshCount = mesh.positions.length;
        uploadArray(posBuffer, mesh.positions);
        uploadArray(colorBuffer, mesh.colors);
        if (mesh.kind === "triangles") {
            var lines = buildLines(mesh.positions, mesh.colors);
            lineCount = lines.positions.length;
            uploadArray(linePosBuffer, lines.positions);
            uploadArray(lineColorBuffer, lines.colors);
        } else {
            lineCount = 0;
        }
    }

    function bindMeshAttribs(positionBuffer, colorBufferId) {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(meshLoc.aPosition);
        gl.vertexAttribPointer(meshLoc.aPosition, 4, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferId);
        gl.enableVertexAttribArray(meshLoc.aColor);
        gl.vertexAttribPointer(meshLoc.aColor, 4, gl.FLOAT, false, 0, 0);
    }

    function resize(canvas) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        var height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        return {
            aspect: canvas.width / Math.max(1, canvas.height),
            dpr: canvas.width / Math.max(1, canvas.clientWidth)
        };
    }

    function viewMatrix(state, aspect) {
        if (state.scene === "tetra") {
            var projection = perspective(40, aspect, 0.1, 40);
            var camera = lookAt(vec3(0, 0, state.tetra.dist), vec3(0, 0, 0), vec3(0, 1, 0));
            var model = mult(rotateX(state.tetra.rotX), rotateY(state.tetra.rotY));
            return mult(projection, mult(camera, model));
        }
        return mult(
            translate(state.view.panX, state.view.panY, 0),
            scale(state.view.zoom, state.view.zoom, 1)
        );
    }

    function drawMesh(state, surface, count, asPoints) {
        gl.useProgram(meshProgram);
        gl.uniformMatrix4fv(meshLoc.uMVP, false, flatten(viewMatrix(state, surface.aspect)));
        gl.uniform1f(meshLoc.uPointSize, state.pointSize * surface.dpr);
        gl.uniform1f(meshLoc.uRoundPoints, asPoints ? 1 : 0);
        if (state.scene === "tetra") {
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }
        var mode = gl.TRIANGLES;
        if (asPoints) {
            mode = gl.POINTS;
        } else if (state.renderMode === "lines") {
            mode = gl.LINES;
        }
        gl.drawArrays(mode, 0, count);
    }

    function drawMandelbrot(state, surface) {
        var view = state.mandelbrot;
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(mandelProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(mandelLoc.aPosition);
        gl.vertexAttribPointer(mandelLoc.aPosition, 2, gl.FLOAT, false, 0, 0);
        if (meshLoc.aColor >= 0 && meshLoc.aColor !== mandelLoc.aPosition) {
            gl.disableVertexAttribArray(meshLoc.aColor);
        }
        gl.uniform2f(mandelLoc.uCenter, view.cx, view.cy);
        gl.uniform1f(mandelLoc.uScale, view.scale);
        gl.uniform1f(mandelLoc.uAspect, surface.aspect);
        gl.uniform1i(mandelLoc.uMaxIter, view.maxIter | 0);
        gl.uniform1i(mandelLoc.uJulia, view.julia ? 1 : 0);
        gl.uniform2f(mandelLoc.uJuliaC, view.re, view.im);
        gl.uniform1i(mandelLoc.uPalette, state.palette | 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function draw(state, surface) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (state.scene === "mandelbrot") {
            drawMandelbrot(state, surface);
        } else if (meshCount > 0) {
            var mode = state.renderMode;
            if (meshKind === "points") {
                mode = "points";
            }
            if (mode === "lines" && lineCount > 0) {
                bindMeshAttribs(linePosBuffer, lineColorBuffer);
                drawMesh(state, surface, lineCount, false);
            } else if (mode === "triangles") {
                bindMeshAttribs(posBuffer, colorBuffer);
                drawMesh(state, surface, meshCount, false);
            } else {
                var shown = Math.max(0, Math.min(meshCount, state.drawn | 0));
                if (shown > 0) {
                    bindMeshAttribs(posBuffer, colorBuffer);
                    drawMesh(state, surface, shown, true);
                }
            }
        }

        var error = gl.getError();
        if (error !== gl.NO_ERROR && !warned) {
            warned = true;
            console.warn("WebGL error:", error);
        }
    }

    root.AP1 = root.AP1 || {};
    root.AP1.renderer = {
        init: init,
        upload: upload,
        resize: resize,
        draw: draw
    };
})(typeof window !== "undefined" ? window : globalThis);
