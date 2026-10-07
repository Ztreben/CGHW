(function (root) {
    "use strict";

    function pushFace(target, normal, tangent, verts) {
        var i;
        var base = target.positions.length / 3;
        for (i = 0; i < 4; i += 1) {
            target.positions.push(verts[i][0], verts[i][1], verts[i][2]);
            target.normals.push(normal[0], normal[1], normal[2]);
            target.tangents.push(tangent[0], tangent[1], tangent[2]);
        }
        target.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
        target.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    function box(w, h, d) {
        var x = w / 2;
        var y = h / 2;
        var z = d / 2;
        var mesh = { positions: [], normals: [], tangents: [], uvs: [], indices: [] };
        pushFace(mesh, [0, 0, 1], [1, 0, 0], [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]);
        pushFace(mesh, [0, 0, -1], [-1, 0, 0], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]]);
        pushFace(mesh, [1, 0, 0], [0, 0, -1], [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]]);
        pushFace(mesh, [-1, 0, 0], [0, 0, 1], [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]]);
        pushFace(mesh, [0, 1, 0], [1, 0, 0], [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]]);
        pushFace(mesh, [0, -1, 0], [1, 0, 0], [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]]);
        return mesh;
    }

    function plane(w, d) {
        var mesh = { positions: [], normals: [], tangents: [], uvs: [], indices: [] };
        pushFace(mesh, [0, 1, 0], [1, 0, 0], [[-w / 2, 0, d / 2], [w / 2, 0, d / 2], [w / 2, 0, -d / 2], [-w / 2, 0, -d / 2]]);
        return mesh;
    }

    function quad(w, h) {
        var mesh = { positions: [], normals: [], tangents: [], uvs: [], indices: [] };
        pushFace(mesh, [0, 0, 1], [1, 0, 0], [[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0]]);
        return mesh;
    }

    function sphere(stacks, slices) {
        var positions = [];
        var normals = [];
        var tangents = [];
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
                tangents.push(-Math.sin(theta), 0, Math.cos(theta));
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
        return { positions: positions, normals: normals, tangents: tangents, uvs: uvs, indices: indices };
    }

    root.AP3 = root.AP3 || {};
    root.AP3.geometry = { box: box, plane: plane, quad: quad, sphere: sphere };
})(typeof window !== "undefined" ? window : globalThis);
