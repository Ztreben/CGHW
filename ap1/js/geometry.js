(function (root) {
    "use strict";

    // 与页面配色下拉的顺序一致。前 3 色用于三角形三个角，前 4 色用于四面体四个面。
    var PALETTES = [
        {
            name: "原色",
            colors: [
                [0.93, 0.28, 0.30],
                [0.18, 0.78, 0.42],
                [0.28, 0.52, 0.98],
                [0.98, 0.82, 0.25],
                [0.84, 0.38, 0.82],
                [0.20, 0.80, 0.84]
            ]
        },
        {
            name: "海洋",
            colors: [
                [0.05, 0.30, 0.52],
                [0.10, 0.50, 0.66],
                [0.20, 0.70, 0.72],
                [0.55, 0.86, 0.78],
                [0.92, 0.78, 0.42],
                [0.94, 0.93, 0.88]
            ]
        },
        {
            name: "暮光",
            colors: [
                [0.36, 0.16, 0.58],
                [0.64, 0.24, 0.72],
                [0.92, 0.34, 0.52],
                [0.96, 0.55, 0.32],
                [0.98, 0.80, 0.38],
                [0.48, 0.84, 0.80]
            ]
        }
    ];

    // n-flake 的副本缩放。n = 3 时正好是 1/2，与教材中点公式相同。
    function nflakeScale(n) {
        var sum = 1;
        var k;
        var limit = Math.floor(n / 4);
        for (k = 1; k <= limit; k += 1) {
            sum += Math.cos((2 * Math.PI * k) / n);
        }
        return 1 / (2 * sum);
    }

    // 顶点放在单位圆上，再平移、缩放，让外接矩形居中并留出边距。
    function regularPolygon(n) {
        var raw = [];
        var i;
        for (i = 0; i < n; i += 1) {
            var theta = Math.PI / 2 + (i * 2 * Math.PI) / n;
            raw.push([Math.cos(theta), Math.sin(theta)]);
        }
        var minX = raw[0][0];
        var maxX = raw[0][0];
        var minY = raw[0][1];
        var maxY = raw[0][1];
        for (i = 1; i < raw.length; i += 1) {
            minX = Math.min(minX, raw[i][0]);
            maxX = Math.max(maxX, raw[i][0]);
            minY = Math.min(minY, raw[i][1]);
            maxY = Math.max(maxY, raw[i][1]);
        }
        var centerX = (minX + maxX) / 2;
        var centerY = (minY + maxY) / 2;
        var half = Math.max(maxX - minX, maxY - minY) / 2;
        var fit = 0.86 / half;
        var vertices = [];
        for (i = 0; i < raw.length; i += 1) {
            vertices.push(vec2((raw[i][0] - centerX) * fit, (raw[i][1] - centerY) * fit));
        }
        return vertices;
    }

    function randomInPolygon(vertices) {
        var weights = [];
        var sum = 0;
        var i;
        for (i = 0; i < vertices.length; i += 1) {
            weights[i] = Math.random();
            sum += weights[i];
        }
        var x = 0;
        var y = 0;
        for (i = 0; i < vertices.length; i += 1) {
            var w = weights[i] / sum;
            x += w * vertices[i][0];
            y += w * vertices[i][1];
        }
        return vec2(x, y);
    }

    function pickVertex(n, previous, rule) {
        var options = [];
        var i;
        for (i = 0; i < n; i += 1) {
            if (previous < 0 || rule === "any") {
                options.push(i);
                continue;
            }
            if (rule === "no-repeat" && i === previous) {
                continue;
            }
            if (rule === "no-neighbor") {
                var left = (previous + n - 1) % n;
                var right = (previous + 1) % n;
                if (i === previous || i === left || i === right) {
                    continue;
                }
            }
            options.push(i);
        }
        if (options.length === 0) {
            return Math.floor(Math.random() * n);
        }
        return options[Math.floor(Math.random() * options.length)];
    }

    function colorOf(palette, index) {
        var c = palette[index % palette.length];
        return vec4(c[0], c[1], c[2], 1);
    }

    // 混沌游戏：p ← s·p + (1−s)·随机顶点。s = 1/2 时即 p ← (p + 顶点) / 2。
    function chaosGame(options) {
        var n = options.sides;
        var count = options.count;
        var copyScale = options.scale;
        var rule = options.rule || "any";
        var palette = options.palette;
        var vertices = regularPolygon(n);
        var p = randomInPolygon(vertices);
        var previous = -1;
        var positions = [];
        var colors = [];
        var jump = 1 - copyScale;
        var i;

        for (i = 0; i < 24; i += 1) {
            var warm = pickVertex(n, previous, rule);
            p = mix(p, vertices[warm], jump);
            previous = warm;
        }

        for (i = 0; i < count; i += 1) {
            var j = pickVertex(n, previous, rule);
            p = mix(p, vertices[j], jump);
            previous = j;
            positions.push(vec4(p[0], p[1], 0, 1));
            colors.push(colorOf(palette, j));
        }

        return {
            kind: "points",
            positions: positions,
            colors: colors
        };
    }

    // 递归细分：连接三边中点，保留三个角上的三角形，去掉中间那块。
    function subdivide(a, b, c, depth, positions, colors, palette) {
        if (depth <= 0) {
            positions.push(vec4(a[0], a[1], 0, 1));
            positions.push(vec4(b[0], b[1], 0, 1));
            positions.push(vec4(c[0], c[1], 0, 1));
            colors.push(vec4(palette[0][0], palette[0][1], palette[0][2], 1));
            colors.push(vec4(palette[1][0], palette[1][1], palette[1][2], 1));
            colors.push(vec4(palette[2][0], palette[2][1], palette[2][2], 1));
            return;
        }

        var ab = mix(a, b, 0.5);
        var ac = mix(a, c, 0.5);
        var bc = mix(b, c, 0.5);
        subdivide(a, ab, ac, depth - 1, positions, colors, [palette[0], palette[0], palette[0]]);
        subdivide(b, bc, ab, depth - 1, positions, colors, [palette[1], palette[1], palette[1]]);
        subdivide(c, ac, bc, depth - 1, positions, colors, [palette[2], palette[2], palette[2]]);
    }

    function subdivideTriangle(depth, palette) {
        var vertices = regularPolygon(3);
        var positions = [];
        var colors = [];
        subdivide(vertices[0], vertices[1], vertices[2], depth, positions, colors, palette);
        return {
            kind: "triangles",
            positions: positions,
            colors: colors
        };
    }

    function outwardNormal(a, b, c) {
        var n = normalize(cross(subtract(b, a), subtract(c, a)));
        var mid = vec3(
            (a[0] + b[0] + c[0]) / 3,
            (a[1] + b[1] + c[1]) / 3,
            (a[2] + b[2] + c[2]) / 3
        );
        if (dot(n, mid) < 0) {
            n = vec3(-n[0], -n[1], -n[2]);
        }
        return n;
    }

    function litColor(rgb, normal) {
        var light = normalize(vec3(0.35, 0.62, 0.70));
        var diffuse = Math.max(0, dot(normal, light));
        var shade = 0.42 + 0.70 * diffuse;
        return vec4(rgb[0] * shade, rgb[1] * shade, rgb[2] * shade, 1);
    }

    function pushFace(positions, colors, a, b, c, rgb) {
        var color = litColor(rgb, outwardNormal(a, b, c));
        positions.push(vec4(a[0], a[1], a[2], 1));
        positions.push(vec4(b[0], b[1], b[2], 1));
        positions.push(vec4(c[0], c[1], c[2], 1));
        colors.push(color, color, color);
    }

    // 每个小四面体画 4 个面。细分时只保留 4 个角，中间的八面体留空。
    function tetra(a, b, c, d, positions, colors, palette) {
        pushFace(positions, colors, a, c, b, palette[0]);
        pushFace(positions, colors, a, c, d, palette[1]);
        pushFace(positions, colors, a, b, d, palette[2]);
        pushFace(positions, colors, b, c, d, palette[3]);
    }

    function divideTetra(a, b, c, d, depth, positions, colors, palette) {
        if (depth <= 0) {
            tetra(a, b, c, d, positions, colors, palette);
            return;
        }
        var ab = mix(a, b, 0.5);
        var ac = mix(a, c, 0.5);
        var ad = mix(a, d, 0.5);
        var bc = mix(b, c, 0.5);
        var bd = mix(b, d, 0.5);
        var cd = mix(c, d, 0.5);
        divideTetra(a, ab, ac, ad, depth - 1, positions, colors, palette);
        divideTetra(ab, b, bc, bd, depth - 1, positions, colors, palette);
        divideTetra(ac, bc, c, cd, depth - 1, positions, colors, palette);
        divideTetra(ad, bd, cd, d, depth - 1, positions, colors, palette);
    }

    function subdivideTetra(depth, palette) {
        var vertices = [
            vec3(0.0, 0.0, -1.0),
            vec3(0.0, 0.9428, 0.3333),
            vec3(-0.8165, -0.4714, 0.3333),
            vec3(0.8165, -0.4714, 0.3333)
        ];
        var positions = [];
        var colors = [];
        divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], depth, positions, colors, palette);
        return {
            kind: "triangles",
            positions: positions,
            colors: colors
        };
    }

    function triangleCountForDepth(depth) {
        return Math.pow(3, depth);
    }

    function tetraCountForDepth(depth) {
        return Math.pow(4, depth);
    }

    root.AP1 = root.AP1 || {};
    root.AP1.geometry = {
        PALETTES: PALETTES,
        nflakeScale: nflakeScale,
        chaosGame: chaosGame,
        subdivideTriangle: subdivideTriangle,
        subdivideTetra: subdivideTetra,
        triangleCountForDepth: triangleCountForDepth,
        tetraCountForDepth: tetraCountForDepth
    };
})(typeof window !== "undefined" ? window : globalThis);
