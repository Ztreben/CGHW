(function (root) {
    "use strict";

    function sphere(stacks, slices) {
        var positions = [];
        var normals = [];
        var uvs = [];
        var indices = [];
        var y, x;
        for (y = 0; y <= stacks; y += 1) {
            var v = y / stacks;
            var phi = v * Math.PI;
            for (x = 0; x <= slices; x += 1) {
                var u = x / slices;
                var theta = u * Math.PI * 2;
                var nx = Math.sin(phi) * Math.cos(theta);
                var ny = Math.cos(phi);
                var nz = Math.sin(phi) * Math.sin(theta);
                positions.push(nx, ny, nz);
                normals.push(nx, ny, nz);
                uvs.push(u, 1 - v);
            }
        }
        var row = slices + 1;
        for (y = 0; y < stacks; y += 1) {
            for (x = 0; x < slices; x += 1) {
                var i0 = y * row + x;
                var i1 = i0 + row;
                indices.push(i0, i1, i0 + 1, i1, i1 + 1, i0 + 1);
            }
        }
        return { positions: positions, normals: normals, uvs: uvs, indices: indices };
    }

    function ring(inner, outer, segments) {
        var positions = [];
        var normals = [];
        var uvs = [];
        var indices = [];
        var i;
        for (i = 0; i <= segments; i += 1) {
            var a = (i / segments) * Math.PI * 2;
            var c = Math.cos(a);
            var s = Math.sin(a);
            positions.push(inner * c, 0, inner * s, outer * c, 0, outer * s);
            normals.push(0, 1, 0, 0, 1, 0);
            uvs.push(0, i / segments, 1, i / segments);
        }
        for (i = 0; i < segments; i += 1) {
            var b = i * 2;
            indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
        return { positions: positions, normals: normals, uvs: uvs, indices: indices };
    }

    function circle(radius, segments) {
        var positions = [];
        var i;
        for (i = 0; i <= segments; i += 1) {
            var a = (i / segments) * Math.PI * 2;
            positions.push(radius * Math.cos(a), 0, radius * Math.sin(a));
        }
        return { positions: positions };
    }

    function stars(count, radius) {
        var positions = [];
        var i;
        for (i = 0; i < count; i += 1) {
            var y = Math.random() * 2 - 1;
            var a = Math.random() * Math.PI * 2;
            var r = Math.sqrt(Math.max(0, 1 - y * y));
            positions.push(radius * r * Math.cos(a), radius * y, radius * r * Math.sin(a));
        }
        return { positions: positions };
    }

    root.AP2 = root.AP2 || {};
    root.AP2.geometry = {
        sphere: sphere,
        ring: ring,
        circle: circle,
        stars: stars
    };
})(typeof window !== "undefined" ? window : globalThis);
