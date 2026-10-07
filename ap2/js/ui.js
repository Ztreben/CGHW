(function (root) {
    "use strict";

    function $(id) {
        return document.getElementById(id);
    }

    function bindRange(id, outputId, assign, digits) {
        var input = $(id);
        input.addEventListener("input", function () {
            var value = parseFloat(input.value);
            assign(value);
            $(outputId).textContent = value.toFixed(digits);
        });
    }

    function write(state) {
        $("orbit-rate").value = String(state.orbitRate);
        $("orbit-out").textContent = state.orbitRate.toFixed(2);
        $("spin-rate").value = String(state.spinRate);
        $("spin-out").textContent = state.spinRate.toFixed(2);
        $("tilt").value = String(state.earthTilt);
        $("tilt-out").textContent = state.earthTilt.toFixed(1) + "°";
        $("show-orbits").checked = state.showOrbits;
        $("tour-btn").textContent = state.cameraMode === "tour" && !state.tourPaused ? "暂停漫游" : "开始漫游";
    }

    function statusText(state) {
        var proj = state.projection === "perspective" ? "透视" : "正交";
        var cam = "轨迹球";
        if (state.cameraMode === "tour") {
            cam = state.tourPaused ? "漫游已暂停" : "漫游中";
        } else if (state.cameraMode === "fixed") {
            cam = state.eclipse === "solar" ? "日食视点" : "月食视点";
        }
        return proj + "投影 · " + cam + " · O 切换投影 · 空格漫游 · 拖拽接管视角";
    }

    function bind(state) {
        bindRange("orbit-rate", "orbit-out", function (value) {
            state.orbitRate = value;
        }, 2);
        bindRange("spin-rate", "spin-out", function (value) {
            state.spinRate = value;
        }, 2);
        bindRange("tilt", "tilt-out", function (value) {
            state.earthTilt = value;
        }, 1);
        $("show-orbits").addEventListener("change", function () {
            state.showOrbits = $("show-orbits").checked;
        });
        $("tour-btn").addEventListener("click", function () {
            if (state.cameraMode !== "tour") {
                state.cameraMode = "tour";
                state.tourPaused = false;
            } else {
                state.tourPaused = !state.tourPaused;
            }
            write(state);
        });
        $("solar-btn").addEventListener("click", function () {
            state.eclipse = "solar";
            state.orbitTime = 0;
            state.cameraMode = "fixed";
            state.fixedEye = vec3(4.8, 1.15, 2.4);
            state.fixedAt = vec3(4.15, 0, 0);
            write(state);
        });
        $("lunar-btn").addEventListener("click", function () {
            state.eclipse = "lunar";
            state.orbitTime = 0;
            state.cameraMode = "fixed";
            state.fixedEye = vec3(7.4, 1.35, 2.3);
            state.fixedAt = vec3(5.55, 0, 0);
            write(state);
        });
        $("clear-eclipse").addEventListener("click", function () {
            state.eclipse = "none";
            if (state.cameraMode === "fixed") {
                state.cameraMode = "trackball";
            }
            write(state);
        });
        write(state);
    }

    root.AP2 = root.AP2 || {};
    root.AP2.ui = {
        bind: bind,
        write: write,
        statusText: statusText
    };
})(typeof window !== "undefined" ? window : globalThis);
