(function (root) {
    "use strict";

    function canvas(w, h) {
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
    }

    function crate() {
        var c = canvas(256, 256);
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#a56a3a";
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = "#6b4124";
        ctx.lineWidth = 10;
        ctx.strokeRect(8, 8, 240, 240);
        ctx.beginPath();
        ctx.moveTo(20, 20);
        ctx.lineTo(236, 236);
        ctx.moveTo(236, 20);
        ctx.lineTo(20, 236);
        ctx.stroke();
        ctx.fillStyle = "#c9844a";
        var i;
        for (i = 0; i < 4; i += 1) {
            ctx.fillRect(28, 36 + i * 48, 200, 28);
        }
        return c;
    }

    function ground() {
        var c = canvas(256, 256);
        var ctx = c.getContext("2d");
        var y, x;
        for (y = 0; y < 8; y += 1) {
            for (x = 0; x < 8; x += 1) {
                ctx.fillStyle = (x + y) % 2 === 0 ? "#d7d2c8" : "#b7b1a4";
                ctx.fillRect(x * 32, y * 32, 32, 32);
            }
        }
        return c;
    }

    function wall() {
        var c = canvas(128, 128);
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#efe6d6";
        ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = "#d9cbb6";
        ctx.lineWidth = 2;
        var i;
        for (i = 0; i < 8; i += 1) {
            ctx.strokeRect(4, i * 16 + 2, 120, 12);
        }
        return c;
    }

    function normalFromHeight(size, heightAt) {
        var c = canvas(size, size);
        var ctx = c.getContext("2d");
        var img = ctx.createImageData(size, size);
        var x, y, hL, hR, hD, hU, nx, ny, nz, len, i;
        for (y = 0; y < size; y += 1) {
            for (x = 0; x < size; x += 1) {
                hL = heightAt((x + size - 1) % size, y);
                hR = heightAt((x + 1) % size, y);
                hD = heightAt(x, (y + size - 1) % size);
                hU = heightAt(x, (y + 1) % size);
                nx = hL - hR;
                ny = hD - hU;
                nz = 1.2;
                len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                i = (y * size + x) * 4;
                img.data[i] = (nx / len * 0.5 + 0.5) * 255;
                img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
                img.data[i + 2] = (nz / len * 0.5 + 0.5) * 255;
                img.data[i + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        return c;
    }

    function brickHeight(x, y) {
        var mortar = 10;
        var inMortar = (x % 64) < mortar || (y % 32) < mortar;
        return inMortar ? 0 : 1;
    }

    function skyFace(hex, sun) {
        var c = canvas(256, 256);
        var ctx = c.getContext("2d");
        var g = ctx.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, "#8ec6ef");
        g.addColorStop(1, "#f0c48a");
        ctx.fillStyle = hex || g;
        ctx.fillRect(0, 0, 256, 256);
        if (!hex) {
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 256, 256);
        }
        if (sun) {
            ctx.fillStyle = "#fff6d0";
            ctx.beginPath();
            ctx.arc(170, 80, 28, 0, Math.PI * 2);
            ctx.fill();
        }
        return c;
    }

    function makeAll() {
        return {
            crate: crate(),
            crateNormal: normalFromHeight(128, brickHeight),
            ground: ground(),
            wall: wall(),
            cube: {
                px: skyFace("#f4b183", true),
                nx: skyFace("#7eb6e0", false),
                py: skyFace("#9fd0f5", false),
                ny: skyFace("#c4b49a", false),
                pz: skyFace("#f2c9a0", false),
                nz: skyFace("#86b7d8", false)
            }
        };
    }

    root.AP3 = root.AP3 || {};
    root.AP3.textures = { makeAll: makeAll };
})(typeof window !== "undefined" ? window : globalThis);
