import * as THREE from "three";
import WebGL from 'three/addons/capabilities/WebGL.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import {OutlinePass} from "three/addons/postprocessing/OutlinePass";
import {ShaderPass} from "three/addons/postprocessing/ShaderPass";
import {GammaCorrectionShader} from "three/addons/shaders/GammaCorrectionShader";
import {RGBAFormat, sRGBEncoding} from "three";

export function setupAndBeginRender(domElement, height, offsetX, offsetY, offsetZ, heightMobile, offsetXMobile, offsetYMobile, offsetZMobile) {
    const width = window.innerWidth;

    // Set up scene
    const scene = new THREE.Scene();

    // Set up camera
    const camera = new THREE.PerspectiveCamera(100, width / height, 0.1, 1000);

    // Set up renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true });

    // Set up orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI / 4 + Math.PI / 2;
    controls.minPolarAngle = -Math.PI / 4 + Math.PI / 2;
    controls.rotateSpeed = 0.35;
    controls.enablePan = false;
    controls.enableZoom = false;

    // Set up resize callback
    window.onresize = () => {
        const width = window.innerWidth;

        if (width < 1400) {
            camera.setViewOffset(width, heightMobile, offsetXMobile, offsetYMobile, width, heightMobile);
            renderer.setSize(width, heightMobile);
            camera.aspect = width / heightMobile;
            camera.position.x = width < 700 ? offsetZ + 2 : offsetZ + 1;
            camera.rotation.y = Math.PI / 2;
        } else {
            camera.setViewOffset(width, height, offsetX, offsetY, width, height);
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.position.x = offsetZ;
            camera.rotation.y = Math.PI / 2;
        }

        controls.update();
        camera.updateProjectionMatrix();
    }

    window.onresize();

    let target;
    if (WebGL.isWebGL2Available()) {
        target = new THREE.WebGLRenderTarget(width * 2, height * 2, {
            format: RGBAFormat,
            encoding: sRGBEncoding
        });
        target.samples = 8;
    }

    // Set up composer
    const composer = new EffectComposer(renderer, target);

    // Set up initial render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Set up gama correction pass
    const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
    composer.addPass(gammaCorrectionPass);

    // Set up sky lighting
    const skyLight = new THREE.HemisphereLight(0xFFFFFF, 0x222222, 1);
    scene.add(skyLight);

    // Set up ambient lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.25);
    scene.add(ambientLight);

    // Load the voyager model
    const loader = new GLTFLoader();
    const clock = new THREE.Clock();
    var voyager;
    var mixer;
    loader.load('/models/voyager.gltf', gltf => {
        voyager = gltf;
        mixer = new THREE.AnimationMixer(voyager.scene);
        mixer.clipAction(voyager.animations[0]).play();
        scene.add(voyager.scene);

        voyager.scene.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI / -1.8);
        voyager.scene.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / -8);

        // Set up outline pass for voyager
        const outlinePass = new OutlinePass(new THREE.Vector2(width, height), scene, camera, [ voyager.scene ]);
        outlinePass.edgeThickness = 2.5;
        outlinePass.edgeStrength = 20.0;
        composer.addPass(outlinePass);
    }, undefined, error => {
        console.error(error);
    });

    // Set up clouds
    const maxCloudDistance = 128;
    const cubeSize = 3;
    const clouds = [];

    const createCloud = (initial) => {
        const width = Math.ceil(Math.random() * 5 + 5);
        const height = 2;
        const length = Math.ceil(Math.random() * 5 + 5);
        const cloud = new THREE.Group();

        const createCube = () => {
            const geometry = new THREE.BoxGeometry(width, height, length);
            const material = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
            return new THREE.Mesh(geometry, material);
        }

        let lastCube = createCube();
        let cube = lastCube;

        for (let x = 0; x < width; x++) {
            for (let z = 0; z < length; z++) {
                let newCube = createCube();

                do {
                    newCube.position.x = cube.position.x + cubeSize * (Math.floor(Math.random() * 3) - 1);
                    newCube.position.z = cube.position.z + cubeSize * (Math.floor(Math.random() * 3) - 1);
                } while (newCube.position.x !== lastCube.position.x && newCube.position.y !== lastCube.position.z);

                cloud.add(newCube);
                cube = newCube;
            }
        }

        cloud.position.y = -7;
        cloud.position.z = (Math.random() * maxCloudDistance * 2) - maxCloudDistance;
        if (initial) {
            cloud.position.x = (Math.random() * maxCloudDistance * 2) - maxCloudDistance;
        } else {
            cloud.position.x = maxCloudDistance;
        }
        return cloud;
    }

    for (let i = 0; i < 16; i++) {
        let cloud = createCloud(true);
        clouds.push(cloud);
        scene.add(cloud);
    }

    // Set up animation loop
    const animate = () => {
        requestAnimationFrame(animate);
        if (voyager && mixer) {
            mixer.update(clock.getDelta() * 0.15);
            mixer.clipAction(voyager.animations[0]).play();
        }

        for (let i = 0; i < clouds.length; i++) {
            let cloud = clouds[i];
            cloud.position.x -= 0.05;
            cloud.position.z -= 0.005;

            // out of bounds
            if (cloud.position.x < -maxCloudDistance) {
                let index = clouds.indexOf(cloud);
                scene.remove(cloud);
                delete clouds[index];
                clouds[index] = createCloud(false);
                scene.add(clouds[index]);
            }
        }

        composer.render();
    }

    // Run the animation loop
    if (WebGL.isWebGLAvailable()) {
        animate();
    } else {
        const warning = WebGL.getWebGLErrorMessage();
        document.getElementById( 'container' ).appendChild( warning );
    }

    domElement.appendChild(renderer.domElement);
}