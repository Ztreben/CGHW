(function (root) {
    "use strict";

    var gl;
    var meshProgram;
    var lineProgram;
    var meshLoc;
    var lineLoc;
    var meshes = {};
    var textures = {};
    var warned = false;

    function compile(vsId, fsId) {
        var program = initShaders(gl, vsId, fsId);
        if (!program || program === -1) {
            throw new Error("着色器链接失败：" + vsId);
        }
        return program;
    }

    function uploadMesh(data, indexed) {
        var vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        var pos = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pos);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.positions), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        if (data.normals) {
            var nrm = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, nrm);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.normals), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        }
        if (data.uvs) {
            var uv = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, uv);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.uvs), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(2);
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
        }
        var count = data.positions.length / 3;
        if (indexed) {
            var idx = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);
            count = data.indices.length;
        }
        gl.bindVertexArray(null);
        return { vao: vao, count: count, indexed: indexed };
    }

    function uploadTexture(source) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
        return tex;
    }

    function init(context) {
        gl = context;
        meshProgram = compile("mesh-vs", "mesh-fs");
        lineProgram = compile("line-vs", "line-fs");
        gl.bindAttribLocation(meshProgram, 0, "aPosition");
        gl.bindAttribLocation(meshProgram, 1, "aNormal");
        gl.bindAttribLocation(meshProgram, 2, "aTexCoord");
        gl.linkProgram(meshProgram);
        gl.bindAttribLocation(lineProgram, 0, "aPosition");
        gl.linkProgram(lineProgram);

        meshLoc = {
            uMVP: gl.getUniformLocation(meshProgram, "uMVP"),
            uModel: gl.getUniformLocation(meshProgram, "uModel"),
            uCamera: gl.getUniformLocation(meshProgram, "uCamera"),
            uTex: gl.getUniformLocation(meshProgram, "uTex"),
            uEmissive: gl.getUniformLocation(meshProgram, "uEmissive"),
            uEclipse: gl.getUniformLocation(meshProgram, "uEclipse"),
            uOccluder: gl.getUniformLocation(meshProgram, "uOccluder"),
            uOccRadius: gl.getUniformLocation(meshProgram, "uOccRadius")
        };
        lineLoc = {
            uMVP: gl.getUniformLocation(lineProgram, "uMVP"),
            uColor: gl.getUniformLocation(lineProgram, "uColor"),
            uPointSize: gl.getUniformLocation(lineProgram, "uPointSize")
        };

        var geo = root.AP2.geometry;
        meshes.sphere = uploadMesh(geo.sphere(28, 36), true);
        meshes.asteroid = uploadMesh(geo.sphere(6, 8), true);
        meshes.ring = uploadMesh(geo.ring(1.35, 2.15, 80), true);
        meshes.orbit = {};
        meshes.stars = uploadMesh(geo.stars(500, 70), false);
        meshes.moonOrbit = uploadMesh(geo.circle(1, 96), false);

        var pictures = root.AP2.textures.makeAll();
        var name;
        for (name in pictures) {
            if (Object.prototype.hasOwnProperty.call(pictures, name)) {
                textures[name] = uploadTexture(pictures[name]);
            }
        }

        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0.02, 0.025, 0.04, 1);
    }

    function orbitMesh(distance) {
        var key = distance.toFixed(2);
        if (!meshes.orbit[key]) {
            meshes.orbit[key] = uploadMesh(root.AP2.geometry.circle(distance, 128), false);
        }
        return meshes.orbit[key];
    }

    function resize(canvas) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        var h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        return canvas.width / Math.max(1, canvas.height);
    }

    function viewProjection(state, aspect, eye) {
        var at = state.cameraMode === "fixed" ? state.fixedAt : vec3(0, 0, 0);
        var up = state.cameraMode === "trackball"
            ? root.AP2.camera.upFromOrient(state.orient)
            : vec3(0, 1, 0);
        if (Math.abs(up[1]) < 0.15 && state.cameraMode === "trackball") {
            up = vec3(0, 1, 0);
        }
        var view = lookAt(eye, at, up);
        var proj;
        if (state.projection === "ortho") {
            var dist = Math.max(8, Math.sqrt(eye[0] * eye[0] + eye[1] * eye[1] + eye[2] * eye[2]));
            var half = dist * Math.tan(radians(22));
            proj = ortho(-half * aspect, half * aspect, -half, half, 0.1, 220);
        } else {
            proj = perspective(45, aspect, 0.1, 220);
        }
        return { view: view, proj: proj, eye: eye };
    }

    function drawMesh(item, vp, scene) {
        var mesh = item.mesh === "asteroid" ? meshes.asteroid : (item.mesh === "ring" ? meshes.ring : meshes.sphere);
        gl.useProgram(meshProgram);
        gl.bindVertexArray(mesh.vao);
        var mv = mult(vp.view, item.model);
        gl.uniformMatrix4fv(meshLoc.uMVP, false, flatten(mult(vp.proj, mv)));
        gl.uniformMatrix4fv(meshLoc.uModel, false, flatten(item.model));
        gl.uniform3f(meshLoc.uCamera, vp.eye[0], vp.eye[1], vp.eye[2]);
        gl.uniform1f(meshLoc.uEmissive, item.emissive || 0);
        var eclipse = 0;
        var occ = vec3(0, 0, 0);
        var occR = 0;
        if (item.eclipseTarget === "moon" && scene.moonPos) {
            eclipse = 1;
            occ = scene.moonPos;
            occR = scene.moonRadius;
        } else if (item.eclipseTarget === "earth" && scene.earthPos) {
            eclipse = 1;
            occ = scene.earthPos;
            occR = scene.earthRadius;
        }
        gl.uniform1f(meshLoc.uEclipse, eclipse);
        gl.uniform3f(meshLoc.uOccluder, occ[0], occ[1], occ[2]);
        gl.uniform1f(meshLoc.uOccRadius, occR);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[item.tex] || textures.mercury);
        gl.uniform1i(meshLoc.uTex, 0);
        if (item.cull) {
            gl.enable(gl.CULL_FACE);
        } else {
            gl.disable(gl.CULL_FACE);
        }
        if (item.blend) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.depthMask(false);
        }
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
        if (item.blend) {
            gl.depthMask(true);
            gl.disable(gl.BLEND);
        }
    }

    function drawLines(mesh, model, vp, color, mode, pointSize) {
        gl.useProgram(lineProgram);
        gl.bindVertexArray(mesh.vao);
        gl.uniformMatrix4fv(lineLoc.uMVP, false, flatten(mult(vp.proj, mult(vp.view, model))));
        gl.uniform4f(lineLoc.uColor, color[0], color[1], color[2], color[3]);
        gl.uniform1f(lineLoc.uPointSize, pointSize || 1);
        gl.drawArrays(mode, 0, mesh.count);
    }

    function draw(state, canvas) {
        var aspect = resize(canvas);
        var eye = root.AP2.interaction.currentEye(state);
        var vp = viewProjection(state, aspect, eye);
        var scene = root.AP2.system.build(state);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.CULL_FACE);
        drawLines(meshes.stars, mat4(), vp, [1, 1, 1, 0.85], gl.POINTS, 1.6);

        if (state.showOrbits) {
            var i;
            for (i = 0; i < scene.orbits.length; i += 1) {
                drawLines(orbitMesh(scene.orbits[i].distance), mat4(), vp, [0.65, 0.75, 0.9, 0.45], gl.LINE_STRIP, 1);
            }
        }

        var solid = [];
        var blended = [];
        var lines = [];
        var d;
        for (d = 0; d < scene.draws.length; d += 1) {
            var item = scene.draws[d];
            if (item.mesh === "moonOrbit") {
                lines.push(item);
            } else if (item.blend) {
                blended.push(item);
            } else {
                solid.push(item);
            }
        }
        for (d = 0; d < solid.length; d += 1) {
            drawMesh(solid[d], vp, scene);
        }
        if (state.showOrbits) {
            for (d = 0; d < lines.length; d += 1) {
                drawLines(meshes.moonOrbit, lines[d].model, vp, [0.8, 0.85, 0.75, 0.7], gl.LINE_STRIP, 1);
            }
        }
        for (d = 0; d < blended.length; d += 1) {
            drawMesh(blended[d], vp, scene);
        }
        gl.bindVertexArray(null);

        var error = gl.getError();
        if (error !== gl.NO_ERROR && !warned) {
            warned = true;
            console.warn("WebGL error", error);
        }
    }

    root.AP2 = root.AP2 || {};
    root.AP2.renderer = { init: init, draw: draw };
})(typeof window !== "undefined" ? window : globalThis);
