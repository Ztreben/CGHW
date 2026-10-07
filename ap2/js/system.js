(function (root) {
    "use strict";

    // 半径、距离、公转/自转快慢集中在这里，方便改比例。
    // 距离做了压缩，否则按真实比例地球会小到看不见。
    var PLANETS = [
        { name: "水星", tex: "mercury", radius: 0.16, distance: 2.5, orbit: 4.1, spin: 3, tilt: 0.1 },
        { name: "金星", tex: "venus", radius: 0.28, distance: 3.5, orbit: 1.6, spin: -1.2, tilt: 177 },
        { name: "地球", tex: "earth", radius: 0.34, distance: 4.8, orbit: 1, spin: 16, tilt: 23.5, earth: true,
            moon: { name: "月球", tex: "moon", radius: 0.11, distance: 0.78, orbit: 8, spin: 8, inclination: 5.14 } },
        { name: "火星", tex: "mars", radius: 0.22, distance: 6.3, orbit: 0.53, spin: 15, tilt: 25 },
        { name: "木星", tex: "jupiter", radius: 0.78, distance: 8.8, orbit: 0.22, spin: 36, tilt: 3.1 },
        { name: "土星", tex: "saturn", radius: 0.66, distance: 11.4, orbit: 0.12, spin: 32, tilt: 26.7, ring: true },
        { name: "天王星", tex: "uranus", radius: 0.4, distance: 13.6, orbit: 0.08, spin: 20, tilt: 98 },
        { name: "海王星", tex: "neptune", radius: 0.38, distance: 15.5, orbit: 0.05, spin: 18, tilt: 28 }
    ];

    function mulberry32(seed) {
        var a = seed;
        return function () {
            a |= 0;
            a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function makeAsteroids() {
        var rand = mulberry32(20261007);
        var list = [];
        var i;
        for (i = 0; i < 90; i += 1) {
            list.push({
                radius: 7.15 + rand() * 1.15,
                angle: rand() * 360,
                y: (rand() - 0.5) * 0.4,
                size: 0.035 + rand() * 0.045,
                speed: 0.18 + rand() * 0.28
            });
        }
        return list;
    }

    // 月球轨道面倾角：只用 rotate / translate，再用 mult 叠起来。
    // 列向量从右往左作用：先平移到轨道半径，再绕 Y 公转，最后绕 X 把轨道面倾斜。
    function moonOrbitMatrix(angle, inclination, distance) {
        var place = translate(distance, 0, 0);
        var revolution = rotateY(angle);
        var incline = rotateX(inclination);
        return mult(incline, mult(revolution, place));
    }

    function planetCenter(distance, angle) {
        return mult(rotateY(angle), translate(distance, 0, 0));
    }

    function translationOf(matrix) {
        return vec3(matrix[0][3], matrix[1][3], matrix[2][3]);
    }

    function bodyModel(center, tiltDeg, spinAngle, radius) {
        var local = mult(rotateZ(tiltDeg), rotateY(spinAngle));
        var scaled = mult(local, scale(radius, radius, radius));
        return mult(center, scaled);
    }

    var asteroids = makeAsteroids();

    function build(state) {
        var draws = [];
        var orbits = [];
        var tOrbit = state.orbitTime;
        var tSpin = state.spinTime;
        var earthPos = null;
        var moonPos = null;
        var earthRadius = 0.34;
        var moonRadius = 0.11;

        draws.push({
            mesh: "sphere",
            model: mult(rotateY(tSpin * 8), scale(1.35, 1.35, 1.35)),
            tex: "sun",
            emissive: 1,
            cull: true
        });

        var i;
        for (i = 0; i < PLANETS.length; i += 1) {
            var body = PLANETS[i];
            var angle = tOrbit * body.orbit * 40;
            var center = planetCenter(body.distance, angle);
            var tilt = body.earth ? state.earthTilt : body.tilt;
            var spin = tSpin * body.spin * 20;
            draws.push({
                mesh: "sphere",
                model: bodyModel(center, tilt, spin, body.radius),
                tex: body.tex,
                emissive: 0,
                cull: true
            });
            orbits.push({ matrix: mat4(), distance: body.distance });

            if (body.earth) {
                earthPos = translationOf(center);
                earthRadius = body.radius;
                var moon = body.moon;
                var moonAngle = state.eclipse === "solar" ? 180 : (state.eclipse === "lunar" ? 0 : tOrbit * moon.orbit * 40);
                var moonFrame = moonOrbitMatrix(moonAngle, moon.inclination, moon.distance);
                var moonWorld = mult(center, moonFrame);
                moonPos = translationOf(moonWorld);
                moonRadius = moon.radius;
                draws.push({
                    mesh: "sphere",
                    model: mult(moonWorld, mult(rotateY(tSpin * moon.spin * 20), scale(moon.radius, moon.radius, moon.radius))),
                    tex: "moon",
                    emissive: 0,
                    cull: true,
                    eclipseTarget: "earth"
                });
                draws.push({
                    mesh: "moonOrbit",
                    model: mult(center, mult(rotateX(moon.inclination), scale(moon.distance, moon.distance, moon.distance))),
                    distance: moon.distance
                });
                draws[draws.length - 3].eclipseTarget = "moon";
            }

            if (body.ring) {
                var ringLocal = mult(rotateZ(body.tilt), scale(body.radius, body.radius, body.radius));
                draws.push({
                    mesh: "ring",
                    model: mult(center, ringLocal),
                    tex: "ring",
                    emissive: 0,
                    cull: false,
                    blend: true
                });
            }
        }

        for (i = 0; i < asteroids.length; i += 1) {
            var rock = asteroids[i];
            var ra = rock.angle + tOrbit * rock.speed * 40;
            var placed = mult(rotateY(ra), translate(rock.radius, rock.y, 0));
            draws.push({
                mesh: "asteroid",
                model: mult(placed, scale(rock.size, rock.size, rock.size)),
                tex: "mercury",
                emissive: 0,
                cull: true
            });
        }

        return {
            draws: draws,
            orbits: orbits,
            earthPos: earthPos,
            moonPos: moonPos,
            earthRadius: earthRadius,
            moonRadius: moonRadius
        };
    }

    root.AP2 = root.AP2 || {};
    root.AP2.system = {
        PLANETS: PLANETS,
        moonOrbitMatrix: moonOrbitMatrix,
        planetCenter: planetCenter,
        bodyModel: bodyModel,
        translationOf: translationOf,
        build: build
    };
})(typeof window !== "undefined" ? window : globalThis);
