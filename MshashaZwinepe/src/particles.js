 import * as THREE from 'three';

        // Initialize the 3D particle system
        let scene, camera, renderer;
        let particles = [];
        let points, linesMesh, glowMesh;
        let particleCount = 150; // Reduced for performance
        let maxDistance = 100;
        let baseSpeed = 0.3; // Slower for background
        let scatterRange = 600;

        // Mouse interaction
        let mouseX = 0, mouseY = 0;
        const mouseRadius = 150;
        const mouseStrength = 0.5;

        // Control variables
        let linesVisible = true;
        let orbitEnabled = true;
        let colorScheme = 0;
        let frame = 0;

        // Initialize the particle system
        initParticleSystem();

        function initParticleSystem() {
            // Set up Three.js scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x000511);

            camera = new THREE.PerspectiveCamera(
                60,
                window.innerWidth / window.innerHeight,
                1,
                2000
            );
            camera.position.z = 400;

            renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            document.getElementById('particle-container').appendChild(renderer.domElement);

            // Create particle system
            createParticles();

            // Add subtle lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
            scene.add(ambientLight);

            // Event listeners
            document.addEventListener('mousemove', onMouseMove, false);
            window.addEventListener('resize', onWindowResize);

            // Start animation
            animate();
        }

        function createParticles() {
            // Remove existing particles if any
            if (points) {
                scene.remove(points);
                points.geometry.dispose();
                points.material.dispose();
            }
            if (linesMesh) {
                scene.remove(linesMesh);
                linesMesh.geometry.dispose();
                linesMesh.material.dispose();
            }
            if (glowMesh) {
                scene.remove(glowMesh);
                glowMesh.geometry.dispose();
                glowMesh.material.dispose();
            }

            particles = [];

            // Create particle geometry
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const sizes = [];

            const color = new THREE.Color();

            for (let i = 0; i < particleCount; i++) {
                // Scatter particles throughout a large volume
                let x = (Math.random() - 0.5) * scatterRange;
                let y = (Math.random() - 0.5) * scatterRange;
                let z = (Math.random() - 0.5) * scatterRange;

                positions.push(x, y, z);

                // Set particle color based on scheme
                setParticleColor(color, i);
                colors.push(color.r, color.g, color.b);
                
                // Vary particle sizes
                sizes.push(Math.random() * 1.5 + 1.5);

                particles.push({
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * baseSpeed,
                        (Math.random() - 0.5) * baseSpeed,
                        (Math.random() - 0.5) * baseSpeed
                    ),
                    connections: 0,
                    clusterId: Math.floor(Math.random() * 3)
                });
            }

            geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));

            // Create particle material
            const material = new THREE.PointsMaterial({
                size: 3,
                vertexColors: true,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.7
            });

            points = new THREE.Points(geometry, material);
            scene.add(points);

            // Create connection lines
            const lineGeometry = new THREE.BufferGeometry();
            const linePositions = new Float32Array(particleCount * particleCount * 3 * 2);
            const lineColors = new Float32Array(particleCount * particleCount * 3 * 2);
            
            lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
            lineGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
            
            const lineMaterial = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.4,
                linewidth: 1
            });
            
            linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
            scene.add(linesMesh);

            // Create glow effect
            const glowGeometry = new THREE.BufferGeometry();
            glowGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
            
            const glowMaterial = new THREE.PointsMaterial({
                size: 6,
                color: 0x4ecdc4, // Match your secondary color
                transparent: true,
                opacity: 0.2,
                blending: THREE.AdditiveBlending
            });
            
            glowMesh = new THREE.Points(glowGeometry, glowMaterial);
            scene.add(glowMesh);
        }

        function setParticleColor(color, index) {
            // Use colors that match your website theme
            const schemes = [
                () => color.setHSL(0.6, 0.7, 0.5), // Blue
                () => color.setHSL(0.1, 0.7, 0.6), // Warm (matches primary)
                () => color.setHSL(0.5, 0.7, 0.5), // Teal (matches secondary)
                () => color.setHSL(0.7, 0.7, 0.5), // Purple
                () => color.setHSL(0.3, 0.7, 0.6)  // Green
            ];
            schemes[colorScheme]();
        }

        function onMouseMove(event) {
            mouseX = (event.clientX - window.innerWidth / 2);
            mouseY = (event.clientY - window.innerHeight / 2);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
            requestAnimationFrame(animate);
            frame++;

            const positions = points.geometry.attributes.position.array;
            const colors = points.geometry.attributes.color.array;
            const sizes = points.geometry.attributes.size.array;
            const glowPositions = glowMesh.geometry.attributes.position.array;
            const linePositions = linesMesh.geometry.attributes.position.array;
            const lineColors = linesMesh.geometry.attributes.color.array;
            
            let lineIndex = 0;
            let colorIndex = 0;

            // Reset connection counts
            for (let i = 0; i < particleCount; i++) {
                particles[i].connections = 0;
            }

            // Update particle positions
            for (let i = 0; i < particleCount; i++) {
                glowPositions[i * 3] = positions[i * 3];
                glowPositions[i * 3 + 1] = positions[i * 3 + 1];
                glowPositions[i * 3 + 2] = positions[i * 3 + 2];

                // Update position with velocity
                positions[i * 3] += particles[i].velocity.x;
                positions[i * 3 + 1] += particles[i].velocity.y;
                positions[i * 3 + 2] += particles[i].velocity.z;

                // Mouse interaction
                const dx = positions[i * 3] - mouseX;
                const dy = positions[i * 3 + 1] - mouseY;
                const distanceToMouse = Math.sqrt(dx * dx + dy * dy);
                
                if (distanceToMouse < mouseRadius) {
                    const force = (1 - distanceToMouse / mouseRadius) * mouseStrength;
                    particles[i].velocity.x += (dx / distanceToMouse) * force * 0.05;
                    particles[i].velocity.y += (dy / distanceToMouse) * force * 0.05;
                }

                // Boundary constraints
                const boundary = scatterRange / 2;
                for (let j = 0; j < 3; j++) {
                    const axisIndex = i * 3 + j;
                    if (positions[axisIndex] > boundary || positions[axisIndex] < -boundary) {
                        particles[i].velocity.setComponent(
                            j,
                            particles[i].velocity.getComponent(j) * -0.9
                        );
                        positions[axisIndex] = THREE.MathUtils.clamp(positions[axisIndex], -boundary, boundary);
                    }
                }

                // Add subtle floating motion
                particles[i].velocity.x += Math.sin(frame * 0.01 + i) * 0.003;
                particles[i].velocity.y += Math.cos(frame * 0.012 + i) * 0.003;
                particles[i].velocity.z += Math.sin(frame * 0.009 + i) * 0.003;

                // Limit velocity
                particles[i].velocity.clampLength(0, baseSpeed * 1.5);
            }

            // Create connections between particles
            for (let i = 0; i < particleCount; i++) {
                for (let j = i + 1; j < particleCount; j++) {
                    const dx = positions[i * 3] - positions[j * 3];
                    const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                    const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist < maxDistance) {
                        particles[i].connections++;
                        particles[j].connections++;

                        const strength = 1 - (dist / maxDistance);
                        
                        linePositions[lineIndex++] = positions[i * 3];
                        linePositions[lineIndex++] = positions[i * 3 + 1];
                        linePositions[lineIndex++] = positions[i * 3 + 2];

                        linePositions[lineIndex++] = positions[j * 3];
                        linePositions[lineIndex++] = positions[j * 3 + 1];
                        linePositions[lineIndex++] = positions[j * 3 + 2];

                        const color1 = new THREE.Color(colors[i*3], colors[i*3+1], colors[i*3+2]);
                        lineColors[colorIndex++] = color1.r;
                        lineColors[colorIndex++] = color1.g;
                        lineColors[colorIndex++] = color1.b;
                        
                        const color2 = new THREE.Color(colors[j*3], colors[j*3+1], colors[j*3+2]);
                        lineColors[colorIndex++] = color2.r;
                        lineColors[colorIndex++] = color2.g;
                        lineColors[colorIndex++] = color2.b;
                    }
                }
            }

            // Adjust particle appearance based on connections
            for (let i = 0; i < particleCount; i++) {
                const connectionFactor = Math.min(particles[i].connections / 8, 1);
                sizes[i] = 1.5 + connectionFactor * 2;
                
                glowPositions[i * 3] = positions[i * 3];
                glowPositions[i * 3 + 1] = positions[i * 3 + 1];
                glowPositions[i * 3 + 2] = positions[i * 3 + 2];
            }

            // Update geometries
            linesMesh.geometry.setDrawRange(0, lineIndex / 3);
            linesMesh.geometry.attributes.position.needsUpdate = true;
            linesMesh.geometry.attributes.color.needsUpdate = true;

            points.geometry.attributes.position.needsUpdate = true;
            points.geometry.attributes.size.needsUpdate = true;

            glowMesh.geometry.attributes.position.needsUpdate = true;

            // Camera movement
            if (orbitEnabled) {
                const time = frame * 0.002;
                const radius = 400 + Math.sin(time * 0.3) * 50;
                camera.position.x = Math.sin(time) * radius + mouseX * 0.02;
                camera.position.z = Math.cos(time) * radius;
                camera.position.y = Math.sin(time * 0.5) * 100 + mouseY * 0.02;
            }
            
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        }

        // Change color theme every 30 seconds
        setInterval(() => {
            colorScheme = (colorScheme + 1) % 5;
            createParticles();
        }, 30000);