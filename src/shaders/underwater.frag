precision mediump float;

// Canvas size information
uniform vec2 u_resolution;  // Width and height of the canvas
uniform float u_time;       // Time elapsed (for animations)
uniform float u_zoom;       // NEW: Zoom level uniform
uniform float u_waveFrequency; // Control for wave frequency

// Simple pseudo-random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Value noise function
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    // Smooth interpolation
    vec2 u = smoothstep(0.0, 1.0, f);

    // Mix 4 corners
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Function to draw a sea star
float seaStar(vec2 uv, vec2 center, float radius, float armCount, float armWidth) {
    // Get vector from center to current point
    vec2 toCenter = uv - center;

    // Get distance and angle
    float dist = length(toCenter);
    float angle = atan(toCenter.y, toCenter.x);

    // Create the star shape
    float starShape = radius * (1.0 + armWidth * sin(angle * armCount));

    // Smooth the shape
    float starMask = smoothstep(starShape, starShape - 0.01, dist);

    // Add a little texture to the star
    float starTexture = noise(uv * 30.0) * 0.5              ;

    return starMask * (0.9 + starTexture);
}

// Function for creating floating particles in water
float waterParticle(vec2 uv, vec2 center, float size) {
    float dist = length(uv - center);
    return smoothstep(size, size - 0.005, dist);
}

// Function for creating a sun with enhanced glow
float sun(vec2 uv, vec2 position, float size) {
    float dist = length(uv - position);
    float baseSun = smoothstep(size, size - 0.02, dist);
    
    // Add sun rays with enhanced effect
    float angle = atan(uv.y - position.y, uv.x - position.x);
    float rayIntensity = 0.2 * pow(size / max(dist, 0.001), 2.0) * (0.5 + 0.5 * sin(angle * 12.0 + u_time));
    
    // Combine sun disk with rays
    return baseSun + rayIntensity * smoothstep(size, size + 0.3, dist) * smoothstep(size + 0.5, size + 0.2, dist);
}

void main() {
    // Normalize coordinates for easier calculations
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // Get wave frequency control (default to 1.0 if not provided)
    float waveFreq = max(0.1, u_waveFrequency);
    
    // ZOOM IMPLEMENTATION
    // Default value if u_zoom is not provided
    float zoom = max(0.5, u_zoom);
    
    // Calculate center point for zooming
    vec2 center = vec2(0.5);
    
    // Apply zoom by scaling coordinates around center
    vec2 zoomedUV = center + (uv - center) / zoom;
    
    // Use zoomed coordinates instead of original
    uv = zoomedUV;

    // Adjust aspect ratio
    float aspectRatio = u_resolution.x / u_resolution.y;
    vec2 adjUV = vec2(uv.x * aspectRatio, uv.y);

    // Colors for our scene
    vec3 waterSurfaceColor = vec3(0.1, 0.4, 0.7);  // Blue surface water
    vec3 waterDeepColor = vec3(0.0, 0.1, 0.53);     // Darker deep water
    vec3 sandLightColor = vec3(0.98, 0.88, 0.58);     // Light sand
    vec3 sandDarkColor = vec3(0.7, 0.6, 0.3);      // Darker sand
    vec3 crystalColor = vec3(1.0, 0.95, 0.8);      // Slight white/yellow for crystals
    vec3 seaStarColor1 = vec3(0.9, 0.4, 0.3);      // Coral/reddish sea star
    vec3 seaStarColor2 = vec3(0.55, 0.85, 0.33);    // Yellow-ish sea star
    vec3 seaStarColor3 = vec3(0.5, 0.25, 0.6);     // Purple-ish sea star
    vec3 particleColor = vec3(0.95, 0.95, 1.0);      // Slightly blueish white for water particles
    vec3 causticColor = vec3(1.0, 0.9, 0.7);       // Warm color for caustic light effects

    // NEW COLORS FOR ABOVE WATER (SKY)
    vec3 skyTopColor = vec3(0.4, 0.1, 0.1);       // Dark reddish sky top
    vec3 skyBottomColor = vec3(0.23, 0.75, 0.45);    // Purplish blue sky bottom
    vec3 sunColor = vec3(1.0, 0.9, 0.4);           // Yellow/orange sun color
    vec3 sunGlowColor = vec3(01.30, 0.7, 0.3);       // Warmer outer glow color

    // Apply water distortion effect - use wave frequency parameter
    float waterWaveTime = u_time * 0.70 * waveFreq;
    float waterDistortionStrength = 0.005 * waveFreq;

    // Create a subtle water wave distortion
    vec2 distortedUV = uv;
    distortedUV.x += sin(uv.y * 45.0 * waveFreq + waterWaveTime) * waterDistortionStrength;
    distortedUV.y += cos(uv.x * 20.0 * waveFreq + waterWaveTime * 0.5) * waterDistortionStrength;

    // Use distorted UVs for the water, but not for the sand and stars
    vec2 waterUV = distortedUV;

    // WATER LEVEL TRANSITION EFFECT
    // Create a value that increases over time (but cycles) to control the water level
    float transitionTime = mod(u_time * 0.1, 1.2);  // Cycles from 0 to 1 over 10 seconds

    // Create water gradient with distortion
    vec3 waterColor = mix(waterDeepColor, waterSurfaceColor, waterUV.y);

    // Create sky gradient
    vec3 skyColor = mix(skyBottomColor, skyTopColor, uv.y);

    // Add subtle water depth layers with noise
    float waterDepthNoise = noise(waterUV * 8.0 + vec2(waterWaveTime * 0.1, waterWaveTime * 0.05));
    waterColor = mix(waterColor, mix(waterDeepColor, waterSurfaceColor, 0.5), waterDepthNoise * 0.5);

    // Create sand gradient (bottom 30% of screen)
    vec3 sandColor = mix(sandDarkColor, sandLightColor, uv.x * 0.5 + 0.25);

    // WATER LEVEL TRANSITION - Coming down from the top
    // Calculate a moving water level threshold based on time
    float maxWaterLevel = 1.2;  // Start with water filling the entire screen

    // Water level that descends from top (1.0) to reveal sky
    // When transition is 0, water level is 1.0 (full screen)
    // When transition is 1, water level is 0.5 (half screen)
    float waterLevel = maxWaterLevel - (transitionTime * 0.99);

    // Add undulation to the water surface - use wave frequency
    float undulationStrength = .03 * waveFreq;
    float undulationFrequency = 12.0 * waveFreq;
    float waterSurfaceUndulation = sin(uv.x * undulationFrequency + waterWaveTime * 4.0) * undulationStrength;

    // Final water level with undulation
    float finalWaterLevel = waterLevel + waterSurfaceUndulation;

    // Original sand threshold (30% from bottom)
    float sandThreshold = 0.25;

    // Basic pixelation effect - adjust the pixelSize to change the effect
    float pixelSize = 30.0;
    vec2 pixelatedUV = floor(uv * pixelSize) / pixelSize;

    // Add subtle undulation to the sand/water boundary
    sandThreshold += sin(pixelatedUV.x * 10.0) * 0.02;

    // Create water caustics effect (light patterns that form on the bottom) - use wave frequency
    float causticTime = u_time * 0.2 * waveFreq;
    float causticPattern1 = noise(vec2(uv.x * 10.0 * waveFreq + causticTime, uv.y * 10.0 * waveFreq - causticTime * 0.7));
    float causticPattern2 = noise(vec2(uv.x * 8.0 * waveFreq - causticTime * 1.1, uv.y * 8.0 * waveFreq + causticTime * 0.5));
    float causticPattern = max(
        smoothstep(0.55, 0.35, causticPattern1),
        smoothstep(0.55, 0.85, causticPattern2)
    );

    // Sun ray parameters
    float rayIntensity = 0.2;      // Strength of rays
    float raySpeed = 0.5;          // Speed of ray movement
    float rayFrequency = 5.0;      // How many rays

    // Create base sun rays pattern
    float baseRays = pow(sin(pixelatedUV.x * rayFrequency + u_time * raySpeed), 4.0) * rayIntensity;
    float rays = baseRays * (1.5 - uv.y);  // Fade rays as they go deeper

    // Generate floating particles (dust, plankton) in the water
    float particleEffect = 0.30;

    // Create 30 particles with different sizes and movement patterns
    for (int i = 0; i < 30; i++) {
        // Use the index to create variety in particles
        float index = float(i) / 11.0;

        // Create semi-random particle position that slowly moves upward
        float xOffset = sin(u_time * (-0.5 + index * 0.05) + index * 6.28) * 0.2;
        float yOffset = mod(u_time * (0.1 + index * 0.01) + index, 1.2) - 0.1;

        vec2 particleCenter = vec2(
            mod(0.2 + index * 0.7 + xOffset, 1.50) * aspectRatio,
            0.25 + yOffset
        );

        // Vary the particle size
        float particleSize = 0.002 + index * 0.003;

        // Only show particles below the water level and above the sand
        if (particleCenter.y < finalWaterLevel && particleCenter.y > sandThreshold) {
            particleEffect += waterParticle(adjUV, particleCenter, particleSize);
        }
    }

    // SUN PARAMETERS
    vec2 sunPosition = vec2(0.18 * aspectRatio, 01.2); // Upper left position
    float sunSize = 0.05;                           // Size of the sun
    float sunMask = sun(adjUV, sunPosition, sunSize);
    
    // Choose color based on position
    vec3 finalColor;

    // Above water (sky area)
    if (uv.y > finalWaterLevel) {
        // Base sky color with gradient
        finalColor = skyColor;

        // Add some subtle noise to the sky for texture
        float skyNoise = noise(uv * 10.0 + vec2(u_time * 0.02, 0.0)) * 0.05;
        finalColor += vec3(skyNoise);

        // Add some subtle sun rays in the sky too
        float skyRays = baseRays * 1.5;
        finalColor += vec3(skyRays);

        // Add some subtle clouds
        float cloudPattern = noise(vec2(uv.x * 2.0 - u_time * 0.25, uv.y * 7.0));
        cloudPattern = smoothstep(0.5, 0.6, cloudPattern) * 0.25;
        finalColor = mix(finalColor, vec3(1.6), cloudPattern);
        
        // Add the sun to the sky
        finalColor = mix(finalColor, sunColor, sunMask);
        
        // Add enhanced sun glow
        float glowRadius = length(adjUV - sunPosition);
        float innerGlow = smoothstep(sunSize + 0.2, sunSize, glowRadius) * 0.8;
        float outerGlow = smoothstep(sunSize + 0.5, sunSize + 0.1, glowRadius) * 0.4;
        float totalGlow = innerGlow + outerGlow;
        
        // Apply the enhanced glow
        finalColor = mix(finalColor, mix(sunGlowColor, sunColor, 0.3), totalGlow);
        
        // Add sun light influence on the sky with increased radius
        float sunInfluence = max(0.0, 1.0 - length(adjUV - sunPosition) / (aspectRatio * 1.2));
        finalColor += sunInfluence * vec3(0.3, 0.15, 0.05);
    }
    // Under water but above sand
    else if (uv.y >= sandThreshold) {
        // Water base color with distortion
        finalColor = waterColor;

        // Add the sun rays to water
        finalColor += vec3(rays);

        // Add floating particles to the water
        finalColor = mix(finalColor, particleColor, particleEffect * 0.6);

        // Add subtle blue-green gradient variation to simulate different water densities
        float waterVariation = noise(waterUV * 3.0 + vec2(u_time * 0.05, u_time * 0.03));
        finalColor += vec3(-0.50, 0.02, 0.01) * waterVariation;

        // Add subtle caustic effect to the water (more visible near the sand)
        float waterCaustics = causticPattern * max(0.0, 1.0 - (uv.y - sandThreshold) * 3.0);
        finalColor += causticColor * waterCaustics * 0.1;

        // Add water surface highlight near the water level
        float surfaceHighlight = smoothstep(0.0, 0.05, abs(uv.y - finalWaterLevel)) * 0.5;
        finalColor += vec3(1.0, 1.0, 1.0) * (0.3 - surfaceHighlight);
        
        // Add sun light penetrating the water surface
        if (sunPosition.y > finalWaterLevel) {
            float sunLightPenetration = max(0.0, 0.3 - length(vec2(adjUV.x - sunPosition.x, 0.0)) / aspectRatio) * 
                                       max(0.0, 1.0 - (finalWaterLevel - uv.y) * 5.0);
            finalColor += vec3(0.3, 0.2, 0.0) * sunLightPenetration;
        }
    }
    // Sand area
    else {
        // Base sand color
        finalColor = sandColor;

        // Add crystal speckles to the sand
        vec2 speckleUV = uv * vec2(aspectRatio * 3.0, 3.0) * 20.0;

        // Create multiple layers of noise for varied crystal sizes
        float speckle1 = noise(speckleUV);
        float speckle2 = noise(speckleUV * 2.0);
        float speckle3 = noise(speckleUV * 4.0);

        // Combine different noise scales with different thresholds
        float specklePattern = 0.0;
        specklePattern += (speckle1 > 0.75) ? 0.5 : 0.0;  // Larger, more sparse crystals
        specklePattern += (speckle2 > 0.8) ? 0.3 : 0.0;   // Medium crystals
        specklePattern += (speckle3 > 0.85) ? 0.2 : 0.0;  // Small, fine crystals

        // Create shimmer effect for crystals
        float shimmerSpeed = 2.5;
        float shimmer1 = 0.5 + 0.5 * sin(u_time * shimmerSpeed + speckle1 * 10.0);
        float shimmer2 = 0.5 + 0.5 * sin(u_time * shimmerSpeed * 1.3 + speckle2 * 15.0);
        float shimmer3 = 0.5 + 0.5 * sin(u_time * shimmerSpeed * 0.7 + speckle3 * 20.0);

        float shimmerEffect = (shimmer1 + shimmer2 + shimmer3) / 3.0;
        float rayInfluence = baseRays * 2.0;
        shimmerEffect = shimmerEffect * (1.0 + rayInfluence);

        vec3 shimmeringCrystal = mix(crystalColor, crystalColor * 1.5, shimmerEffect);
        finalColor = mix(finalColor, shimmeringCrystal, specklePattern * 0.7);

        // Add some subtle movement to the sand with time
        float slowTime = u_time * 0.1;
        float sandMovement = noise(vec2(uv.x * 5.0 + slowTime * 0.2, uv.y * 5.0 - slowTime * 0.1)) * 0.03;
        finalColor *= 1.0 + sandMovement;

        // Add caustic light patterns on the sand (underwater light effects)
        finalColor += causticColor * causticPattern * 0.2;

        // Create sea stars
        // First sea star - coral colored with 5 arms
        vec2 starCenter1 = vec2(0.3 * aspectRatio, 0.15);
        float starRadius1 = 0.06;
        float starMask1 = seaStar(adjUV, starCenter1, starRadius1, 5.0, 0.3);

        // Second sea star - yellow with 6 arms
        vec2 starCenter2 = vec2(0.7 * aspectRatio, 0.08);
        float starRadius2 = 0.05;
        float starMask2 = seaStar(adjUV, starCenter2, starRadius2, 6.0, 0.25);

        // Third sea star - purple with 5 arms, smaller
        vec2 starCenter3 = vec2(1.3 * aspectRatio, 0.08);
        float starRadius3 = 0.065;
        float starMask3 = seaStar(adjUV, starCenter3, starRadius3, 5.0, 0.35);

        // Add sea stars to the scene - blend with the sand
        finalColor = mix(finalColor, seaStarColor1, starMask1);
        finalColor = mix(finalColor, seaStarColor2, starMask2);
        finalColor = mix(finalColor, seaStarColor3, starMask3);

        // Make sea stars shimmer slightly with sun rays too
        float starShimmer = baseRays * 0.3;
        finalColor += vec3(starMask1 + starMask2 + starMask3) * starShimmer;
    }

    // Add a vignette effect (darkening around the edges)
    vec2 vignetteCenter = vec2(0.5 * aspectRatio, 0.5);
    float vignetteDistance = length(adjUV - vignetteCenter) / (0.7 * aspectRatio);
    float vignette = 1.0 - vignetteDistance * 0.5;
    finalColor *= vignette;

    // Output the final color
    gl_FragColor = vec4(finalColor, 1.0);
}