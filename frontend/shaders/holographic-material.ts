// Holographic shader for sci-fi medical visualization
export const holographicVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const holographicFragmentShader = `
uniform vec3 glowColor;
uniform float glowIntensity;
uniform float scanLineSpeed;
uniform float time;
uniform vec3 baseColor;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
    // Fresnel effect for edge glow
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);
    
    // Scan line effect
    float scanLine = sin(vUv.y * 50.0 - time * scanLineSpeed) * 0.5 + 0.5;
    scanLine = smoothstep(0.3, 0.7, scanLine);
    
    // Combine effects
    vec3 glow = glowColor * fresnel * glowIntensity;
    vec3 scan = glowColor * scanLine * 0.3;
    
    // Final color with base tint
    vec3 finalColor = baseColor + glow + scan;
    float alpha = 0.7 + fresnel * 0.3;
    
    gl_FragColor = vec4(finalColor, alpha);
}
`;

export const wireframeVertexShader = `
varying vec3 vBarycentric;

attribute vec3 barycentric;

void main() {
    vBarycentric = barycentric;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const wireframeFragmentShader = `
uniform vec3 wireColor;
uniform float wireThickness;
uniform float wireOpacity;

varying vec3 vBarycentric;

void main() {
    // Calculate edge distance
    vec3 deltas = fwidth(vBarycentric);
    vec3 smoothing = deltas * wireThickness;
    vec3 thickness = smoothstep(vec3(0.0), smoothing, vBarycentric);
    
    float edge = min(min(thickness.x, thickness.y), thickness.z);
    float alpha = (1.0 - edge) * wireOpacity;
    
    gl_FragColor = vec4(wireColor, alpha);
}
`;
