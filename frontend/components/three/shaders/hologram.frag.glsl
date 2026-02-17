uniform float uTime;
uniform vec3 uColor;          // Primary hologram color (cyan)
uniform vec3 uColor2;         // Secondary color (magenta)
uniform float uOpacity;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
    // --- Fresnel Effect (glowing edges) ---
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = 1.0 - abs(dot(viewDirection, vNormal));
    fresnel = pow(fresnel, 2.0);

    // --- Animated Vertical Stripe Pattern (scan lines) ---
    float stripeFrequency = 30.0;
    float stripeSpeed = 2.0;
    float stripe = sin((vWorldPosition.y * stripeFrequency) - (uTime * stripeSpeed));
    stripe = smoothstep(0.3, 0.7, stripe * 0.5 + 0.5);

    // --- Secondary horizontal scan line ---
    float scanLine = sin(vWorldPosition.y * 80.0 - uTime * 5.0);
    scanLine = smoothstep(0.9, 1.0, scanLine * 0.5 + 0.5);

    // --- Color mixing ---
    // Blend between cyan and magenta based on stripe pattern
    vec3 stripeColor = mix(uColor, uColor2, stripe);

    // Base hologram color: mix stripe color with Fresnel glow
    vec3 hologramColor = stripeColor * 0.4;

    // Add Fresnel glow (bright cyan edge)
    hologramColor += uColor * fresnel * 1.8;

    // Add scan-line highlights
    hologramColor += uColor2 * scanLine * 0.3;

    // --- Alpha ---
    // Combine base opacity with Fresnel for brighter edges
    float alpha = uOpacity * (0.5 + fresnel * 0.5);
    // Add stripe contribution to alpha for depth
    alpha += stripe * 0.15;
    // Scan-line brightness boost
    alpha += scanLine * 0.1;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(hologramColor, alpha);

    // Three.js built-in includes for correct output
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
