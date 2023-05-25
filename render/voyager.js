import * as THREE from "three";
import WebGL from 'three/addons/capabilities/WebGL.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function setupAndBeginRender() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene.background = new THREE.Color(0xfdfff5);

    const altLightSource = new THREE.HemisphereLight(0xFFFFFF, 0x000000, 2);
    scene.add(altLightSource);

    const loader = new GLTFLoader();
    const clock = new THREE.Clock();
    var model;
    var mixer;
    loader.load('public/models/voyager.gltf', gltf => {
        model = gltf;
        mixer = new THREE.AnimationMixer(gltf.scene);
        mixer.clipAction(model.animations[0]).play();
        scene.add(gltf.scene);

        model.scene.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI / -1.8);
        model.scene.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / -8);
    }, undefined, error => {
        console.error(error);
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set( 0, 0, 0 )
    controls.enablePan = false;
    controls.enableZoom = false;

    camera.position.x = 2;
    camera.rotation.y = Math.PI / 2;

    const animate = () => {
        requestAnimationFrame( animate );
        if (model && mixer) {
            mixer.update(clock.getDelta() * 0.5);
            mixer.clipAction(model.animations[0]).play();
        }
        renderer.render( scene, camera );
    }

    if (WebGL.isWebGLAvailable()) {
        animate();
    } else {
        const warning = WebGL.getWebGLErrorMessage();
        document.getElementById( 'container' ).appendChild( warning );
    }

    document.body.appendChild(renderer.domElement);
}