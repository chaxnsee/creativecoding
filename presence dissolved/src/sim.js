import * as THREE from 'three';
import { simVertex, simFragment } from './shaders.js';

export class FluidSim {
    constructor(renderer, width, height) {
        this.renderer = renderer;
        this.width = width;
        this.height = height;

        const options = {
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            depthBuffer: false,
            generateMipmaps: false,
        };

        this.rtA = new THREE.WebGLRenderTarget(width, height, options);
        this.rtB = new THREE.WebGLRenderTarget(width, height, options);

        this.simMaterial = new THREE.ShaderMaterial({
            vertexShader: simVertex,
            fragmentShader: simFragment,
            uniforms: {
                uInput: { value: null },
                uHandPos: { value: new THREE.Vector2(0.5, 0.5) },
                uHandActive: { value: 0.0 },
                uAspectRatio: { value: width / height },
                uTime: { value: 0.0 }
            }
        });

        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.simMaterial);
        this.scene.add(this.quad);

        this.renderer.setRenderTarget(this.rtA);
        this.renderer.clear();
        this.renderer.setRenderTarget(this.rtB);
        this.renderer.clear();
        this.renderer.setRenderTarget(null);
    }

    update(handPos, handActive, time) {
        const temp = this.rtA;
        this.rtA = this.rtB;
        this.rtB = temp;

        this.simMaterial.uniforms.uInput.value = this.rtA.texture;
        this.simMaterial.uniforms.uHandPos.value.copy(handPos);
        // Pass float value directly for smooth growth
        this.simMaterial.uniforms.uHandActive.value = handActive;
        this.simMaterial.uniforms.uTime.value = time;

        this.renderer.setRenderTarget(this.rtB);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);
    }

    get output() {
        return this.rtB.texture;
    }

    setSize(w, h) {
        this.width = w;
        this.height = h;
        this.rtA.setSize(w, h);
        this.rtB.setSize(w, h);
        this.simMaterial.uniforms.uAspectRatio.value = w / h;
    }
}
