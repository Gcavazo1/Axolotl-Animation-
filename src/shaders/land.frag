precision mediump float;

// Canvas size information
uniform vec2 u_resolution;  // Width and height of the canvas
uniform float u_time;       // Time elapsed (for animations)
uniform float u_zoom;       // NEW: Zoom level uniform
uniform float u_sunRayIntensity; // Control for sun ray intensity

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

// Function to draw boulders
float boulder(vec2 uv, vec2 center, float radius, float irregularity) {
    // Get vector from center to current point
    vec2 toCenter = uv - center;
    
    // Get distance and angle
    float dist = length(toCenter);
    float angle = atan(toCenter.y, toCenter.x);
    
    // Create irregular shape using noise
    float noiseVal = noise(vec2(angle * 2.0, center.x * 10.0)) * irregularity;
    float boulderShape = radius * (1.0 - noiseVal);
    
    // Smooth the shape
    float boulderMask = smoothstep(boulderShape, boulderShape - 0.01, dist);
    
    // Add a little texture to the boulder
    float boulderTexture = noise(uv * 20.0) * 0.2;
    
    return boulderMask * (0.8 + boulderTexture);
}

void main() {
    // Get sun ray intensity (default to 0.8 if not provided)
    float rayIntensityMultiplier = max(0.8, u_sunRayIntensity);
    
    // Normalize coordinates for easier calculations
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
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
    vec3 sandLightColor = vec3(0.9, 0.8, 0.5);     // Light sand
    vec3 sandDarkColor = vec3(0.7, 0.6, 0.3);      // Darker sand
    vec3 crystalColor = vec3(1.0, 0.95, 0.8);      // Slight white/yellow for crystals
    vec3 causticColor = vec3(1.0, 0.9, 0.7);       // Warm color for caustic light effects
    vec3 boulderDarkColor = vec3(0.5, 0.48, 0.45);  // Dark gray for boulders
    vec3 boulderLightColor = vec3(0.65, 0.63, 0.6); // Light gray for boulders
    
    // ENHANCED SKY COLORS with more vibrant horizon
    vec3 skyTopColor = vec3(0.63, 0.5, 0.9);        // Deep blue sky at the top
    vec3 skyMidColor = vec3(0.4, 0.7, 1.0);        // Mid blue
    
    // New horizon gradient colors
    vec3 horizonUpperColor = vec3(0.1, 0.8, 0.95);  // Upper horizon - soft blue
    vec3 horizonColor = vec3(0.05, 0.8, 0.6);       // Main horizon - sunset orange/gold
    vec3 horizonLowerColor = vec3(0.65, 0.6, 0.4);  // Lower horizon - deeper orange/amber
    
    vec3 cloudColor = vec3(1.1, 1.0, 1.0);         // White for clouds
    
    // Basic pixelation effect - adjust the pixelSize to change the effect
    float pixelSize = 30.0;
    vec2 pixelatedUV = floor(uv * pixelSize) / pixelSize;
    
    // Sand threshold (bottom 30% of screen)
    float baseSandThreshold = 0.25;
    
    // Add subtle undulation to the sand boundary
    float sandWaveAdjustment = sin(pixelatedUV.x * 10.0) * 0.02;
    float sandThreshold = baseSandThreshold + sandWaveAdjustment;
    
    // Create sand gradient (bottom 30% of screen)
    vec3 sandColor = mix(sandDarkColor, sandLightColor, uv.x * 1.0 + 0.35);
    
    // ENHANCED SKY GRADIENT with five colors instead of three
    vec3 skyColor;
    
    // Define the sky gradient thresholds
    float horizon1 = sandThreshold; // Starting at the sand
    float horizon2 = sandThreshold + 0.07; // Lower horizon
    float horizon3 = sandThreshold + 0.14; // Main horizon
    float midSky = 0.6; // Middle sky
    
    // Apply the enhanced gradient
    if (uv.y < horizon2) {
        // Sand to lower horizon transition - sand to deeper orange
        float t = (uv.y - horizon1) / (horizon2 - horizon1);
        skyColor = mix(sandColor, horizonLowerColor, smoothstep(0.0, 1.0, t));
    } 
    else if (uv.y < horizon3) {
        // Lower horizon to main horizon - deeper orange to orange/gold
        float t = (uv.y - horizon2) / (horizon3 - horizon2);
        skyColor = mix(horizonLowerColor, horizonColor, smoothstep(0.0, 1.0, t));
    }
    else if (uv.y < midSky) {
        // Horizon to upper horizon to mid sky - orange/gold to soft blue to mid blue
        float t = (uv.y - horizon3) / (midSky - horizon3);
        
        // Add a smoother transition with intermediate upper horizon color
        vec3 transitionColor = mix(horizonColor, horizonUpperColor, smoothstep(0.0, 0.5, t));
        skyColor = mix(transitionColor, skyMidColor, smoothstep(0.5, 1.0, t));
    } 
    else {
        // Upper sky - mid blue to deep blue
        float t = (uv.y - midSky) / (1.0 - midSky);
        skyColor = mix(skyMidColor, skyTopColor, t);
    }
    
    // Add color variations to enhance the horizon
    float colorVariation = noise(vec2(uv.x * 5.0, uv.y * 20.0 + u_time * 0.01)) * 0.1;
    
    // Apply more color variation near the horizon
    float horizonFactor = 1.0 - abs((uv.y - horizon3) * 4.0);
    horizonFactor = max(0.0, horizonFactor);
    skyColor += vec3(colorVariation * horizonFactor);
    
    // Add simple clouds to the sky
    float cloudTime = u_time * 0.12;
    float cloudNoise1 = noise(vec2(uv.x * 2.0 + cloudTime, uv.y * 8.0 + cloudTime * 0.2));
    float cloudNoise2 = noise(vec2(uv.x * 3.0 - cloudTime * 1.5, uv.y * 5.0));
    float cloudPattern = max(cloudNoise1, cloudNoise2);
    cloudPattern = smoothstep(0.5, 0.8, cloudPattern);
    
    // Modify cloud distribution - less clouds near horizon for cleaner sunset
    float horizonCloudMask = smoothstep(horizon3, horizon3 + 0.1, uv.y);
    cloudPattern *= horizonCloudMask;
    
    // More clouds higher up
    cloudPattern *= smoothstep(0.6, 0.8, uv.y);
    
    // Tint clouds based on sky position
    vec3 tintedCloudColor = mix(
        mix(horizonColor, cloudColor, 0.5), // Sunset-tinted clouds near horizon
        cloudColor,                          // White clouds higher up
        smoothstep(horizon3, midSky, uv.y)
    );
    
    // Add clouds to sky
    skyColor = mix(skyColor, tintedCloudColor, cloudPattern * 0.9);
    
    // Sun ray parameters - use intensity uniform
    float rayIntensity = 0.3 * rayIntensityMultiplier;      // Strength of rays
    float raySpeed = 0.5;          // Speed of ray movement
    float rayFrequency = 7.0;      // How many rays
    
    // Create base sun rays pattern
    float baseRays = pow(sin(pixelatedUV.x * rayFrequency + u_time * raySpeed), 4.0) * rayIntensity;
    float rays = baseRays * (1.5 - uv.y);  // Fade rays as they go deeper
    
    // Choose color based on position
    vec3 finalColor;
    
    if (uv.y < sandThreshold) {
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
        float shimmerSpeed = 1.5;
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
        
        // Add light patterns on the sand
        float causticTime = u_time * 0.2;
        float causticPattern1 = noise(vec2(uv.x * 10.0 + causticTime, uv.y * 10.0 - causticTime * 0.7));
        float causticPattern2 = noise(vec2(uv.x * 8.0 - causticTime * 1.1, uv.y * 8.0 + causticTime * 0.5));
        float causticPattern = max(
            smoothstep(0.05, 0.25, causticPattern1),
            smoothstep(0.05, 0.85, causticPattern2)
        );
        finalColor += causticColor * causticPattern * 0.2;
        
        // Create boulders
        // First boulder - large
        vec2 boulderCenter1 = vec2(0.3 * aspectRatio, 0.15);
        float boulderRadius1 = 0.08;
        float boulderMask1 = boulder(adjUV, boulderCenter1, boulderRadius1, 0.3);
        
        // Second boulder - medium
        vec2 boulderCenter2 = vec2(0.9 * aspectRatio, 0.18);
        float boulderRadius2 = 0.13;
        float boulderMask2 = boulder(adjUV, boulderCenter2, boulderRadius2, 0.7);
        
        // Third boulder - smaller
        vec2 boulderCenter3 = vec2(0.5 * aspectRatio, 0.22);
        float boulderRadius3 = 0.045;
        float boulderMask3 = boulder(adjUV, boulderCenter3, boulderRadius3, 0.25);
        
        // Fourth boulder - small
        vec2 boulderCenter4 = vec2(0.2 * aspectRatio, 0.05);
        float boulderRadius4 = 0.03;
        float boulderMask4 = boulder(adjUV, boulderCenter4, boulderRadius4, 0.35);
        
        // Add highlighting to boulders based on position
        vec3 boulder1Color = mix(boulderDarkColor, boulderLightColor, 
                              noise(adjUV * 5.0 + vec2(0.0, u_time * 0.08)));
        vec3 boulder2Color = mix(boulderDarkColor, boulderLightColor, 
                              noise(adjUV * 4.0 + vec2(u_time * 0.04, 0.0)));
        vec3 boulder3Color = mix(boulderDarkColor, boulderLightColor, 
                              noise(adjUV * 6.0 + vec2(u_time * 0.03, u_time * 0.02)));
        vec3 boulder4Color = mix(boulderDarkColor, boulderLightColor, 
                              noise(adjUV * 7.0 + vec2(u_time * 0.02, u_time * 0.03)));
        
        // Add boulders to the scene - blend with the sand
        finalColor = mix(finalColor, boulder1Color, boulderMask1);
        finalColor = mix(finalColor, boulder2Color, boulderMask2);
        finalColor = mix(finalColor, boulder3Color, boulderMask3);
        finalColor = mix(finalColor, boulder4Color, boulderMask4);
        
        // Light effect on boulders from sun rays
        float boulderHighlight = baseRays * 0.4;
        finalColor += vec3(boulderMask1 + boulderMask2 + boulderMask3 + boulderMask4) * boulderHighlight;
    } 
    else {
        // We're above sand, so show sky
        finalColor = skyColor;
        
        // ENHANCED SUN - moved higher and made brighter with stronger glow
        vec2 sunCenter = vec2(0.18 * aspectRatio, 1.2);  // Sun position adjusted for sunset scene
        float sunRadius = 0.15;  // Slightly larger sun
        float sunDist = length(adjUV - sunCenter);
        
        // Enhanced sun glow with multiple layers
        float innerGlow = smoothstep(sunRadius, sunRadius - 0.01, sunDist);
        float midGlow = smoothstep(sunRadius * 2.0, sunRadius, sunDist) * 0.6;
        float outerGlow = smoothstep(sunRadius * 4.0, sunRadius * 2.0, sunDist) * 0.3;
        
        // Combined sun mask with multiple layers of glow
        float sunMask = innerGlow;
        float sunGlowMask = midGlow + outerGlow;
        
        // Sun rays extending from the sun - enhanced
        float sunRayFactor = pow(max(-1.0, 1.4 - sunDist / (sunRadius * 7.0)), 2.0) * 0.7;
        
        // Add enhanced sun and rays to sky
        vec3 sunColor = vec3(1.0, 0.9, 0.7);  // Sunset colored sun
        vec3 sunGlowColor = vec3(1.0, 0.7, 0.4);  // Orange-reddish glow
        
        finalColor = mix(finalColor, sunColor, sunMask);
        finalColor = mix(finalColor, sunGlowColor, sunGlowMask);
        finalColor += sunColor * sunRayFactor;
        
        // Add additional sun rays
        finalColor += vec3(rays * 0.6);  // Increased ray intensity
    }
    
    // Add a vignette effect (darkening around the edges)
    vec2 vignetteCenter = vec2(0.5 * aspectRatio, 0.5);
    float vignetteDistance = length(adjUV - vignetteCenter) / (0.7 * aspectRatio);
    float vignette = 1.0 - vignetteDistance * 0.5;
    finalColor *= vignette;
    
    // Output the final color
    gl_FragColor = vec4(finalColor, 1.0);
}