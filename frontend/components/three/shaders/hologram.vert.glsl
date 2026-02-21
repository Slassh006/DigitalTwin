uniform float uTime;
uniform float uStiffness;

attribute float aVertexStiffness;   // per-vertex stiffness (kPa, 0–15) — set by BackendMesh

varying vec3  vPosition;
varying vec3  vNormal;
varying vec3  vWorldPosition;
varying float vDisplacement;
varying float vVertexStiffness;     // forwarded to fragment shader

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = modelPosition.xyz;
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);

    // Pass per-vertex stiffness through
    vVertexStiffness = aVertexStiffness;

    // --- Hologram glitch displacement ---
    float glitch = sin(modelPosition.y * 12.0 + uTime * 3.0) * 0.012;
    glitch += sin(modelPosition.y * 40.0 - uTime * 8.0) * 0.004;
    glitch += sin(modelPosition.y * 120.0 + uTime * 20.0) * 0.001;

    // Occasional digital artifact bursts
    float burstA = step(0.97, sin(uTime * 2.7 + modelPosition.y * 4.0));
    float burstB = step(0.99, sin(uTime * 7.3 + modelPosition.x * 10.0));
    glitch += (burstA + burstB) * 0.035 * sin(uTime * 50.0);

    // Stiffness-reactive displacement: higher stiffness = more agitation
    float stiffnessWave = sin(modelPosition.y * 8.0 + uTime * 4.0) * 0.005 * uStiffness;
    glitch += stiffnessWave;

    vDisplacement = glitch;

    vec3 displaced = position + normal * glitch;
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
