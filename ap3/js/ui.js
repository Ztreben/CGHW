(function (root) {
    "use strict";

    function $(id) {
        return document.getElementById(id);
    }

    function write(state) {
        var mat = state.current ? state.current.material : null;
        $("selected-name").textContent = mat ? state.current.name : "未选中";
        $("ambient-on").checked = !!state.ambientOn;
        $("diffuse-on").checked = !!state.diffuseOn;
        $("specular-on").checked = !!state.specularOn;
        $("normal-on").checked = !!state.normalOn;
        $("compare").checked = !!state.compare;
        $("shade-mode").value = String(state.shadeMode);
        $("shadow-extent").value = String(state.shadowExtent);
        $("extent-out").textContent = state.shadowExtent.toFixed(1);
        $("bias").value = String(state.bias);
        $("bias-out").textContent = state.bias.toFixed(4);
        ["ambient", "specular", "shininess", "alpha", "reflect"].forEach(function (key) {
            var input = $(key);
            if (!input || !mat) {
                return;
            }
            input.value = String(mat[key]);
            $(key + "-out").textContent = key === "shininess" ? String(Math.round(mat[key])) : Number(mat[key]).toFixed(2);
        });
        if (mat) {
            $("diff-r").value = String(mat.diffuse[0]);
            $("diff-g").value = String(mat.diffuse[1]);
            $("diff-b").value = String(mat.diffuse[2]);
        }
    }

    function bind(state) {
        function flag(id, key) {
            $(id).addEventListener("change", function () {
                state[key] = $(id).checked;
            });
        }
        flag("ambient-on", "ambientOn");
        flag("diffuse-on", "diffuseOn");
        flag("specular-on", "specularOn");
        flag("normal-on", "normalOn");
        flag("compare", "compare");
        $("compare").addEventListener("change", function () {
            if ($("compare").checked && state.shadeMode === 0) {
                state.shadeMode = 2;
                $("shade-mode").value = "2";
            }
        });
        $("shade-mode").addEventListener("change", function () {
            state.shadeMode = parseInt($("shade-mode").value, 10);
        });
        $("shadow-extent").addEventListener("input", function () {
            state.shadowExtent = parseFloat($("shadow-extent").value);
            $("extent-out").textContent = state.shadowExtent.toFixed(1);
        });
        $("bias").addEventListener("input", function () {
            state.bias = parseFloat($("bias").value);
            $("bias-out").textContent = state.bias.toFixed(4);
        });
        function matRange(id, key, digits) {
            $(id).addEventListener("input", function () {
                if (!state.current) {
                    return;
                }
                state.current.material[key] = parseFloat($(id).value);
                $(id + "-out").textContent = digits === 0 ? String(Math.round(state.current.material[key])) : state.current.material[key].toFixed(digits);
            });
        }
        matRange("ambient", "ambient", 2);
        matRange("specular", "specular", 2);
        matRange("shininess", "shininess", 0);
        matRange("alpha", "alpha", 2);
        matRange("reflect", "reflect", 2);
        ["diff-r", "diff-g", "diff-b"].forEach(function (id, index) {
            $(id).addEventListener("input", function () {
                if (!state.current) {
                    return;
                }
                state.current.material.diffuse[index] = parseFloat($(id).value);
            });
        });
        write(state);
    }

    root.AP3 = root.AP3 || {};
    root.AP3.ui = { bind: bind, write: write };
})(typeof window !== "undefined" ? window : globalThis);
