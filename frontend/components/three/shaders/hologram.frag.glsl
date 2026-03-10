uniform float uTime;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uOpacity;
uniform float uStiffness;
uniform float uHeatmapEnabled;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDisplacement;

// Stiffness-to-color heatmap: Green -> Yellow -> Red
vec3 heatmapColor(float stiffness) {
    // Normalize stiffness 0-10 kPa range
    float t = clamp(stiffness / 10.0, 0.0, 1.0);
    vec3 green  = vec3(0.15, 1.0, 0.2);    // Healthy (<2 kPa)
    vec3 yellow = vec3(1.0, 0.85, 0.0);     // Moderate (2-5 kPa)
    vec3 red    = vec3(1.0, 0.05, 0.15);    // Lesion (>5 kPa)

    if (t < 0.2) {
        return green;
    } else if (t < 0.5) {
        float f = (t - 0.2) / 0.3;
        return mix(green, yellow, f);
    } else {
        float f = (t - 0.5) / 0.5;
        return mix(yellow, red, f);
    }
}

void main() {
    // --- Fresnel Effect (glowing edges) ---
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
    fresnel = pow(fresnel, 2.2);

    // --- Animated Vertical Scan Stripes ---
    float stripeFreq = 30.0;
    float stripeSpeed = 2.0;
    float stripe = sin(vWorldPosition.y * stripeFreq - uTime * stripeSpeed);
    stripe = smoothstep(0.3, 0.7, stripe * 0.5 + 0.5);

    // --- Fast horizontal scan-line sweep ---
    float scanLine = sin(vWorldPosition.y * 80.0 - uTime * 5.0);
    scanLine = smoothstep(0.92, 1.0, scanLine * 0.5 + 0.5);

    // --- Wide scan-band (periodic bright horizontal band sweeping up) ---
    float scanBand = sin(vWorldPosition.y * 3.0 - uTime * 1.5);
    scanBand = smoothstep(0.85, 1.0, scanBand * 0.5 + 0.5) * 0.3;

    // --- Base hologram color ---
    vec3 stripeColor = mix(uColor, uColor2, stripe);
    vec3 hologramColor = stripeColor * 0.35;

    // Fresnel edge glow
    hologramColor += uColor * fresnel * 1.6;

    // Scan-line accent
    hologramColor += uColor2 * scanLine * 0.3;

    // Scan band
    hologramColor += uColor * scanBand;

    // --- Heatmap overlay ---
    if (uHeatmapEnabled > 0.5) {
        // Spatial stiffness variation using vertex position for regional feel
        float spatialVar = sin(vPosition.x * 2.0 + 0.5) * 0.5 + 0.5;
        float localStiffness = uStiffness * (0.6 + spatialVar * 0.8);
        vec3 heatColor = heatmapColor(localStiffness);

        // Blend heatmap into hologram; stronger at faces, subtle at edges
        float faceFactor = 1.0 - fresnel;
        hologramColor = mix(hologramColor, heatColor * 0.8, faceFactor * 0.55);

        // Boost edge glow with heatmap tint
        hologramColor += heatColor * fresnel * 0.4;
    }

    // --- Displacement highlight ---
    hologramColor += abs(vDisplacement) * uColor * 8.0;

    // --- Alpha compositing ---
    float alpha = uOpacity * (0.45 + fresnel * 0.55);
    alpha += stripe * 0.12;
    alpha += scanLine * 0.1;
    alpha += scanBand * 0.15;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(hologramColor, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
