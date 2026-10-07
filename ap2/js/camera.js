(function (root) {
    "use strict";

    // 虚拟轨迹球用的朝向矩阵：把 (0,0,distance) 变到相机位置。
    function eyeFromOrient(orient, distance) {
        var p = mult(orient, vec4(0, 0, distance, 1));
        return vec3(p[0], p[1], p[2]);
    }

    function upFromOrient(orient) {
        var p = mult(orient, vec4(0, 1, 0, 0));
        return vec3(p[0], p[1], p[2]);
    }

    function projectToSphere(x, y) {
        var d = x * x + y * y;
        var z;
        if (d <= 1) {
            z = Math.sqrt(1 - d);
        } else {
            var s = 1 / Math.sqrt(d);
            x *= s;
            y *= s;
            z = 0;
        }
        return vec3(x, y, z);
    }

    // 教材 Virtual Trackball：两次投影的叉积是旋转轴。
    function trackballRotate(orient, x1, y1, x2, y2) {
        var v1 = projectToSphere(x1, y1);
        var v2 = projectToSphere(x2, y2);
        var axis = cross(v1, v2);
        if (length(axis) < 1e-5) {
            return orient;
        }
        axis = normalize(axis);
        var cosA = Math.max(-1, Math.min(1, dot(normalize(v1), normalize(v2))));
        var angle = Math.acos(cosA) * 180 / Math.PI;
        return mult(rotate(angle * 1.6, axis), orient);
    }

    function sampleTour(keys, t) {
        var n = keys.length - 1;
        var x = Math.max(0, Math.min(0.9999, t)) * n;
        var i = Math.floor(x);
        var f = x - i;
        f = f * f * (3 - 2 * f);
        return mix(keys[i], keys[i + 1], f);
    }

    function tourKeys(radius) {
        var keys = [];
        var i;
        for (i = 0; i <= 8; i += 1) {
            var a = (i / 8) * Math.PI * 2;
            keys.push(vec3(
                radius * Math.sin(a),
                3.2 + 4.8 * Math.sin(a * 2),
                radius * Math.cos(a)
            ));
        }
        return keys;
    }

    function orientMatchingEye(eye) {
        var n = normalize(vec3(eye[0], eye[1], eye[2]));
        var yaw = Math.atan2(n[0], n[2]) * 180 / Math.PI;
        var pitch = Math.asin(Math.max(-1, Math.min(1, n[1]))) * 180 / Math.PI;
        return mult(rotateY(yaw), rotateX(-pitch));
    }

    root.AP2 = root.AP2 || {};
    root.AP2.camera = {
        eyeFromOrient: eyeFromOrient,
        upFromOrient: upFromOrient,
        trackballRotate: trackballRotate,
        sampleTour: sampleTour,
        tourKeys: tourKeys,
        orientMatchingEye: orientMatchingEye
    };
})(typeof window !== "undefined" ? window : globalThis);
