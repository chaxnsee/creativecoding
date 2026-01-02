export const simVertex = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const simFragment = `
varying vec2 vUv;
uniform sampler2D uInput;
uniform vec2 uHandPos;
uniform float uHandActive;
uniform float uAspectRatio;
uniform float uTime;

void main() {
    vec4 state = texture2D(uInput, vUv);
    
    // 1. Physics: "Subtle Flow" + "Bouncy"
    // slightly higher decay for flow (0.9 -> 0.93)
    state *= 0.93; 

    // 2. Interaction
    vec2 aspectUV = vUv;
    aspectUV.x *= uAspectRatio;
    vec2 aspectHand = uHandPos;
    aspectHand.x *= uAspectRatio;

    float dist = distance(aspectUV, aspectHand);
    
    // "Form the size of the blob slowly appear"
    // Use the smoothed presence (uHandActive) to animate Radius/Size
    float maxRadius = 0.28;
    float currentRadius = maxRadius * uHandActive;
    
    // Only apply if sufficiently large to avoid artifacts
    if (currentRadius > 0.001) {
        float falloff = smoothstep(currentRadius, currentRadius * 0.6, dist);
        
        // Keep intensity high so the growing blob is dense
        // Fade in slightly at start to avoid pop
        float intensity = smoothstep(0.0, 0.2, uHandActive);
        
        state.r += falloff * intensity;
    }
    
    state.r = clamp(state.r, 0.0, 1.0);

    gl_FragColor = state;
}
`;

export const renderVertex = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const renderFragment = `
varying vec2 vUv;
uniform sampler2D uTexture; // Camera Feed
uniform sampler2D uFlow;    // Fluid Simulation
uniform float uTime;

vec3 acidPalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67); 
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    float epsilon = 0.01; 
    float h = texture2D(uFlow, vUv).r;
    float hRight = texture2D(uFlow, vUv + vec2(epsilon, 0.0)).r;
    float hUp = texture2D(uFlow, vUv + vec2(0.0, epsilon)).r;
    
    vec2 normal = vec2(hRight - h, hUp - h) / epsilon;
    float light = length(normal); 

    vec2 dist = normal * 0.45; 

    vec2 mirroredUV = vec2(1.0 - vUv.x, vUv.y);
    float split = light * 0.02; 
    
    // "Blur like actual glass... inside of the circle little blur"
    // We simulate frosted glass by sampling multiple times.
    // Blur radius increases with liquid thickness (h).
    
    vec3 blurredColor = vec3(0.0);
    float totalWeight = 0.0;
    
    // Blur spread based on thickness. 
    // h=0 -> spread=0 (Sharp), h=1 -> spread=0.006 (Blurred)
    float blurSpread = h * 0.005; 
    
    // 5-Tap Gaussian-ish Sampling Pattern
    // Center, TopRight, TopLeft, BottomLeft, BottomRight
    vec2 offsets[5];
    offsets[0] = vec2(0.0, 0.0);
    offsets[1] = vec2(blurSpread, blurSpread);
    offsets[2] = vec2(-blurSpread, blurSpread);
    offsets[3] = vec2(-blurSpread, -blurSpread);
    offsets[4] = vec2(blurSpread, -blurSpread);

    for(int i = 0; i < 5; i++) {
        vec2 tapUV = mirroredUV - dist + offsets[i];
        
        // Apply chromatic aberration to each blur tap for quality
        float r = texture2D(uTexture, tapUV - vec2(split, 0.0)).r;
        float g = texture2D(uTexture, tapUV).g;
        float b = texture2D(uTexture, tapUV + vec2(split, 0.0)).b;
        
        // Weight center sample more to keep some definition
        float w = (i == 0) ? 2.5 : 1.0;
        
        blurredColor += vec3(r, g, b) * w;
        totalWeight += w;
    }
    
    vec3 camColor = blurredColor / totalWeight;
    
    // Lighting & Edges
    float fresnel = smoothstep(0.2, 0.9, light);
    vec3 iridescent = acidPalette(h * 3.0 + light + uTime * 0.2);
    
    // Dark rim, iridescent tint
    vec3 finalColor = mix(camColor, iridescent, fresnel * 0.5);
    
    float rimDarkening = smoothstep(0.6, 1.0, light) * 0.3;
    finalColor -= vec3(rimDarkening);
    
    float specular = smoothstep(0.5, 0.7, light) * 0.15;
    finalColor += vec3(specular);
    
    finalColor = mix(finalColor, vec3(smoothstep(0.0, 1.1, finalColor)), 0.1);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
