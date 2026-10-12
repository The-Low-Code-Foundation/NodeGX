const _colors = {
    "purple":"component",
    "green":"data",
    "default":"default",
    "grey":"default"
}

Noodl.defineNode = function(def) {
    const _def = {};

    _def.name = def.name;
    _def.displayNodeName = def.displayName;
    _def.usePortAsLabel = def.useInputAsLabel;
    _def.color = _colors[def.color || 'default'];
    _def.category = def.category || 'Modules';
    _def.getInspectInfo = def.getInspectInfo;
    _def.docs = def.docs;
    
    _def.initialize = function() {
        this.inputs = {};
        var _outputs = this.outputs = {};
        var _this = this;

        // Function for quickly setting outputs
        this.setOutputs = function(o) {
            for(var key in o) {
                _outputs[key] = o[key];
                _this.flagOutputDirty(key);
            }
        }

        // Sending warnings
        this.clearWarnings = (function() {
            if(this.context.editorConnection && this.nodeScope && this.nodeScope.componentOwner)
                this.context.editorConnection.clearWarnings(this.nodeScope.componentOwner.name, this.id);
        }).bind(this);

        this.sendWarning = (function(name,message) {
            if(this.context.editorConnection && this.nodeScope && this.nodeScope.componentOwner)
                this.context.editorConnection.sendWarning(this.nodeScope.componentOwner.name, this.id, name, {
                    message: message
                });
        }).bind(this);

        if(typeof def.initialize === 'function')
            def.initialize.apply(this);
    }
    _def.inputs = {};
    _def.outputs = {};

    for(var key in def.inputs) {
        _def.inputs[key] = {
            type:(typeof def.inputs[key] === 'object')?def.inputs[key].type:def.inputs[key],
            displayName:(typeof def.inputs[key] === 'object')?def.inputs[key].displayName:undefined,
            group:(typeof def.inputs[key] === 'object')?def.inputs[key].group:undefined,
            default:(typeof def.inputs[key] === 'object')?def.inputs[key].default:undefined,
            set:(function() { const _key = key; return function(value) {
                this.inputs[_key] = value;
                if(def.changed && typeof def.changed[_key] === 'function') {
                    def.changed[_key].apply(this,[value]);
                }
            }})()
        }
    }

    for(var key in def.signals) {
        _def.inputs[key] = {
            type:'signal',
            displayName:(typeof def.signals[key] === 'object')?def.signals[key].displayName:undefined,
            group:(typeof def.signals[key] === 'object')?def.signals[key].group:undefined,
            valueChangedToTrue:(function() { const _key = key; return function() {
                const _fn = (typeof def.signals[_key] === 'object')?def.signals[_key].signal:def.signals[_key]
                if(typeof _fn === 'function') {
                    this.scheduleAfterInputsHaveUpdated(() => {
                        _fn.apply(this);
                    }) 
                }
            }})()
        }
    }

    for(var key in def.outputs) {
        if(def.outputs[key] === 'signal') {
            _def.outputs[key] = {
                type:'signal',
            }
        }
        else {
            _def.outputs[key] = {
                type:(typeof def.outputs[key] === 'object')?def.outputs[key].type:def.outputs[key],
                displayName:(typeof def.outputs[key] === 'object')?def.outputs[key].displayName:undefined,
                group:(typeof def.outputs[key] === 'object')?def.outputs[key].group:undefined,
                getter:(function() { const _key = key; return function() {
                    return this.outputs[_key];
                }})()
            }
        }
    }

    _def.methods = _def.prototypeExtensions = {};
    for(var key in def.methods) {
        _def.prototypeExtensions[key] = def.methods[key];
    }
    if(_def.methods.onNodeDeleted) { // Override the onNodeDeleted if required
        _def.methods._onNodeDeleted = function() {
            this.__proto__.__proto__._onNodeDeleted.call(this);
            _def.methods.onNodeDeleted.value.call(this);
        }
    }

    return {node:_def,setup:def.setup};
}

Noodl.defineCollectionNode = function(def) {
    const _def = {
        name:def.name,
        category:def.category,
        color:'data',
        inputs:def.inputs,
        outputs:Object.assign({
            Items:'array',
            'Fetch Started':'signal',
            'Fetch Completed':'signal'
        },def.outputs||{}),
        signals:Object.assign({
            Fetch:function() {
                var _this = this;
                this.sendSignalOnOutput('Fetch Started');
                var a = def.fetch.call(this,function() {
                    _this.sendSignalOnOutput('Fetch Completed');
                });
                this.setOutputs({
                    Items:a
                })
            }
        },def.signals||{})
    }

    return Noodl.defineNode(_def);
}

Noodl.defineModelNode = function(def) {
    const _def = {
        name:def.name,
        category:def.category,
        color:'data',
        inputs:{
            Id:'string'
        },
        outputs:{
            Fetched:'signal'
        },
        changed:{
            Id:function(value) {
                if(this._object && this._changeListener)
                    this._object.off('change',this._changeListener)
                
                this._object = Noodl.Object.get(value);
                this._changeListener = (name,value) => {
                    const _o = {}
                    _o[name] = value;
                    this.setOutputs(_o)
                }
                this._object.on('change',this._changeListener)

                this.setOutputs(this._object.data);
                this.sendSignalOnOutput('Fetched');
            }
        },
        initialize:function() {

        }
    }

    for(var key in def.properties) {
        _def.inputs[key] = def.properties[key];
        _def.outputs[key] = def.properties[key];
        _def.changed[key] = (function() { const _key = key; return function(value) {
            if(!this._object) return;
            this._object.set(_key,value);
        }})()
    }
 
    return Noodl.defineNode(_def);
}

Noodl.defineReactNode = function(def) {
    var _def = Noodl.defineNode(def);

    _def.node.getReactComponent = def.getReactComponent;
    _def.node.inputProps = def.inputProps;
    _def.node.inputCss = def.inputCss;
    _def.node.outputProps = def.outputProps;
    _def.node.setup = def.setup;
    _def.node.frame = def.frame;

    return _def.node;
}

module.exports = Noodl;