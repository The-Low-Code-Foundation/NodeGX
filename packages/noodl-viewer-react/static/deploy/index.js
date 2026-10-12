window.__noodl_modules = [];
window.Noodl = {
    defineModule:function(m) {
        // CN-003: adopt the manifest name the injector set just before this
        // kit's script. Must happen here, not in `registerModule` — see the
        // viewer's copy of this bootstrap for why.
        if (m && !m.name && window.__noodl_module_name) m.name = window.__noodl_module_name;
        // ISL-013: a kit another kit requires is told its folder too, so `getModule` finds it by either
        if (m && !m.folder && window.__noodl_module_folder) m.folder = window.__noodl_module_folder;
        window.__noodl_modules.push(m);
    },
    // ISL-013: what a kit you `require` shares (its module's `exports`), by its name or folder; undefined when it is not loaded
    getModule:function(id) {
        for (var i = window.__noodl_modules.length - 1; i >= 0; i--) {
            var m = window.__noodl_modules[i];
            if (m && (m.name === id || m.folder === id)) return m.exports;
        }
    },
    deployed: true,
    Env: {}
}

window.projectData = {{#export#}};
