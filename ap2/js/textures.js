(function (root) {
    "use strict";

    function canvas(size) {
        var c = document.createElement("canvas");
        c.width = size;
        c.height = size;
        return c;
    }

    function noise(x, y) {
        var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return n - Math.floor(n);
    }

    function fillNoise(ctx, size, painter) {
        var img = ctx.createImageData(size, size);
        var data = img.data;
        var y, x, i, rgb;
        for (y = 0; y < size; y += 1) {
            for (x = 0; x < size; x += 1) {
                rgb = painter(x, y, size);
                i = (y * size + x) * 4;
                data[i] = rgb[0];
                data[i + 1] = rgb[1];
                data[i + 2] = rgb[2];
                data[i + 3] = rgb.length > 3 ? rgb[3] : 255;
            }
        }
        ctx.putImageData(img, 0, 0);
    }

    function sun() {
        var c = canvas(512);
        var ctx = c.getContext("2d");
        fillNoise(ctx, 512, function (x, y, size) {
            var dx = x - size / 2;
            var dy = y - size / 2;
            var r = Math.sqrt(dx * dx + dy * dy) / (size * 0.5);
            var n = noise(x * 0.05, y * 0.05);
            var heat = Math.max(0, 1 - r);
            var spot = n > 0.78 ? 0.55 : 1;
            return [
                Math.min(255, (180 + 75 * heat) * spot),
                Math.min(255, (70 + 150 * heat) * spot),
                Math.min(255, (20 + 80 * heat) * spot),
                255
            ];
        });
        return c;
    }

    function earth() {
        var c = canvas(512);
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#1d6cb5";
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = "#2f9e57";
        ctx.beginPath();
        ctx.ellipse(230, 210, 70, 110, 0.2, 0, Math.PI * 2);
        ctx.ellipse(300, 250, 90, 46, -0.4, 0, Math.PI * 2);
        ctx.ellipse(150, 300, 80, 36, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d8d2c2";
        ctx.fillRect(0, 0, 512, 36);
        ctx.fillRect(0, 476, 512, 36);
        ctx.fillStyle = "#e6efe4";
        var i;
        for (i = 0; i < 18; i += 1) {
            ctx.beginPath();
            ctx.ellipse(40 + (i * 47) % 480, 80 + (i * 73) % 360, 18, 8, i, 0, Math.PI * 2);
            ctx.fill();
        }
        return c;
    }

    function moon() {
        var c = canvas(256);
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#b7b1a8";
        ctx.fillRect(0, 0, 256, 256);
        var i;
        for (i = 0; i < 40; i += 1) {
            ctx.fillStyle = i % 2 ? "#8d877e" : "#d5cfc4";
            ctx.beginPath();
            ctx.arc((i * 53) % 256, (i * 97) % 256, 4 + (i % 7), 0, Math.PI * 2);
            ctx.fill();
        }
        return c;
    }

    function bands(colors, tiltNoise) {
        var c = canvas(256);
        var ctx = c.getContext("2d");
        var h = 256 / colors.length;
        var i;
        for (i = 0; i < colors.length; i += 1) {
            ctx.fillStyle = colors[i];
            ctx.fillRect(0, i * h, 256, h + 1);
        }
        if (tiltNoise) {
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = "#fff";
            ctx.fillRect(40, 70, 180, 8);
            ctx.fillRect(20, 150, 200, 5);
            ctx.globalAlpha = 1;
        }
        return c;
    }

    function rock(hex) {
        var c = canvas(128);
        var ctx = c.getContext("2d");
        ctx.fillStyle = hex;
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        var i;
        for (i = 0; i < 30; i += 1) {
            ctx.fillRect((i * 37) % 128, (i * 19) % 128, 10, 4);
        }
        return c;
    }

    function ring() {
        var c = canvas(128);
        var ctx = c.getContext("2d");
        ctx.clearRect(0, 0, 128, 128);
        var colors = ["#e6d7b0", "#c3a36a", "#f3ead2", "#a78455"];
        var x;
        for (x = 0; x < 128; x += 1) {
            ctx.fillStyle = colors[x % colors.length];
            ctx.globalAlpha = 0.35 + (x % 5) * 0.12;
            ctx.fillRect(x, 0, 1, 128);
        }
        return c;
    }

    function makeAll() {
        return {
            sun: sun(),
            earth: earth(),
            moon: moon(),
            mercury: rock("#b9a89a"),
            venus: rock("#e6c27a"),
            mars: rock("#c4553a"),
            jupiter: bands(["#e7d2b0", "#c48a55", "#f2e6cf", "#a56b45", "#e8d7b8", "#8d5a3c"], true),
            saturn: bands(["#f0e2b8", "#e7d39a", "#f7edd0", "#d7c48a"], false),
            uranus: rock("#b7e3ea"),
            neptune: rock("#3d6fdd"),
            ring: ring()
        };
    }

    root.AP2 = root.AP2 || {};
    root.AP2.textures = { makeAll: makeAll };
})(typeof window !== "undefined" ? window : globalThis);
