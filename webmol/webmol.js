
//This defines the WebMol object which is used to create viewers
//and configure system-wide settings

//the presence of jquery is assumed
var WebMol = (function() {
    
    var my = {};
    var $ = jQuery; //avoid any conflicts with the dollar

    //create the best viewer according to parameters in config within element
    //config.width - width of viewer, if unset use html elment width
    //config.height - height, if unset use html elment width
    //config.order - preference for types of viewer, glmol or jmol
    //config.callback - for intialization commands to immediately apply to viewer
    //element can either be the html element object or its identifier
    my.createViewer = function(element, config)
    {
        if($.type(element) === "string")
            element = $("#"+element);
        if(!element) return;

        config = config || {};
        if(!config.order)
            config.order = ["glmol","jmol"];
        if(!config.defaultcolors)
            config.defaultcolors = WebMol.defaultElementColors;

        //try to create the appropriate viewer
        for(var i = 0; i < config.order.length; i++) {
            var kind = config.order[i];
            var fname =kind+"Viewer";

            if(typeof(my[fname]) === "function")
            {
                try {
                    return new my[fname](element, config.callback, config.defaultcolors);
                }
                catch(e) {
                    console.log("error with "+kind+":"+e);
                }
            }
        }
        alert("Unable to instantiate webmol viewer: "+config.order);
        return null;
    };
    
    //loads a pdb/pubchem structure into the provided viewer
    my.download = function(query, viewer) {
           var baseURL = '';
           var type = "";
           if (query.substr(0, 4) === 'pdb:') {
                   type = "pdb";
              query = query.substr(4).toUpperCase();
              if (!query.match(/^[1-9][A-Za-z0-9]{3}$/)) {
                 alert("Wrong PDB ID"); return;
              }
              uri = "http://www.pdb.org/pdb/files/" + query + ".pdb";
           } else if (query.substr(0, 4) == 'cid:') {
                   type = "sdf";
              query = query.substr(4);
              if (!query.match(/^[1-9]+$/)) {
                 alert("Wrong Compound ID"); return;
              }
              uri = "http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + query + 
                "/SDF?record_type=3d";
           }

           $.get(uri, function(ret) {
              viewer.addModel(ret, type);
              viewer.zoomTo();
              viewer.render();
           });
    };
    return my;
})();

//From THREE.js src/Three.js

WebMol.extend = function(obj, source) {
  
    //ECMAScript5 compatability
    if (Object.keys) {
        
        var keys = Object.keys(source);
        
        for (var i = 0, il = keys.length; i < il; i++) {
            var prop = keys[i];
            Object.defineProperty( obj, prop, Object.getOwnPropertyDescriptor(source, prop) );
        }
    }
    
    else {
        
        var safeHasOwnProperty = {}.hasOwnProperty;
        
        for (var prop in source) {
            
            if (safeHasOwnProperty.call(source, prop))
                obj[prop] = source[prop];
            
        }
    }
};

WebMol.SurfaceType = {
            VDW : 1,
            SAS : 3,
            SES : 2
    };

// in an attempt to reduce memory overhead, cache all WebMol.Colors
//this makes things a little faster
WebMol.CC = {
    cache : {},
    color : function(hex) {
            if(typeof(this.cache[hex]) != "undefined") {
                return this.cache[hex];
            }
            else {
                var c = new WebMol.Color(hex);
                this.cache[hex] = c;
                return c;
            }
    }
};

//TODO: eventually make all new WebMol types to replace THREE types (color, vector, matrix, etc)
WebMol.Color = function( color ){
    
    if ( arguments.length > 1) {
            this.r = arguments[0] || 0.0;
            this.g = arguments[1] || 0.0;
            this.b = arguments[2] || 0.0;

            return this;
    }
    
    return this.set(color);
                
};

WebMol.Color.prototype = {
    
    constructor: WebMol.Color,
    
    r: 0.0, g: 0.0, b: 0.0,
    
    set : function(val) {
        
            if (val instanceof WebMol.Color) 
                return val.clone();

            else if (typeof val === 'number')
                this.setHex(val);
    },
    
    setHex: function(hex) {
        
            hex = Math.floor(hex);

            this.r = (hex >> 16 & 255) / 255;
            this.g = (hex >> 8 & 255) / 255;
            this.b = (hex & 255) / 255;                                                                                     
        
            return this;
    },
    
    clone : function() {
            return new WebMol.Color(this.r, this.g, this.b);
    },
        
        copy : function(color) {
            this.r = color.r;
            this.g = color.g;
            this.b = color.b;
            
            return this;
        }
    
};

//Miscellaneous functions and classes - to be incorporated into WebMol proper

var mergeGeos = function(geometry, mesh) {
    
    var meshGeo = mesh.geometry;
    
    if (meshGeo === undefined) 
        return;
    
    geometry.geometryGroups.push( meshGeo.geometryGroups[0] );
    
};

//Initialize typed array buffers for completed geometry
//TODO: get rid of the saveArrs argument (always delete arrays)
//For surf render, generate the typed arrays directly (rather than calling this function)
var initBuffers = function(geometry, saveArrs) {
    
    //mesh arrays
    if ( geometry.geometryGroups !== undefined ) {
        
        var group;
        
        for (var i = 0; i < geometry.geometryGroups.length; ++i){
        
            group = geometry.geometryGroups[i];
            
            if (group.__inittedArrays)
                continue;
            
            if (group.vertexArr.length)
                group.__vertexArray = new Float32Array(group.vertexArr);
            if (group.colorArr.length)
                group.__colorArray = new Float32Array(group.colorArr);
            if (group.normalArr.length)
                group.__normalArray = new Float32Array(group.normalArr);
            if (group.faceArr.length)
                group.__faceArray = new Uint16Array(group.faceArr);
            if (group.lineArr)
                group.__lineArray = new Uint16Array(group.lineArr);
            
            //Doesn't free memory directly, but should break references for gc 
            group.vertexArr = null;
            group.colorArr = null;
            group.normalArr = null;
            group.faceArr = null;
            group.lineArr = null;
            
            group.__inittedArrays = true;
            
        }
        
    }
    
    //line arrays
    else {
        
        if (geometry.__inittedArrays)
            return
        
        geometry.__vertexArray = new Float32Array(geometry.vertexArr);
        geometry.__colorArray = new Float32Array(geometry.colorArr);
        
        geometry.vertexArr = null;
        geometry.colorArr = null;
        
        geometry.__inittedArrays = true;
    }        
    
};

//Set up normalArr from faces and vertices
//for faceArr of face4
// Used in cartoon render, when normals must be computed
// after all (4-)faces and vertices are set up
var setUpNormals = function(geo, three) {
    
    for ( var g in geo.geometryGroups ) {
    
        var geoGroup = geo.geometryGroups[g];
    
        var faces = geoGroup.faceArr;
        var verts = geoGroup.vertexArr;
        var norms = geoGroup.normalArr;
        
        //vertex indices
        var a, b, c, d,
        //and actual vertices
        vA, vB, vC, norm;
              
        //face4   
        for ( var i = 0; i < faces.length / 6; i++ ) {

            a = faces[ i * 6 ] * 3;
            b = faces[ i * 6 + 1 ] * 3;
            c = faces[ i * 6 + 4 ] * 3;
            d = faces[ i * 6 + 2 ] * 3;

            vA = new TV3(verts[a], verts[a+1], verts[a+2]);
            vB = new TV3(verts[b], verts[b+1], verts[b+2]);
            vC = new TV3(verts[c], verts[c+1], verts[c+2]);

            vC.subVectors(vC, vB);
            vA.subVectors(vA, vB);
            vC.cross(vA);

            //face normal
            norm = vC;
            norm.normalize();

            norms[a] += norm.x, norms[b] += norm.x, norms[c] += norm.x, norms[d] += norm.x;
            norms[a + 1] += norm.y, norms[b + 1] += norm.y, norms[c + 1] += norm.y, norms[d + 1] += norm.y;
            norms[a + 2] += norm.z, norms[b + 2] += norm.z, norms[c + 2] += norm.z, norms[d + 2] += norm.z;

        }
        
    }
    
};

//WebMol constants (replaces needed THREE constants)

//material constants

// sides
WebMol.FrontSide = 0;
WebMol.BackSide = 1;
WebMol.DoubleSide = 2;

// blending modes
WebMol.NoBlending = 0;
WebMol.NormalBlending = 1;
WebMol.AdditiveBlending = 2;
WebMol.SubtractiveBlending = 3;
WebMol.MultiplyBlending = 4;
WebMol.CustomBlending = 5;

// shading
WebMol.NoShading = 0;
WebMol.FlatShading = 1;
WebMol.SmoothShading = 2;

// colors
WebMol.NoColors = 0;
WebMol.FaceColors = 1;
WebMol.VertexColors = 2;

//Texture constants
//TODO: Which of these do I need (since I only use textures to display label sprites) ?
WebMol.MultiplyOperation = 0;
WebMol.MixOperation = 1;
WebMol.AddOperation = 2;

// mapping modes

WebMol.UVMapping = function() {};

// wrapping modes
WebMol.ClampToEdgeWrapping = 1001;

//Filters
WebMol.LinearFilter = 1006;
WebMol.LinearMipMapLinearFilter = 1008;

//Data types
WebMol.UnsignedByteType = 1009;

//Pixel formats
WebMol.RGBAFormat = 1021;

