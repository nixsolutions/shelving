/*jshint browser: true */
/* globals THREE, Stats */
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
App.prototype = {
    showFps: true,
    showWorldAxis: true,
    antialias: true,
    fov: 45,
    sceneSize: 1000,
    cameraInitialPosition: [-177, 255, -276],
    assetsPath: 'assets/',
    options: {
        shelvesNum: 3,
        sectionsNum: 2,
        distanceFromFloor: 40,
        distanceBetweenShelves: 55,
        height: 150,
        pillar: {
            thickness: 3,
            color: '#404040'
        },
        shelf: {
            width: 70,
            height: 30,
            thickness: 3,
            color: '#808080',
            texture: 'crate.png'
        }
    },
    
    
    colors: {
        wall: '#804000',
        roof: '#808080'
    },
    materials: {
        wallSide: null,
        wallEnd: null,
        roof: null
    },
    roofSegmentSize: 5,
    roofSegmentProto: null,
    roofSegments: [],
    wallMapRepeatX: 0.4,
    wallMapRepeatY: 0.2,
    buildingWidth: 10,
    buildingLength: 20,
    buildingHeight: 10,
    roofWireframe: false,
    init: function(canvasId) {
        var self = this;
        this.canvas = document.getElementById(canvasId);
        
        if (!Utils.isWebGLSupported(this.canvas)) {
            this.showError('Unfortunately your browser is not supported');
            return this;
        }
        this.sceneSizeHalf = this.sceneSize / 2;
        this.buildingWidthHalf = this.buildingWidth / 2;
        this.buildingLengthHalf = this.buildingLength / 2;
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
        light.position.set(0, 100, 900);
        this.light = light;
        
        var controls = new THREE.OrbitControls(this.camera, this.canvas);
        controls.enablePan = false;
        controls.maxPolarAngle = 85 * Utils.PI_180;
        controls.target.set(0, 0, 0);
        controls.zoomSpeed = 1.0;
        controls.rotateSpeed = 1.0;
        controls.minDistance = 10;
        controls.maxDistance = 5000;
        
        /*
        var fpsControls = new THREE.FirstPersonControls(this.camera, this.canvas);
        fpsControls.activeLook = false;
        fpsControls.movementSpeed = 40;
        //fpsControls.lookSpeed = 0.4;
        //fpsControls.movementSpeed = 20;
        //fpsControls.noFly = true;
        //fpsControls.lookVertical = true;
        //fpsControls.constrainVertical = true;
        //fpsControls.verticalMin = 1.0;
        //fpsControls.verticalMax = 2.0;
        //fpsControls.lon = -150;
        //fpsControls.lat = 120;
        */
        
        this.controls = controls;
        
        this.clock = new THREE.Clock();
        this.textureLoader = new THREE.TextureLoader();
        
        //show fps
        if (this.showFps) {
            this.fpsStats = new Stats();
            this.fpsStats.setMode(0);
            window.document.body.appendChild(this.fpsStats.domElement);
        }
        if (this.showWorldAxis) {
            this.createWorldAxis();
        }
        
        this.createGround();
        
        this.createShelving();
        
        //this.createSkyBox();
        
        //this.createWalls();
        
        //this.createRoof();
        
        window.addEventListener('resize', function() {
            self.engine.setSize(window.innerWidth, window.innerHeight, true);
            self.camera.aspect = window.innerWidth / window.innerHeight;
            self.camera.updateProjectionMatrix();
        });
        
        this.run();
        return this;
    },
    showError: function(err) {
        window.alert(err);
    },
    createWorldAxis: function() {
        var axisHelper = new THREE.AxisHelper(this.sceneSizeHalf);
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
    
    createShelving: function() {
        this.createShelves();
    },
    createShelves: function() {
        this.createShelfProto();
        this.options.distanceBetweenShelves = parseInt(this.options.height / this.options.shelvesNum);
        
        for (var i = 0; i < this.options.sectionsNum; i++) {
            for (var j = 0; j < this.options.shelvesNum; j++) {
                this.createShelf(i, j);
            }
        }
        
    },
    createShelfProto: function() {
        var geometry = new THREE.BoxGeometry(this.options.shelf.width, this.options.shelf.thickness, this.options.shelf.height);
        var material = new THREE.MeshLambertMaterial({
            color: this.options.shelf.color,
            map: this.textureLoader.load(this.assetsPath + this.options.shelf.texture),
            wireframe: false
        });
        
        this.shelfProto = new THREE.Mesh(geometry, material);
        this.shelfProto.name = 'shelfProto';
    },    
    createShelf: function(sectionNum, shelfNum) {
        var shelf = this.shelfProto.clone();
        shelf.name = 'shelf_' + sectionNum + '_' + shelfNum;

        shelf.position.y = shelfNum * this.options.distanceBetweenShelves + this.options.distanceFromFloor;
        shelf.position.x = sectionNum * (this.options.shelf.width + this.options.pillar.thickness);
        
        this.scene.add(shelf);
        return shelf;
    },
    createGround: function() {
        var geometry = new THREE.PlaneGeometry(this.sceneSize, this.sceneSize);
        var texture = this.textureLoader.load(this.assetsPath + 'floor.png');
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.x = texture.repeat.y = 20;
        var material = new THREE.MeshBasicMaterial({map: texture});
        var ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
    },

    createSkyBox: function() {
        var urls = [
            this.assetsPath + 'px.jpg',
            this.assetsPath + 'nx.jpg',
            this.assetsPath + 'py.jpg',
            this.assetsPath + 'ny.jpg',
            this.assetsPath + 'pz.jpg',
            this.assetsPath + 'nz.jpg'
        ];
        var loader = new THREE.CubeTextureLoader();
        var textureCube = loader.load(urls);
        var shader = THREE.ShaderLib.cube;
        shader.uniforms.tCube.value = textureCube;
        var material = new THREE.ShaderMaterial({
            fragmentShader: shader.fragmentShader,
            vertexShader: shader.vertexShader,
            uniforms: shader.uniforms,
            depthWrite: false,
            side: THREE.BackSide
        });
        var skyMesh = new THREE.Mesh(new THREE.BoxGeometry(this.sceneSize, this.sceneSize, this.sceneSize), material);
        this.scene.add(skyMesh);
    },
    createRoofSegmentProto: function() {
        var rad = this.buildingWidthHalf + 2;
        var geometry = new THREE.CylinderGeometry(rad, rad, this.roofSegmentSize, 3, 2);
        var material = new THREE.MeshBasicMaterial({color: this.colors.roof, wireframe: this.roofWireframe});
        this.roofSegmentProto = new THREE.Mesh(geometry, material);
        this.materials.roof = material;
        this.roofSegmentProto.rotation.x = -Utils.PI_HALF;
        this.roofSegmentProto.rotation.z = Utils.PI_HALF;
        this.roofSegmentProto.position.y = this.buildingHeight - 1.5;
        this.roofSegmentProto.name = 'roofSegmentProto';
    },
    createRoof: function() {
        this.createRoofSegmentProto();
        var segCnt = parseInt(this.buildingLength / this.roofSegmentSize);
        for (var i = 0; i < segCnt; i++) {
            this.createRoofSegment(i);
        }
    },
    createRoofSegment: function(pos) {
        var seg = this.roofSegmentProto.clone();
        seg.name = 'roofSegment' + pos;
        seg.position.x = pos * this.roofSegmentSize - this.buildingLengthHalf + this.roofSegmentSize / 2;
        this.roofSegments.push(seg);
        this.scene.add(seg);
        return seg;
    },
    updateRoofLength: function() {
        var self = this;
        var segCnt = parseInt(this.buildingLength / this.roofSegmentSize);
        var curSegCnt = this.roofSegments.length;
        var i;
        var seg;
        var scaleX = this.roofSegments[0].scale.x;
        if (segCnt < curSegCnt) {
            for (i = curSegCnt; i > segCnt; i--) {
                seg = this.roofSegments.pop();
                this.scene.remove(seg);
            }
        } else if (segCnt > curSegCnt) {
            for (i = curSegCnt; i < segCnt; i++) {
                seg = this.createRoofSegment(i);
                seg.scale.x = scaleX;
            }
        }
        this.roofSegments.forEach(function(seg, pos) {
            seg.position.x = pos * self.roofSegmentSize - self.buildingLengthHalf + self.roofSegmentSize / 2;
        });
    },
    updateRoofWidth: function() {
        var rad = this.buildingWidthHalf + 2;
//        var scaleX = Math.ceil(rad / this.roofSegmentProto.geometry.parameters.radiusTop);
        var scaleX = (this.buildingWidthHalf / 5);
        this.roofSegments.forEach(function(seg) {
            seg.scale.x = scaleX;
        });
    },
    createWalls: function() {
        var self = this;
        var normalMap = new THREE.TextureLoader().load(this.assetsPath + '154_norm.jpg', function(normalMap) {
            normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
            normalMap.repeat.x = self.wallMapRepeatX * self.buildingLength;
            normalMap.repeat.y = self.wallMapRepeatY * self.buildingHeight;
            
            var wallSideMaterial = new THREE.MeshPhongMaterial({
                map: normalMap,
                normalMap: normalMap,
                shininess: 0,
                reflectivity: 0,
                specular: 0xffffff,
                color: self.colors.wall
            });
            var endNormalMap = normalMap.clone();
            endNormalMap.needsUpdate = true;
            endNormalMap.repeat.x = self.wallMapRepeatX * self.buildingWidth;
            var wallEndMaterial = wallSideMaterial.clone();
            wallEndMaterial.map = wallEndMaterial.normalMap = endNormalMap;
            
            var wallGeometry = new THREE.PlaneGeometry(1, 1);
            self.materials.wallSide = wallSideMaterial;
            self.materials.wallEnd = wallEndMaterial;

            var left = new THREE.Mesh(wallGeometry, wallSideMaterial);
            left.position.z = -self.buildingWidthHalf;
            left.rotation.y = Math.PI;
            left.name = 'left';
            var right = new THREE.Mesh(wallGeometry, wallSideMaterial);
            right.position.z = self.buildingWidthHalf;
            right.name = 'right';
            left.scale.x = right.scale.x = self.buildingLength;

            var near = new THREE.Mesh(wallGeometry, wallEndMaterial);
            near.position.x = -self.buildingLengthHalf;
            near.rotation.y = -Utils.PI_HALF;
            near.name = 'near';
            var far = new THREE.Mesh(wallGeometry, wallEndMaterial);
            far.position.x = self.buildingLengthHalf;
            far.rotation.y = Utils.PI_HALF;
            far.name = 'far';
            far.scale.x = near.scale.x = self.buildingWidth;

            left.scale.y = right.scale.y = near.scale.y = far.scale.y = self.buildingHeight;

            self.scene.add(left);
            self.scene.add(right);
            self.scene.add(near);
            self.scene.add(far);
        });
    },
    changeColor: function(type, color) {
        this.colors[type] = color;
        switch (type) {
            case 'wall':
                this.materials.wallSide.color.set(color);
                this.materials.wallEnd.color.set(color);
                break;
            case 'roof':
                this.materials.roof.color.set(color);
                break;
        }
    },
    changeLength: function(length) {
        this.buildingLength = length;
        this.buildingLengthHalf = this.buildingLength / 2;
        
        this.scene.getObjectByName('near').position.x = -this.buildingLengthHalf;
        this.scene.getObjectByName('far').position.x = this.buildingLengthHalf;
        
        this.scene.getObjectByName('left').scale.x = this.buildingLength;
        this.scene.getObjectByName('right').scale.x = this.buildingLength;
        
        this.materials.wallSide.map.repeat.x =
            this.materials.wallSide.normalMap.repeat.x = this.wallMapRepeatX * this.buildingLength;
        
        this.updateRoofLength();
    },
    changeWidth: function(width) {
        this.buildingWidth = width;
        this.buildingWidthHalf = this.buildingWidth / 2;
        
        this.scene.getObjectByName('near').scale.x = this.buildingWidth;
        this.scene.getObjectByName('far').scale.x = this.buildingWidth;
        
        this.scene.getObjectByName('left').position.z = -this.buildingWidthHalf;
        this.scene.getObjectByName('right').position.z = this.buildingWidthHalf;
        
        this.materials.wallEnd.map.repeat.x =
            this.materials.wallEnd.normalMap.repeat.x = this.wallMapRepeatX * this.buildingWidth;
        
        this.updateRoofWidth();
    },
};

window.addEventListener('DOMContentLoaded', function() {
    window.app = new App('appCanvas');
});
})();
