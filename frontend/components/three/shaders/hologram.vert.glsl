uniform float uTime;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
    // Pass data to fragment shader
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = modelPosition.xyz;
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);

    // Glitch displacement: subtle sine-wave offset along the normal
    float glitchStrength = sin(modelPosition.y * 12.0 + uTime * 3.0) * 0.015;
    // Add a second higher-frequency glitch for digital feel
    glitchStrength += sin(modelPosition.y * 40.0 - uTime * 8.0) * 0.005;
    // Occasional stronger glitch burst
    float glitchBurst = step(0.96, sin(uTime * 2.5 + modelPosition.y * 5.0));
    glitchStrength += glitchBurst * 0.04 * sin(uTime * 50.0);

    vec3 displaced = position + normal * glitchStrength;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
