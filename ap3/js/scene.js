(function (root) {
    "use strict";

    function material(partial) {
        return {
            ambient: partial.ambient === undefined ? 0.22 : partial.ambient,
            diffuse: partial.diffuse || [0.8, 0.75, 0.68],
            specular: partial.specular === undefined ? 0.35 : partial.specular,
            shininess: partial.shininess || 32,
            texture: partial.texture || "",
            normal: !!partial.normal,
            reflect: partial.reflect || 0,
            alpha: partial.alpha === undefined ? 1 : partial.alpha,
            emissive: partial.emissive || 0
        };
    }

    function model(x, y, z, sx, sy, sz, yaw) {
        var local = scale(sx, sy, sz);
        if (yaw) {
            local = mult(rotateY(yaw), local);
        }
        return mult(translate(x, y, z), local);
    }

    function create() {
        var serial = 0;
        function add(name, mesh, matrix, mat) {
            serial += 1;
            return {
                name: name,
                mesh: mesh,
                model: matrix,
                material: material(mat),
                pick: [((serial * 40) % 180 + 40) / 255, ((serial * 70) % 160 + 50) / 255, ((serial * 25) % 140 + 70) / 255]
            };
        }
        return [
            add("地面", "plane", model(0, 0, 0, 8, 1, 8), { texture: "ground", diffuse: [0.9, 0.88, 0.82], specular: 0.08, shininess: 8, ambient: 0.28 }),
            add("后墙", "box", model(0, 1.3, -3.2, 7.2, 2.6, 0.16), { texture: "wall", specular: 0.06, shininess: 8, ambient: 0.25 }),
            add("左墙", "box", model(-3.2, 1.3, 0, 6.4, 2.6, 0.16, 90), { texture: "wall", specular: 0.06, shininess: 8, ambient: 0.25 }),
            add("右墙", "box", model(3.2, 1.3, 0, 6.4, 2.6, 0.16, 90), { texture: "wall", specular: 0.06, shininess: 8, ambient: 0.25 }),
            add("木箱", "box", model(-1.15, 0.45, 0.45, 0.9, 0.9, 0.9), { texture: "crate", normal: true, diffuse: [1, 1, 1], specular: 0.2, shininess: 18 }),
            add("对照木箱", "box", model(-1.15, 0.45, -1.15, 0.9, 0.9, 0.9), { texture: "crate", normal: false, diffuse: [1, 1, 1], specular: 0.2, shininess: 18 }),
            add("金属球", "sphere", model(1.2, 0.55, 0.2, 0.55, 0.55, 0.55), { diffuse: [0.75, 0.78, 0.82], specular: 0.95, shininess: 64, reflect: 0.88 }),
            add("陶瓷球", "sphere", model(0.15, 0.36, 1.45, 0.36, 0.36, 0.36), { diffuse: [0.82, 0.24, 0.22], specular: 0.75, shininess: 48 }),
            add("玻璃板", "quad", model(1.85, 1.05, 1.45, 1.1, 1.45, 1), { diffuse: [0.65, 0.84, 0.95], specular: 0.9, shininess: 72, alpha: 0.28 }),
            add("点光源", "sphere", model(1.45, 2.15, 1.05, 0.1, 0.1, 0.1), { diffuse: [1, 0.86, 0.45], emissive: 1, specular: 0, ambient: 1 })
        ];
    }

    root.AP3 = root.AP3 || {};
    root.AP3.scene = { create: create };
})(typeof window !== "undefined" ? window : globalThis);
