/*jshint browser: true */
/* globals THREE, Stats, app */
/**
 * 
 * distanceFromFloor - distance from to the bottom of the first (from floor) shelf
 * distanceFromTop - distance from the top the top of the last (from floor) shelf
 * 
 * distanceBetweenShelves is calculated based on other parameters and 
 * is a distance between the bottom of one shelf and the top of the below shelf
 * 
 * 
 * 
 */
(function() {
var App = function(canvasId) {
    return this.init(canvasId); 
};
var Utils = {
    PI_HALF: Math.PI / 2,
    PI_180: Math.PI / 180,
    isWebGLSupported: function(canvas) {
        var glContextNames = ['webgl', 'experimental-webgl'];
        for (var i = 0; i < glContextNames.length; i++) {
            try {
                if (canvas.getContext(glContextNames[i]) !== null && !!window.WebGLRenderingContext) {
                    return true;
                }
            } catch(e) {}
        }
        return false;
    },
};

var Notifier = function(areaElement) {
    this.area = areaElement;
    this.clear();
};
Notifier.Level = {};
Notifier.Level.Normal = '';
Notifier.Level.Error = 'error';
Notifier.prototype.notify = function(msg, level) {
    var msgWrapper = document.createElement('span');
    msgWrapper.textContent = '--- ' + msg;
    var classes = '';
    if (level === Notifier.Level.Error) {
        classes += ' error';
    }
    msgWrapper.className = 'new' + ' ' + classes;
    msgWrapper.appendChild(document.createElement('br'));
    this.area.insertBefore(msgWrapper, this.area.firstChild);
    this.area.scrollTop = 0;
    msgWrapper.className = classes;
    this.count++;
    if (this.count > 5) {
        this.area.removeChild(this.area.lastChild);
        this.count = 5;
    }
};
Notifier.prototype.clear = function() {
    this.area.innerHTML = '';
    this.count = 0;
};

App.ViewModeBasic = 0;
App.ViewModeEnv = 1;

App.prototype = {
    showFps: true,
    showWorldAxis: true,
    antialias: true,
    fov: 45,
    sceneSize: 100000,
    
    cameraInitialPosition: [-2173, 3130, -3388],

    assetsPath: 'assets/',
    
    distanceBetweenShelvesMin: 200,
    roomSizeMin: 2000,
    roomSizeStep: 100,
    
    roomHeightMax: 5000,
    roomWidthMax: 10000,
    roomLengthMax: 20000,
    
    sectionsNumMax: 20,
    shelvesNumMax: 20,
    distanceFromFloorMin: 50,
    distanceFromFloorMax: 1000,
    distanceFromFloorStep: 1,
    distanceFromTopMin: 50,
    distanceFromTopMax: 500,
    distanceFromTopStep: 1,
    pillarThicknessMin: 5,
    pillarThicknessMax: 100,
    pillarThicknessStep: 1,
    pillarHeightMin: 1000,
    pillarHeightMax: 4000,
    pillarHeightStep: 1,
    shelfThicknessMin: 5,
    shelfThicknessMax: 100,
    shelfThicknessStep: 1,
    shelfWidthMin: 200,
    shelfWidthMax: 1000,
    shelfWidthStep: 1,
    shelfLengthMin: 350,
    shelfLengthMax: 2000,
    shelfLengthStep: 1,
    
    roomSizeTextureStep: 1000,
    floorTextureRepeatXPerStep: 3,
    floorTextureRepeatYPerStep: 3,
    wallTextureRepeatXPerStep: 1,
    wallTextureRepeatYPerStep: 1,
    
    boardTextureStep: 1000,
    boardTextureRepeatXPerStep: 2,
    boardTextureRepeatYPerStep: 1,

    currency: '$',
    output: {
        quantity: '',
        pillarsQuantity: '',
        shelvingQuantity: '',
        price: '',
        pillarsPrice: '',
        shelvingPrice: '',
    },
    textures: [
        {
            name: 'Beech',
            src: 'beech.jpg',
            price: 295,
            map: null
        },
        {
            name: 'Birch',
            src: 'birch.jpg',
            price: 184,
            map: null
        },
        {
            name: 'Cherry',
            src: 'cherry.jpg',
            price: 276,
            map: null
        },
        {
            name: 'Oak1',
            src: 'oak.jpg',
            price: 221,
            map: null
        },
        {
            name: 'Oak2',
            src: 'oak2.jpg',
            price: 221,
            map: null
        },
        {
            name: 'Oak3',
            src: 'oak3.jpg',
            price: 221,
            map: null
        },
        {
            name: 'Pine',
            src: 'pine.jpg',
            price: 154,
            map: null
        },
        {
            name: 'Poplar',
            src: 'poplar.jpg',
            price: 84,
            map: null
        }
    ],
    options: {
        viewMode: App.ViewModeBasic,
        room: {
            height: 2400,
            length: 6000,
            width: 3000
        },
        floor: {
            color: '#ffffff',
            texture: 'floor-carpeting.jpg'
        },        
        wall: {
            color: '#ffffff',
            texture: 'white_with_stars_wallpaper.png'
        },
        
        shelvesNum: 3,
        sectionsNum: 2,
        distanceFromFloor: 400,
        distanceFromTop: 200,
        distanceBetweenShelves: 550,
        
        pillar: {
            thickness: 30,
            height: 1500,
            color: '#ffffff',
            texture: 2 // an index in this.textures array
        },
        shelf: {
            length: 700,
            width: 300,
            thickness: 30,
            color: '#ffffff',
            texture: 4 // an index in this.textures array
        }
    },
    objectsOptions: {
        YosemiteFrame: {path: 'YosemiteFrame/', scale: [10, 10, 10], offset: [1000, 1700, 20], rotation: [0, 0, 0]},
        ficus: {path: 'ficus/', scale: [20, 20, 20], offset: [200, 0, -250], rotation: [0, 0, 0]},
        hangingLight: {path: 'hangingLight/', scale: [5, 5, 5], offset: [0, -1330, 0], rotation: [0, 0, 0]},
        simple_sofa: {path: 'simple_sofa/', scale: [800, 800, 800], offset: [0, 0, -350], rotation: [0, Math.PI, 0]},
        'wall-flat-tv': {path: 'wall-flat-tv/', scale: [10, 10, 10], offset: [0, 1400, -70], rotation: [0, -Utils.PI_HALF, 0]},
        'livreJava': {path: 'livreJava/', scale: [12, 12, 12], offset: [0, 20, 70], rotation: [0, -Math.PI / 10, 0]},
        
        'sitFemale03': {path: 'sitFemale03/', scale: [9, 9, 9], offset: [-200, 0, -500], rotation: [0, Math.PI - Math.PI / 4, 0]}
    },
    init: function(canvasId) {
        var self = this;
        this.notifier = new Notifier(document.getElementById('notification'));
        this.canvas = document.getElementById(canvasId);
        
        if (!Utils.isWebGLSupported(this.canvas)) {
            this.showError('Unfortunately your browser is not supported');
            return this;
        }
        
        this.initGui();
        
        this.scene = new THREE.Scene();
        this.engine = new THREE.WebGLRenderer({
            antialias: this.antialias,
            canvas: this.canvas
        });
        this.engine.setSize(window.innerWidth, window.innerHeight, true);
        this.engine.setClearColor(0x000000);
        
        this.camera = new THREE.PerspectiveCamera(this.fov, window.innerWidth / window.innerHeight, 1, this.sceneSize);
        this.camera.position.set(
            this.cameraInitialPosition[0], this.cameraInitialPosition[1], -this.cameraInitialPosition[2]
        );
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        
        var light = new THREE.PointLight(0xffffff, 2);
        this.camera.add(light);
        this.scene.add(this.camera);
        light.position.set(0, 1000, 9000);
        light.intensity = 1.2;
        this.light = light;
        
        var controls = new THREE.OrbitControls(this.camera, this.canvas);
        controls.enablePan = false;
        controls.maxPolarAngle = 85 * Utils.PI_180;
        controls.target.set(0, 0, 0);
        controls.zoomSpeed = 1.0;
        controls.rotateSpeed = 1.0;
        controls.minDistance = 100;
        controls.maxDistance = 50000;
        
        this.controls = controls;
        
        this.clock = new THREE.Clock();
        
        var loader = new THREE.LoadingManager();

        var progressEl = document.querySelector('progress');
        loader.onProgress = function(item, loaded, total) {
            self.notifier.notify('Loaded ' + item + ' of ' + loaded);
            progressEl.value = loaded;
            progressEl.max = total;
            progressEl.textContent = loaded;
        };
        loader.onError = function(url) {
            //console.log('There was an error loading ' + url);
            self.notifier.notify('There was an error loading ' + url, Notifier.Level.Error);
        };
        loader.onLoad = function() {
            document.body.removeChild(progressEl.parentNode.parentNode);
            self.onAssetsLoaded();
            self.notifier.clear();
        };
        this.loader = loader;
        this.textureLoader = new THREE.TextureLoader(this.loader);

        this.loadModels();

        //show fps
        if (this.showFps) {
            this.fpsStats = new Stats();
            this.fpsStats.setMode(0);
            window.document.body.appendChild(this.fpsStats.domElement);
        }
        if (this.showWorldAxis) {
            this.createWorldAxis();
        }
        
        this.createFloor();
        this.createWall();

        this.createShelving();
        this.loadTextures();
        this.setViewMode(this.options.viewMode);
        
        window.addEventListener('resize', function() {
            self.engine.setSize(window.innerWidth, window.innerHeight, true);
            self.camera.aspect = window.innerWidth / window.innerHeight;
            self.camera.updateProjectionMatrix();
        });
        
        this.calculateOutput();

        this.run();
        return this;
    },
    loadModels: function() {
        var self = this;
        this.models = {};

        for (var name in this.objectsOptions) {
            var params = this.objectsOptions[name];
            var mtlLoader = new THREE.MTLLoader(this.loader);
            mtlLoader.setPath(this.assetsPath + params.path);
            mtlLoader.load(name + '.mtl', function(name, params) {
                return function(materials) {
                    materials.preload();
                    var objLoader = new THREE.OBJLoader(self.loader);
                    objLoader.setMaterials(materials);
                    objLoader.setPath(self.assetsPath + params.path);
                    objLoader.load(name + '.obj', function(object) {
                        self.onLoadModel(name, object, params);
                    });
                }
            }(name, params));
        }

    },
    onLoadModel: function(name, object, params) {
        object.name = name;
        object.visible = false;
        object.scale.set(params.scale[0], params.scale[0], params.scale[0]);
        object.position.set(params.offset[0], params.offset[1], params.offset[2]);
        object.rotation.set(params.rotation[0], params.rotation[1], params.rotation[2]);
        
        if (name === 'YosemiteFrame' || name === 'ficus') {
            object.children.forEach(function(obj) {
                obj.material.needsUpdate = true;
                obj.material.shininess = 12;
            });
        }
        if (name === 'simple_sofa') {
            object.children.forEach(function(obj) {
                obj.geometry.translate(0, 0, 0.25);
            });
        }
        if (name === 'wall-flat-tv') {
            object.children[1].material.needsUpdate = true;
            object.children[2].material.needsUpdate = true;
            
            object.children[1].material.color.setRGB(1,1,1);
            object.children[1].material.shininess = 0;
            
            object.children[2].material.materials[0].color.setRGB(1, 1, 0);
            object.children[2].material.materials[0].emissiveIntensity = 10;
            object.children[2].material.materials[0].shininess = 0;
            object.children[2].material.materials[0].emissive.setRGB(0.06, 0.06, 0.06);
            
            object.children[2].material.materials[1].color.setRGB(1, 1, 0);
            object.children[2].material.materials[1].emissiveIntensity = 10;
            object.children[2].material.materials[1].shininess = 0;
            object.children[2].material.materials[1].emissive.setRGB(0, 0.5, 1);
            
            var texture = new THREE.VideoTexture(document.getElementById('video'));
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            object.children[1].material.map = texture;
        }
        if (name === 'sitFemale03') {
            object.children[0].material.materials.forEach(function(material) {
                material.needsUpdate = true;
                material.shininess = 0;
            });
        }                
        this.models[name] = object;
        this.scene.add(object);
    },
    placeModels: function() {
        var isVisible = (this.options.viewMode == App.ViewModeEnv) && (this.options.room.length >= 3000);
        for (var name in this.models) {
            var object = this.models[name];
            var params = this.objectsOptions[name];
            object.visible = isVisible;
            
            if (name === 'YosemiteFrame') {
                object.position.z = this.wall.position.z + params.offset[2];
                object.position.y = params.offset[1];
                object.position.x = -this.options.room.length / 2 + params.offset[0];
            }
            if (name === 'ficus') {
                object.position.z = params.offset[2];
                object.position.x = -this.options.room.length / 2 + params.offset[0];
            }            
            if (name === 'hangingLight') {
                object.position.y = this.options.room.height + params.offset[1];
            }
            if (name === 'simple_sofa') {
                object.position.z = this.options.room.width / 2 + params.offset[2];
            }
            if (name === 'wall-flat-tv') {
                object.position.y = params.offset[1];
                object.position.x = this.options.room.length / 2 + params.offset[2];
        
                if (isVisible) {
                    this.models['wall-flat-tv'].children[1].material.map.image.play();
                } else {
                    this.models['wall-flat-tv'].children[1].material.map.image.pause();
                    this.models['wall-flat-tv'].children[1].material.map.image.currentTime = 0;
                }
            }
            if (name === 'livreJava') {
                object.position.y = this.options.distanceFromFloor + this.options.shelf.thickness + params.offset[1];
                object.position.z = -this.options.room.width / 2 + this.options.shelf.width / 2 + params.offset[2];
                if (this.options.sectionsNum % 2) {
                    object.position.x = this.options.shelf.length;
                } else {
                    object.position.x = this.options.shelf.length / 2;
                }
                if (this.options.sectionsNum === 1) {
                    object.position.x = 0;
                }
            }
            
            if (name === 'sitFemale03') {
                object.position.x = params.offset[0];
                object.position.y = 0;
                object.position.z = this.options.room.width / 2 + params.offset[2];
            }
        }
    },
    loadTextures: function() {
        var self = this;
        this.textures.forEach(function(params) {
            self.textureLoader.load(self.assetsPath + params.src, function(texture) {
                params.map = texture;
            });
        });
    },
    onAssetsLoaded: function() {
        this.changePillarTexture();
        this.changeShelfTexture();
        // show controls
        this.gui.domElement.hidden = false;
        this.placeModels();
    },
    changePillarTexture: function() {
        if (this.textures[this.options.pillar.texture]) {
            this.pillarProto.material.map = this.textures[this.options.pillar.texture].map;
            this.updatePillarProtoMaterial();
        }
    },
    changeShelfTexture: function() {
        if (this.textures[this.options.shelf.texture]) {
            this.shelfProto.material.map = this.textures[this.options.shelf.texture].map;
            this.updateShelfProtoMaterial();
        }
    },
    
    initGui: function() {
        var self = this;
        var gui = new dat.GUI();
        gui.domElement.hidden = true;
        
        // viewMode
        var folder = gui.addFolder('View');
        var controller = folder.add(this.options, 'viewMode', {Basic: App.ViewModeBasic, Environment: App.ViewModeEnv}).name('Mode');
        controller.onChange(function(viewMode) {
            self.setViewMode(viewMode);
        });
        folder.open();

        // room size
        folder = gui.addFolder('Room Size');
        // room height
        controller = folder.add(this.options.room, 'height', this.roomSizeMin, this.roomHeightMax, this.roomSizeStep).name('Height');
        controller.onChange(function(height, e) {
            self.setRoomSize(self.options.room.width, self.options.room.length, height);
        });
        // room width
        controller = folder.add(this.options.room, 'width', this.roomSizeMin, this.roomWidthMax, this.roomSizeStep).name('Width');
        controller.onChange(function(width) {
            self.setRoomSize(width, self.options.room.length, self.options.room.height);
        });
        // room length
        controller = folder.add(this.options.room, 'length', this.roomSizeMin, this.roomLengthMax, this.roomSizeStep).name('Length');
        controller.onChange(function(length) {
            self.setRoomSize(self.options.room.width, length, self.options.room.height);
        });

        // shelving
        folder = gui.addFolder('Shelving');
        
        // create texture selectors
        var texturesControlParams = {};
        var params, label;
        for (var i = 0; i < this.textures.length; i++) {
            params = this.textures[i];
            label = params.name + ' - ' + params.price + this.currency;
            texturesControlParams[label] = i;
        }
        controller = folder.add(this.options.pillar, 'texture', texturesControlParams).name('Pillar Material');
        controller.onChange(function() {
            self.changePillarTexture();
            self.calculateOutput();
        }); 
               
        controller = folder.add(this.options.shelf, 'texture', texturesControlParams).name('Shelf Material');
        controller.onChange(function() {
            self.changeShelfTexture();
            self.calculateOutput();
        });        

        controller = folder.add(this.options, 'shelvesNum', 1, this.shelvesNumMax, 1).name('Shelves');
        controller.domElement.querySelector('input').setAttribute('type', 'number');
        controller.onChange(function() {
            self.updateShelving();
        });
        
        controller = folder.add(this.options, 'sectionsNum', 1, this.sectionsNumMax, 1).name('Sections');
        controller.domElement.querySelector('input').setAttribute('type', 'number');
        controller.onChange(function() {
            self.updateShelving();
        });
        
        controller = folder.add(
            this.options, 
            'distanceFromFloor', 
            this.distanceFromFloorMin, 
            this.distanceFromFloorMax, 
            this.distanceFromFloorStep
        ).name('Distance From Floor');
        controller.onChange(function() {
            self.updateShelving();
        });
        
        controller = folder.add(
            this.options, 
            'distanceFromTop', 
            this.distanceFromTopMin, 
            this.distanceFromTopMax, 
            this.distanceFromTopStep
        ).name('Distance From Top');
        controller.onChange(function() {
            self.updateShelving();
        });

        // pillar
        controller = folder.add(
            this.options.pillar, 
            'thickness', 
            this.pillarThicknessMin, 
            this.pillarThicknessMax, 
            this.pillarThicknessStep
        ).name('Pillar Thickness');
        controller.onChange(function() {
            self.updateShelving();
        });
        
        controller = folder.add(
            this.options.pillar, 'height', this.pillarHeightMin, 
            this.pillarHeightMax, this.pillarHeightStep
        ).name('Pillar Height');
        controller.onChange(function() {
            self.updateShelving();
        });
        // shelf
        controller = folder.add(
            this.options.shelf, 'thickness', 
            this.shelfThicknessMin, this.shelfThicknessMax, 
            this.shelfThicknessStep
        ).name('Shelf Thickness');
        controller.onChange(function() {
            self.updateShelving();
        });
        
        controller = folder.add(
            this.options.shelf, 'width', this.shelfWidthMin, this.shelfWidthMax, this.shelfWidthStep
        ).name('Shelf Width');
        controller.onChange(function() {
            self.updateShelving();
        });
        
        controller = folder.add(
            this.options.shelf, 'length', this.shelfLengthMin, this.shelfLengthMax, this.shelfLengthStep
        ).name('Shelf Length');
        controller.onChange(function() {
            self.updateShelving();
        });
        
        folder = gui.addFolder('Result (m3, $)');
        controller = folder.add(this.output, 'shelvingQuantity').name('Shelving Quantity').listen();
        controller = folder.add(this.output, 'pillarsQuantity').name('Pillars Quantity').listen();
        controller = folder.add(this.output, 'quantity').name('Total Quantity').listen();
        controller = folder.add(this.output, 'shelvingPrice').name('Shelving Price').listen();
        controller = folder.add(this.output, 'pillarsPrice').name('Pillars Price').listen();
        controller = folder.add(this.output, 'price').name('Total Price').listen();
        
        folder.open();
        
        this.gui = gui;
    },
    calculateOutput: function() {
        var shelvesTotal = this.options.shelvesNum * this.options.sectionsNum;
        var oneShelf = (this.options.shelf.length / 10) * (this.options.shelf.width / 10) * (this.options.shelf.thickness / 10);
        
        var pillarsTotal = this.options.sectionsNum + 1;
        var onePillar = (this.options.pillar.height / 10) * (this.options.pillar.thickness / 10) * (this.options.shelf.width / 10);
        
        this.output.shelvingQuantity = Math.round(oneShelf * shelvesTotal) / 1000000;
        this.output.pillarsQuantity = Math.round(onePillar * pillarsTotal) / 1000000;
        this.output.quantity = Math.round(1000000 * (this.output.shelvingQuantity + this.output.pillarsQuantity)) / 1000000;
        
        var oneShelfPrice = this.textures[this.options.shelf.texture].price;
        var onePillarPrice = this.textures[this.options.pillar.texture].price;
        this.output.shelvingPrice = Math.round(100 * this.output.shelvingQuantity * oneShelfPrice) / 100;
        this.output.pillarsPrice = Math.round(100 * this.output.pillarsQuantity * onePillarPrice) / 100;
        this.output.price = Math.round(100 * (this.output.shelvingPrice + this.output.pillarsPrice)) / 100;
    },
    setRoomSize: function(width, length, height) {
        var updateGui = false;
        if (height < (this.options.pillar.height + this.roomSizeStep)) {
            height = Math.ceil((this.options.pillar.height + this.roomSizeStep) / this.roomSizeStep) * this.roomSizeStep;
            updateGui = true;
            this.notifier.notify('Room height does not match shelving height, the value was been adjusted');
        }
        
        var shelvingLength = this.options.sectionsNum * (this.options.shelf.length + this.options.pillar.thickness) + this.options.pillar.thickness;
        if (length < (shelvingLength + this.roomSizeStep)) {
            length = Math.ceil((shelvingLength + this.roomSizeStep)/ this.roomSizeStep) * this.roomSizeStep;
            updateGui = true;
            this.notifier.notify('Room length does not match shelving length, the value was been adjusted');
        }
        this.options.room.width = width;
        this.options.room.length = length;
        this.options.room.height = height;
        
        // update wall
        this.wall.scale.x = this.options.room.length / this.roomSizeMin;
        this.wall.scale.y = this.options.room.height / this.roomSizeMin;
        this.wall.position.y = this.options.room.height / 2;
        this.wall.position.z = -this.options.room.width / 2;
        this.wall.material.needsUpdate = true;
        this.wall.material.map.repeat.x = this.options.room.length / this.roomSizeTextureStep * this.wallTextureRepeatXPerStep;
        this.wall.material.map.repeat.y = this.options.room.height / this.roomSizeTextureStep * this.wallTextureRepeatYPerStep;
        
        // update floor
        this.floor.scale.x = this.options.room.length / this.roomSizeMin;
        this.floor.scale.y = this.options.room.width / this.roomSizeMin;
        this.floor.material.needsUpdate = true;
        this.floor.material.map.repeat.x = this.options.room.length / this.roomSizeTextureStep * this.floorTextureRepeatXPerStep;
        this.floor.material.map.repeat.y = this.options.room.width / this.roomSizeTextureStep * this.floorTextureRepeatYPerStep;

        // update shelving
        if (this.options.viewMode == App.ViewModeEnv) {
            this.shelving.position.z = -this.options.room.width / 2 + this.options.shelf.width / 2;
        } else {
            this.shelving.position.z = 0;
        }
        
        if (updateGui) {
            this.gui.__folders['Room Size'].__controllers.forEach(function(controller) {
                controller.updateDisplay();
            });
        }
        this.placeModels();
    },
    setViewMode: function(viewMode) {
        this.options.viewMode = viewMode;
        var isViewEnvMode = (this.options.viewMode == App.ViewModeEnv);
        var isModelsVisible = isViewEnvMode && (this.options.room.length >= 3000);        
        
        if (isViewEnvMode) {
            this.shelving.position.z = -this.options.room.width / 2 + this.options.shelf.width / 2;
        } else {
            this.shelving.position.z = 0;
        }
        
        this.wall.visible = this.floor.visible = isViewEnvMode;
        this.axis.visible = !isViewEnvMode;
        for (var name in this.models) {
            this.models[name].visible = isModelsVisible;
        }
        
        if (this.models['wall-flat-tv']) {
            if (isModelsVisible) {
                this.models['wall-flat-tv'].children[1].material.map.image.play();
            } else {
                this.models['wall-flat-tv'].children[1].material.map.image.pause();
                this.models['wall-flat-tv'].children[1].material.map.image.currentTime = 0;
            }
        }
    },
    showError: function(err) {
        window.alert(err);
    },
    createWorldAxis: function() {
        var axisHelper = new THREE.AxisHelper(6000);
        this.axis  = axisHelper;
        this.axis.visible = false;
        this.scene.add(axisHelper);
    },
    run: function() {
        var self = this;
        function render() {
            var deltaTime = Math.max(0.001, Math.min(self.clock.getDelta(), 1));
            
            if (self.showFps) {
                self.fpsStats.begin();
            }
            self.controls.update(deltaTime);
            self.engine.render(self.scene, self.camera);
            if (self.showFps) {
                self.fpsStats.end();
            }
             window.requestAnimationFrame(render);
        }
        render();
    },

    updateShelving: function() {
        if (this.gui.domElement.hidden) {
            return;
        }

        this.gui.domElement.hidden = true;
        
        this.scene.remove(this.shelving);
        
        this.updatePillarProtoMaterial();
        this.updateShelfProtoMaterial();
        this.createShelving();
        
        // adjust room size to fit new shelving
        this.setRoomSize(this.options.room.width, this.options.room.length, this.options.room.height);
        
        this.calculateOutput();
        this.gui.domElement.hidden = false;
    },
    
    createShelving: function() {
        var updateGui = false;
        this.shelving = new THREE.Group();
        
        // check pillar height, must be enough to fit at least one shelf
        var shelvesHeight = this.options.pillar.height - this.options.distanceFromFloor - this.options.distanceFromTop;
        if (shelvesHeight <= this.options.shelf.thickness) {
            // adjust pillar height and shelvesNum
            shelvesHeight = this.options.shelf.thickness;
            this.options.pillar.height = shelvesHeight + this.options.distanceFromFloor + this.options.distanceFromTop;
            this.options.shelvesNum = 1;
            updateGui = true;
            this.notifier.notify('Only one shelf can fit, shelving height and number of shelves were been adjusted');
        }
        
        // if there's only one shelf then it already fits due to the previous check
        if (this.options.shelvesNum > 1) {
            // check free height
            var freeHeight = shelvesHeight - this.options.shelvesNum * this.options.shelf.thickness;
            var distanceBetweenShelves = parseInt(freeHeight / (this.options.shelvesNum - 1));
            if (distanceBetweenShelves < this.distanceBetweenShelvesMin) {
                // adjust shelvesNum
                updateGui = true;
                distanceBetweenShelves = this.distanceBetweenShelvesMin;
                shelvesNum = parseInt((distanceBetweenShelves + shelvesHeight) / (distanceBetweenShelves + this.options.shelf.thickness));
                if (shelvesNum < 1) {
                    shelvesNum = 1;
                }
                this.options.shelvesNum = shelvesNum;
                
                this.notifier.notify('Number of shelves was been adjusted as there is not enough space to fit all of them');
            }
            this.options.distanceBetweenShelves = distanceBetweenShelves;
        }
        
        this.createShelfProto();
        this.createPillarProto();
        for (var i = 0; i < this.options.sectionsNum; i++) {
            for (var j = 0; j < this.options.shelvesNum; j++) {
                this.createShelf(i, j);
            }
        }
        for (var i = 0; i <= this.options.sectionsNum; i++) {
            this.createPillar(i);
        }
        this.shelving.position.x = -this.options.sectionsNum * (this.options.shelf.length + this.options.pillar.thickness) / 2 + 
            (this.options.shelf.length + this.options.pillar.thickness) / 2;
        this.scene.add(this.shelving);
        
        if (updateGui) {
            this.gui.__folders['Shelving'].__controllers.forEach(function(controller) {
                controller.updateDisplay();
            });
        }
    },
    createPillarProto: function() {
        var self = this;
        var geometry = new THREE.BoxGeometry(this.options.pillar.thickness, this.options.pillar.height, this.options.shelf.width);
        var material = new THREE.MeshLambertMaterial({color: this.options.pillar.color});

        var pillarProto = new THREE.Mesh(geometry, material);
        pillarProto.name = 'pillarProto';
        
        pillarProto.position.y = this.options.pillar.height / 2;
        
        if (!this.pillarProto) {
            this.pillarProto = pillarProto;
        } else {
            pillarProto.material = this.pillarProto.material.clone();
            this.pillarProto = pillarProto;
            this.updatePillarProtoMaterial();
        }
    },
    updatePillarProtoMaterial: function() {
        this.pillarProto.material.needsUpdate = true;
        var texture = this.pillarProto.material.map;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        
        texture.repeat.x = this.options.shelf.width / this.boardTextureStep * this.boardTextureRepeatXPerStep;
        texture.repeat.y = this.options.pillar.height / this.boardTextureStep * this.boardTextureRepeatYPerStep;        
    },
    createShelfProto: function() {
        var self = this;
        var geometry = new THREE.BoxGeometry(this.options.shelf.length, this.options.shelf.thickness, this.options.shelf.width);
        var material = new THREE.MeshLambertMaterial({color: this.options.shelf.color});
        var shelfProto = new THREE.Mesh(geometry, material);
        shelfProto.name = 'shelfProto';
        
        if (!this.shelfProto) {
            this.shelfProto = shelfProto;
        } else {
            shelfProto.material = this.shelfProto.material.clone();
            this.shelfProto = shelfProto;
            this.updateShelfProtoMaterial();
        }
    },
    updateShelfProtoMaterial: function() {
        this.shelfProto.material.needsUpdate = true;
        var texture = this.shelfProto.material.map;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        
        texture.repeat.x = this.options.shelf.length / this.boardTextureStep * this.boardTextureRepeatXPerStep;  
        texture.repeat.y = this.options.shelf.width / this.boardTextureStep * this.boardTextureRepeatYPerStep;
    },    
    createPillar: function(sectionNum) {
        var pillar = this.pillarProto.clone();
        pillar.name = 'pillar_' + sectionNum;
        
        pillar.position.x = sectionNum * (this.options.shelf.length + this.options.pillar.thickness) - 
            this.options.shelf.length / 2 - this.options.pillar.thickness / 2;
        
        this.shelving.add(pillar);
        return pillar;
    },
    createShelf: function(sectionNum, shelfNum) {
        var shelf = this.shelfProto.clone();
        shelf.name = 'shelf_' + sectionNum + '_' + shelfNum;

        shelf.position.y = shelfNum * (this.options.distanceBetweenShelves + this.options.shelf.thickness) + 
            this.options.distanceFromFloor + this.options.shelf.thickness / 2;
        shelf.position.x = sectionNum * (this.options.shelf.length + this.options.pillar.thickness);
        
        this.shelving.add(shelf);
        return shelf;
    },
    createFloor: function() {
        var self = this;
        var geometry = new THREE.PlaneGeometry(this.roomSizeMin, this.roomSizeMin);
        var material = new THREE.MeshBasicMaterial({color: this.options.floor.color});

        var floor = new THREE.Mesh(geometry, material);
        floor.scale.x = this.options.room.length / this.roomSizeMin;
        floor.scale.y = this.options.room.width / this.roomSizeMin;

        floor.rotation.x = -Utils.PI_HALF;
        
        this.textureLoader.load(this.assetsPath + this.options.floor.texture, function(texture) {
            floor.material.needsUpdate = true;
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.x = self.options.room.length / self.roomSizeTextureStep * self.floorTextureRepeatXPerStep;
            texture.repeat.y = self.options.room.width / self.roomSizeTextureStep * self.floorTextureRepeatYPerStep;
            floor.material.map = texture;
        });
        
        floor.visible = false;
        this.floor = floor;
        this.scene.add(floor);
    },
    
    createWall: function() {
        var self = this;
        var geometry = new THREE.PlaneGeometry(this.roomSizeMin, this.roomSizeMin);
        
        var material = new THREE.MeshBasicMaterial({color: this.options.wall.color});

        var wall = new THREE.Mesh(geometry, material);

        wall.scale.x = this.options.room.length / this.roomSizeMin;
        wall.scale.y = this.options.room.height / this.roomSizeMin;
        
        wall.position.y = this.options.room.height / 2;
        wall.position.z = -this.options.room.width / 2;

        this.textureLoader.load(this.assetsPath + this.options.wall.texture, function(texture) {
            wall.material.needsUpdate = true;
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.x = self.options.room.length / self.roomSizeTextureStep * self.wallTextureRepeatXPerStep;
            texture.repeat.y = self.options.room.height / self.roomSizeTextureStep * self.wallTextureRepeatYPerStep;
            wall.material.map = texture;
        });
        
        wall.visible = false;
        this.wall = wall;
        this.scene.add(wall);
    }
};

window.addEventListener('DOMContentLoaded', function() {
    window.app = new App('appCanvas');
});
})();
