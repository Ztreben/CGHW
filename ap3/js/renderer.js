(function (root) {
    "use strict";

    var gl;
    var phong;
    var depthProg;
    var pickProg;
    var loc;
    var meshes = {};
    var textures = {};
    var cube;
    var shadow;
    var pointShadow;
    var pickTarget = null;
    var objects = [];
    var warned = false;

    function compile(vs, fs) {
        var program = initShaders(gl, vs, fs);
        if (!program || program === -1) {
            throw new Error(vs);
        }
        return program;
    }

    function upload(data) {
        var vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        function buf(location, values, size) {
            var b = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, b);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        }
        buf(0, data.positions, 3);
        buf(1, data.normals, 3);
        buf(2, data.uvs, 2);
        buf(3, data.tangents, 3);
        var ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);
        gl.bindVertexArray(null);
        return { vao: vao, count: data.indices.length };
    }

    function tex2d(source, repeat) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        return tex;
    }

    function uploadCube(faces) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
        var targets = [
            [gl.TEXTURE_CUBE_MAP_POSITIVE_X, faces.px],
            [gl.TEXTURE_CUBE_MAP_NEGATIVE_X, faces.nx],
            [gl.TEXTURE_CUBE_MAP_POSITIVE_Y, faces.py],
            [gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, faces.ny],
            [gl.TEXTURE_CUBE_MAP_POSITIVE_Z, faces.pz],
            [gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, faces.nz]
        ];
        var i;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        for (i = 0; i < targets.length; i += 1) {
            gl.texImage2D(targets[i][0], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, targets[i][1]);
        }
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        return tex;
    }

    function shadowTarget(size) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.NONE);
        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);
        gl.drawBuffers([gl.NONE]);
        gl.readBuffer(gl.NONE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { fb: fb, tex: tex, size: size };
    }

    function init(context) {
        gl = context;
        phong = compile("phong-vs", "phong-fs");
        depthProg = compile("depth-vs", "depth-fs");
        pickProg = compile("pick-vs", "pick-fs");
        loc = {
            uMVP: gl.getUniformLocation(phong, "uMVP"),
            uModel: gl.getUniformLocation(phong, "uModel"),
            uCamera: gl.getUniformLocation(phong, "uCamera"),
            uDirVP: gl.getUniformLocation(phong, "uDirVP"),
            uPointVP: gl.getUniformLocation(phong, "uPointVP"),
            uDirDir: gl.getUniformLocation(phong, "uDirDir"),
            uPointPos: gl.getUniformLocation(phong, "uPointPos"),
            uAlbedo: gl.getUniformLocation(phong, "uAlbedo"),
            uNormalMap: gl.getUniformLocation(phong, "uNormalMap"),
            uShadow: gl.getUniformLocation(phong, "uShadow"),
            uPointShadow: gl.getUniformLocation(phong, "uPointShadow"),
            uCube: gl.getUniformLocation(phong, "uCube"),
            uAmbient: gl.getUniformLocation(phong, "uAmbient"),
            uDiffuse: gl.getUniformLocation(phong, "uDiffuse"),
            uSpecular: gl.getUniformLocation(phong, "uSpecular"),
            uShininess: gl.getUniformLocation(phong, "uShininess"),
            uAmbientOn: gl.getUniformLocation(phong, "uAmbientOn"),
            uDiffuseOn: gl.getUniformLocation(phong, "uDiffuseOn"),
            uSpecularOn: gl.getUniformLocation(phong, "uSpecularOn"),
            uUseTex: gl.getUniformLocation(phong, "uUseTex"),
            uUseNormal: gl.getUniformLocation(phong, "uUseNormal"),
            uReflect: gl.getUniformLocation(phong, "uReflect"),
            uAlpha: gl.getUniformLocation(phong, "uAlpha"),
            uEmissive: gl.getUniformLocation(phong, "uEmissive"),
            uSelected: gl.getUniformLocation(phong, "uSelected"),
            uShadeMode: gl.getUniformLocation(phong, "uShadeMode"),
            uBias: gl.getUniformLocation(phong, "uBias"),
            uReceive: gl.getUniformLocation(phong, "uReceive"),
            depthMVP: gl.getUniformLocation(depthProg, "uMVP"),
            pickMVP: gl.getUniformLocation(pickProg, "uMVP"),
            pickColor: gl.getUniformLocation(pickProg, "uColor")
        };
        var geo = root.AP3.geometry;
        meshes.box = upload(geo.box(1, 1, 1));
        meshes.plane = upload(geo.plane(1, 1));
        meshes.quad = upload(geo.quad(1, 1));
        meshes.sphere = upload(geo.sphere(24, 32));
        var pics = root.AP3.textures.makeAll();
        textures.crate = tex2d(pics.crate, true);
        textures.crateNormal = tex2d(pics.crateNormal, true);
        textures.ground = tex2d(pics.ground, true);
        textures.wall = tex2d(pics.wall, true);
        cube = uploadCube(pics.cube);
        shadow = shadowTarget(1024);
        pointShadow = shadowTarget(1024);
        objects = root.AP3.scene.create();
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0.55, 0.68, 0.78, 1);
    }

    function resize(canvas) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        var h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            if (pickTarget) {
                gl.deleteFramebuffer(pickTarget.fb);
                gl.deleteTexture(pickTarget.tex);
                pickTarget = null;
            }
        }
        return canvas.width / Math.max(1, canvas.height);
    }

    function ensurePick(canvas) {
        if (pickTarget && pickTarget.w === canvas.width && pickTarget.h === canvas.height) {
            return;
        }
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        var depth = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);
        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        pickTarget = { fb: fb, tex: tex, w: canvas.width, h: canvas.height };
    }

    function camera(state, aspect) {
        var yaw = radians(state.yaw);
        var pitch = radians(state.pitch);
        var eye = vec3(
            state.distance * Math.sin(yaw) * Math.cos(pitch),
            state.distance * Math.sin(pitch),
            state.distance * Math.cos(yaw) * Math.cos(pitch)
        );
        var at = vec3(0, 0.7, 0);
        return {
            eye: eye,
            view: lookAt(eye, at, vec3(0, 1, 0)),
            proj: perspective(42, aspect, 0.1, 40)
        };
    }

    function lightMatrices(state) {
        var dirFrom = vec3(3.4, 7.2, 2.6);
        var dirView = lookAt(dirFrom, vec3(0, 0.4, 0), vec3(0, 1, 0));
        var half = state.shadowExtent;
        var dirProj = ortho(-half, half, -half, half, 0.5, 24);
        var pointFrom = vec3(1.45, 2.15, 1.05);
        var pointView = lookAt(pointFrom, vec3(0, 0.5, 0), vec3(0, 1, 0));
        var pointProj = perspective(78, 1, 0.15, 16);
        return {
            dirFrom: dirFrom,
            dirVP: mult(dirProj, dirView),
            pointFrom: pointFrom,
            pointVP: mult(pointProj, pointView),
            dir: normalize(vec3(dirFrom[0], dirFrom[1], dirFrom[2]))
        };
    }

    function drawDepth(vp) {
        gl.useProgram(depthProg);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1.5, 2.5);
        gl.enable(gl.CULL_FACE);
        var i;
        for (i = 0; i < objects.length; i += 1) {
            var obj = objects[i];
            if (obj.material.alpha < 1 || obj.material.emissive) {
                continue;
            }
            gl.bindVertexArray(meshes[obj.mesh].vao);
            gl.uniformMatrix4fv(loc.depthMVP, false, flatten(mult(vp, obj.model)));
            gl.drawElements(gl.TRIANGLES, meshes[obj.mesh].count, gl.UNSIGNED_SHORT, 0);
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    function shadowPass(lights) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadow.fb);
        gl.viewport(0, 0, shadow.size, shadow.size);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        drawDepth(lights.dirVP);
        gl.bindFramebuffer(gl.FRAMEBUFFER, pointShadow.fb);
        gl.viewport(0, 0, pointShadow.size, pointShadow.size);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        drawDepth(lights.pointVP);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function drawObject(obj, cam, lights, vp, shadeMode, selected) {
        var mat = obj.material;
        gl.useProgram(phong);
        gl.bindVertexArray(meshes[obj.mesh].vao);
        gl.uniformMatrix4fv(loc.uMVP, false, flatten(mult(vp, obj.model)));
        gl.uniformMatrix4fv(loc.uModel, false, flatten(obj.model));
        gl.uniformMatrix4fv(loc.uDirVP, false, flatten(lights.dirVP));
        gl.uniformMatrix4fv(loc.uPointVP, false, flatten(lights.pointVP));
        gl.uniform3f(loc.uCamera, cam.eye[0], cam.eye[1], cam.eye[2]);
        gl.uniform3f(loc.uDirDir, lights.dir[0], lights.dir[1], lights.dir[2]);
        gl.uniform3f(loc.uPointPos, lights.pointFrom[0], lights.pointFrom[1], lights.pointFrom[2]);
        gl.uniform1f(loc.uAmbient, mat.ambient);
        gl.uniform3f(loc.uDiffuse, mat.diffuse[0], mat.diffuse[1], mat.diffuse[2]);
        gl.uniform1f(loc.uSpecular, mat.specular);
        gl.uniform1f(loc.uShininess, mat.shininess);
        gl.uniform1i(loc.uAmbientOn, selected.ambientOn);
        gl.uniform1i(loc.uDiffuseOn, selected.diffuseOn);
        gl.uniform1i(loc.uSpecularOn, selected.specularOn);
        gl.uniform1i(loc.uUseTex, mat.texture ? 1 : 0);
        gl.uniform1i(loc.uUseNormal, mat.normal && selected.normalOn ? 1 : 0);
        gl.uniform1f(loc.uReflect, mat.reflect);
        gl.uniform1f(loc.uAlpha, mat.alpha);
        gl.uniform1f(loc.uEmissive, mat.emissive);
        gl.uniform1i(loc.uSelected, obj === selected.current ? 1 : 0);
        gl.uniform1i(loc.uShadeMode, shadeMode);
        gl.uniform1f(loc.uBias, selected.bias);
        gl.uniform1i(loc.uReceive, mat.alpha < 1 || mat.emissive ? 0 : 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[mat.texture] || textures.wall);
        gl.uniform1i(loc.uAlbedo, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textures.crateNormal);
        gl.uniform1i(loc.uNormalMap, 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, shadow.tex);
        gl.uniform1i(loc.uShadow, 2);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, pointShadow.tex);
        gl.uniform1i(loc.uPointShadow, 3);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube);
        gl.uniform1i(loc.uCube, 4);
        if (mat.alpha < 1) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.depthMask(false);
            gl.disable(gl.CULL_FACE);
        } else {
            gl.disable(gl.BLEND);
            gl.depthMask(true);
            gl.enable(gl.CULL_FACE);
        }
        gl.drawElements(gl.TRIANGLES, meshes[obj.mesh].count, gl.UNSIGNED_SHORT, 0);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.enable(gl.CULL_FACE);
    }

    function drawScene(canvas, state, shadeMode, viewport) {
        var aspect = (viewport[2] / viewport[3]);
        var cam = camera(state, aspect);
        var lights = lightMatrices(state);
        var vp = mult(cam.proj, cam.view);
        gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
        var opaque = [];
        var glass = [];
        var i;
        for (i = 0; i < objects.length; i += 1) {
            if (objects[i].material.alpha < 1) {
                glass.push(objects[i]);
            } else {
                opaque.push(objects[i]);
            }
        }
        for (i = 0; i < opaque.length; i += 1) {
            drawObject(opaque[i], cam, lights, vp, shadeMode, state);
        }
        for (i = 0; i < glass.length; i += 1) {
            drawObject(glass[i], cam, lights, vp, shadeMode, state);
        }
    }

    function draw(state, canvas) {
        resize(canvas);
        var lights = lightMatrices(state);
        shadowPass(lights);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (state.compare) {
            drawScene(canvas, state, 0, [0, 0, canvas.width / 2, canvas.height]);
            drawScene(canvas, state, state.shadeMode, [canvas.width / 2, 0, canvas.width / 2, canvas.height]);
        } else {
            drawScene(canvas, state, state.shadeMode, [0, 0, canvas.width, canvas.height]);
        }
        gl.bindVertexArray(null);
        var error = gl.getError();
        if (error !== gl.NO_ERROR && !warned) {
            warned = true;
            console.warn("WebGL error", error);
        }
    }

    function pick(canvas, clientX, clientY, state) {
        ensurePick(canvas);
        var rect = canvas.getBoundingClientRect();
        var x = Math.floor((clientX - rect.left) * canvas.width / rect.width);
        var y = Math.floor((rect.bottom - clientY) * canvas.height / rect.height);
        var cam = camera(state, canvas.width / canvas.height);
        var vp = mult(cam.proj, cam.view);
        gl.bindFramebuffer(gl.FRAMEBUFFER, pickTarget.fb);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.useProgram(pickProg);
        var i;
        for (i = 0; i < objects.length; i += 1) {
            gl.bindVertexArray(meshes[objects[i].mesh].vao);
            gl.uniformMatrix4fv(loc.pickMVP, false, flatten(mult(vp, objects[i].model)));
            gl.uniform3f(loc.pickColor, objects[i].pick[0], objects[i].pick[1], objects[i].pick[2]);
            gl.drawElements(gl.TRIANGLES, meshes[objects[i].mesh].count, gl.UNSIGNED_SHORT, 0);
        }
        var pixel = new Uint8Array(4);
        if (x >= 0 && y >= 0 && x < canvas.width && y < canvas.height) {
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(0.55, 0.68, 0.78, 1);
        var best = null;
        var bestDist = 30;
        for (i = 0; i < objects.length; i += 1) {
            var pr = objects[i].pick[0] * 255;
            var pg = objects[i].pick[1] * 255;
            var pb = objects[i].pick[2] * 255;
            var dist = Math.abs(pr - pixel[0]) + Math.abs(pg - pixel[1]) + Math.abs(pb - pixel[2]);
            if (dist < bestDist) {
                bestDist = dist;
                best = objects[i];
            }
        }
        state.current = best;
        return best;
    }

    root.AP3 = root.AP3 || {};
    root.AP3.renderer = {
        init: init,
        draw: draw,
        pick: pick,
        objects: function () { return objects; }
    };
})(typeof window !== "undefined" ? window : globalThis);
