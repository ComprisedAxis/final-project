window.addEventListener('DOMContentLoaded', () => {
    // Wait for the DOM to be fully loaded before executing the script

    // ----- Simulation Parameters -----
    const simulationParams = {
        gravity: -9.81, // Gravity acceleration (m/s^2)
        windStrength: 10, // Base wind strength
        windDirection: { x: 1, y: 1, z: 0 }, // Wind direction vector
        rainIntensity: 5, // Intensity of rain
        showShadows: true, // Whether to render shadows
        environmentMap: true, // Use environment map for reflections
        addCloth: addNewCloth, // Function to add a new cloth
        removeCloth: removeCloth, // Function to remove a cloth
        clothTypes: {
            "Silk": {
                stiffness: 300, // Cloth stiffness
                damping: 0.02, // Cloth damping factor
                mass: 0.1, // Mass of cloth particles
                windResistance: 1.5,  // High wind effect
                waterAbsorption: 1.2   // Gets heavy when wet
            },
            "Cotton": {
                stiffness: 800,
                damping: 0.1,
                mass: 0.2,
                windResistance: 1.0,  // Medium wind effect
                waterAbsorption: 1.5   // Gets very heavy when wet
            },
            "Denim": {
                stiffness: 1500,
                damping: 0.2,
                mass: 0.3,
                windResistance: 0.7,  // Low wind effect
                waterAbsorption: 0.8   // Resistant to water
            },
        },
        selectedClothType: "Silk", // Default selected cloth type
    };

    // Initialize cloths array
    const cloths = []; // Array to hold cloth instances

    // ----- Three.js Setup -----
    const scene = new THREE.Scene();    // Create a new Three.js scene

    // Load the environment map texture
    const envMap = THREE.ImageUtils.loadTexture('assets/sky.jpg'); // Load sky image as texture
    // Set the environment and background of the scene
    scene.environment = envMap;
    scene.background = envMap;

    // Load ground textures for the grass
    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load('assets/grass/color.jpg'); // Color texture
    const grassNormal = textureLoader.load('assets/grass/normal.jpg'); // Normal map
    const grassRoughness = textureLoader.load('assets/grass/roughness.jpg'); // Roughness map

    // Repeat the ground textures to cover a large area
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassNormal.wrapS = grassNormal.wrapT = THREE.RepeatWrapping;
    grassRoughness.wrapS = grassRoughness.wrapT = THREE.RepeatWrapping;

    // Set the repeat patterns
    grassTexture.repeat.set(250, 250);
    grassNormal.repeat.set(250, 250);
    grassRoughness.repeat.set(250, 250);

    // Camera and renderer setup
    // Set up the camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); // Field of view, aspect ratio, near and far clipping planes
    camera.position.set(10, 30, 40); // Position the camera
    camera.lookAt(0, 0, 0); // Make the camera look at the center of the scene

    // Set up the renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true }); // Enable antialiasing
    renderer.setSize(window.innerWidth, window.innerHeight); // Set the renderer size to the window size
    renderer.shadowMap.enabled = true; // Enable shadow maps
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Set tone mapping
    renderer.toneMappingExposure = 1.0; // Set exposure
    document.body.appendChild(renderer.domElement); // Add the renderer's canvas element to the document body

    // Add OrbitControls for camera interaction
    const controls = new THREE.OrbitControls(camera, renderer.domElement); // Allow orbiting the camera around the scene
    controls.enableDamping = true; // Enable damping (inertia)
    controls.dampingFactor = 0.05; // Damping factor

    // Add Lighting
    // Add a directional light to simulate sunlight
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // White light, full intensity
    directionalLight.position.set(50, 50, 50); // Position the light
    directionalLight.castShadow = true; // Enable shadows from this light
    // Set up shadow properties for better quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    // Add ambient light to softly illuminate the scene
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    scene.add(ambientLight);

    // ----- Ground -----
    // Create a large plane to serve as the ground
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000); // Width and height
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture, // Use grass texture
        normalMap: grassNormal, // Apply normal map for bumps
        roughnessMap: grassRoughness, // Apply roughness map
        roughness: 0.8,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
    ground.position.y = 0; // Position at the bottom
    ground.receiveShadow = true; // Ground can receive shadows
    scene.add(ground); // Add the ground to the scene

    // ----- Rod Creation Function -----
    // Function to create the rod structure that holds the cloths
    function createRod() {
        const rodGroup = new THREE.Group(); // Create a group to hold the rod parts

        const material = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            metalness: 0.8,
            roughness: 0.2
        });

        // Create the horizontal rod (length: 40 units)
        const rodGeometry = new THREE.CylinderGeometry(0.1, 0.1, 40, 32); // Radius top, radius bottom, height, segments
        const rodMesh = new THREE.Mesh(rodGeometry, material); // Create a mesh using the geometry
        rodMesh.rotation.z = Math.PI / 2; // Rotate to make it horizontal
        rodMesh.position.set(0, 15, 0); // Position at the center
        rodMesh.castShadow = true;

        // Create the left vertical pole
        const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 15, 32);
        const leftPole = new THREE.Mesh(poleGeometry, material);
        leftPole.position.set(-20, 7.5, 0);
        leftPole.castShadow = true;

        // Create the right vertical pole
        const rightPole = new THREE.Mesh(poleGeometry, material);
        rightPole.position.set(20, 7.5, 0);
        rightPole.castShadow = true;

        rodGroup.add(rodMesh, leftPole, rightPole);
        return rodGroup;
    }

    // Create the rod and add it to the scene
    const rod = createRod();
    scene.add(rod);

    // ----- Cloth Class -----
    // Class representing a cloth object
    class Cloth {
        constructor(width, height, segmentsX, segmentsY, materialParams, position) {
            // Initialize cloth properties
            this.width = width; // Width of the cloth
            this.height = height; // Height of the cloth
            this.segmentsX = segmentsX; // Number of segments along X
            this.segmentsY = segmentsY; // Number of segments along Y
            this.materialParams = materialParams; // Physical properties of the cloth
            this.position = position; // Position of the cloth in the scene

            this.particles = []; // Particles representing cloth nodes
            this.constraints = []; // Constraints between particles

            // Create geometry using a parametric function
            this.geometry = new THREE.ParametricBufferGeometry(this.clothFunction.bind(this), this.segmentsX, this.segmentsY);
            this.geometry.computeVertexNormals(); // Compute normals for smooth shading

            // Assign a random color to the cloth
            const color = new THREE.Color(Math.random(), Math.random(), Math.random()); // Random color for the cloth

            this.material = new THREE.MeshStandardMaterial({
                color: color,
                side: THREE.DoubleSide,
                metalness: 0.3,
                roughness: 0.7,
            });

            this.mesh = new THREE.Mesh(this.geometry, this.material);
            this.mesh.castShadow = simulationParams.showShadows;
            this.mesh.receiveShadow = simulationParams.showShadows;
            this.mesh.position.copy(this.position);
            scene.add(this.mesh);

            this.initParticles(); // Initialize particles
            this.initConstraints(); // Initialize constraints
            this.setupInteraction(); // Set up interactions
        }

        // Set up interaction for the cloth mesh
        setupInteraction() {
            // Store type and color in userData for later reference
            this.mesh.userData.type = simulationParams.selectedClothType;
            this.mesh.userData.color = this.material.color.getHexString();
        }

        // Show information about the cloth when clicked
        showInfo() {
            const infoDiv = document.createElement('div'); // Create a new div element
            infoDiv.style.position = 'absolute';
            infoDiv.style.pointerEvents = 'auto'; // Allow pointer events
            infoDiv.style.zIndex = '1000'; // Set z-index to be on top
            infoDiv.style.transition = 'opacity 0.3s ease'; // Add transition effect for opacity
            infoDiv.style.opacity = '1'; // Set initial opacity to 1 for visibility

            // Get cloth parameters
            const type = this.mesh.userData.type;
            const params = simulationParams.clothTypes[type];

            // Set the inner HTML with the updated structure
            infoDiv.innerHTML = `
        <div class="cloth-info-card">
            <div class="cloth-info-header">
                <h3>Cloth Information</h3>
                <button class="close-button">&times;</button>
            </div>
            <div class="cloth-info-content">
                <div class="cloth-info-item">
                    <span class="cloth-info-label">Type</span>
                    <span class="cloth-info-value">${type}</span>
                </div>
                <div class="cloth-info-item">
                    <span class="cloth-info-label">Color</span>
                    <span class="cloth-info-value color-box" style="background-color: #${this.mesh.userData.color};"></span>
                </div>
                <div class="cloth-info-item">
                    <span class="cloth-info-label">Mass</span>
                    <span class="cloth-info-value">${params.mass}</span>
                </div>
                <div class="cloth-info-item">
                    <span class="cloth-info-label">Stiffness</span>
                    <span class="cloth-info-value">${params.stiffness}</span>
                </div>
                <div class="cloth-info-item">
                    <span class="cloth-info-label">Wind Resistance</span>
                    <span class="cloth-info-value">${params.windResistance}</span>
                </div>
                <div class="cloth-info-item">
                    <span class="cloth-info-label">Water Absorption</span>
                    <span class="cloth-info-value">${params.waterAbsorption}</span>
                </div>
            </div>
        </div>
    `;

            // Add custom styles for the info card
            const style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = `
        .cloth-info-card {
            --card-bg-color: #fff;
            --card-text-color: #333;
            --card-border-radius: 12px;
            --card-padding: 20px;
            --card-max-width: 320px;
            --card-box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
            --header-font-size: 22px;
            --label-font-weight: 600;
            --value-font-weight: 400;
            --label-color: #555;
            --value-color: #777;
            --close-button-size: 24px;
            --close-button-color: #aaa;
            --close-button-hover-color: #555;
            --transition-duration: 0.3s;

            background-color: var(--card-bg-color);
            color: var(--card-text-color);
            border-radius: var(--card-border-radius);
            padding: var(--card-padding);
            max-width: var(--card-max-width);
            box-shadow: var(--card-box-shadow);
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            position: relative;
        }

        .cloth-info-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .cloth-info-header h3 {
            margin: 0;
            font-size: var(--header-font-size);
        }

        .close-button {
            background: none;
            border: none;
            font-size: var(--close-button-size);
            color: var(--close-button-color);
            cursor: pointer;
            transition: color var(--transition-duration);
            outline: none;
        }

        .close-button:hover {
            color: var(--close-button-hover-color);
        }

        .cloth-info-content {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .cloth-info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .cloth-info-label {
            font-weight: var(--label-font-weight);
            color: var(--label-color);
        }

        .cloth-info-value {
            font-weight: var(--value-font-weight);
            color: var(--value-color);
            text-align: right;
        }

        .color-box {
            width: 24px;
            height: 24px;
            border-radius: 4px;
            border: 1px solid #ccc;
        }
    `;
            document.head.appendChild(style); // Append the style to the document head

            // Position the info div near the cloth
            const vector = new THREE.Vector3(); // Create a new vector to store the position of the cloth
            this.mesh.getWorldPosition(vector); // Get the world position of the cloth
            vector.project(camera); // Project the 3D position to 2D screen space

            const x = (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth + renderer.domElement.offsetLeft; // Convert to screen coordinates 
            const y = (-vector.y * 0.5 + 0.5) * renderer.domElement.clientHeight + renderer.domElement.offsetTop;

            infoDiv.style.left = `${x}px`; // Set the left position
            infoDiv.style.top = `${y}px`; // Set the top position
            infoDiv.style.transform = 'translate(-50%, -120%)'; // Adjust position to be above the cloth

            document.body.appendChild(infoDiv); // Append the info div to the document body

            // Add event listener to close infoDiv when clicking the close button
            const closeButton = infoDiv.querySelector('.close-button'); // Get the close button element from the info div
            closeButton.addEventListener('click', () => { // Add click event listener
                infoDiv.style.opacity = '0'; // Set opacity to 0 for fade out effect 
                setTimeout(() => { // Set timeout to remove the info div from the DOM
                    if (infoDiv.parentElement) {
                        document.body.removeChild(infoDiv);
                    }
                }, 300); // Set timeout to 300ms
            });

            // Optional: Close the infoDiv when clicking outside of it
            setTimeout(() => {
                window.addEventListener('click', onOutsideClick); // Add event listener to window for outside click
            }, 0);

            function onOutsideClick(event) { // Function to handle outside click
                if (!infoDiv.contains(event.target)) { // Check if the click is outside the infoDiv
                    infoDiv.style.opacity = '0'; // Set opacity to 0 for fade out effect
                    setTimeout(() => { // Set timeout to remove the info div from the DOM
                        if (infoDiv.parentElement) { // Check if the info div is still in the DOM
                            document.body.removeChild(infoDiv); // Remove the info div
                        }
                    }, 300); // Set timeout to 300ms
                    window.removeEventListener('click', onOutsideClick); // Remove the event listener
                }
            }
        }

        // Parametric function defining the cloth's initial geometry
        clothFunction(u, v, target) {
            const x = (u - 0.5) * this.width; // Center the cloth along X
            const y = v * this.height; // Y varies from 0 to height
            const z = 0; // Cloth is flat along Z 
            target.set(x, y, z); // Set the target vector to the calculated position
        }

        // Initialize particles representing the cloth's mass points
        initParticles() {
            for (let y = 0; y <= this.segmentsY; y++) { // Iterate over Y segments 
                for (let x = 0; x <= this.segmentsX; x++) { // Iterate over X segments 
                    const u = x / this.segmentsX; // Calculate U parameter for the cloth function
                    const v = y / this.segmentsY; // Calculate V parameter for the cloth function
                    const pos = new THREE.Vector3(); // Create a new vector for the position
                    this.clothFunction(u, v, pos); // Calculate the position using the cloth function
                    pos.add(this.position); // Add the cloth's position to the calculated position

                    const particle = { // Create a new particle object
                        position: pos.clone(), // Position of the particle
                        previous: pos.clone(), // Previous position of the particle
                        original: pos.clone(), // Original position of the particle
                        velocity: new THREE.Vector3(0, 0, 0), // Initial velocity of the particle 
                        acceleration: new THREE.Vector3(0, 0, 0), // Initial acceleration of the particle
                        mass: this.materialParams.mass, // Mass of the particle 
                        pinned: (y === this.segmentsY && (x === 0 || x === this.segmentsX)), // Pin the top corners of the cloth
                    };
                    this.particles.push(particle); // Add the particle to the particles array
                }
            }
        }

        // Initialize structural and diagonal constraints between particles
        initConstraints() {
            const structural = [
                [1, 0], [0, 1],
                [-1, 0], [0, -1]
            ];

            const diagonal = [
                [1, 1], [1, -1],
                [-1, 1], [-1, -1]
            ];

            for (let y = 0; y <= this.segmentsY; y++) { // Iterate over Y segments
                for (let x = 0; x <= this.segmentsX; x++) { // Iterate over X segments
                    for (const [dx, dy] of structural) { // Iterate over structural constraints
                        const a = y * (this.segmentsX + 1) + x; // Calculate index of the first particle
                        const b = (y + dy) * (this.segmentsX + 1) + (x + dx); // Calculate index of the second particle
                        if (b >= 0 && b < this.particles.length) { // Check if the second particle is valid
                            this.constraints.push([a, b, this.width / this.segmentsX]); // Add a structural constraint
                        }
                    }
                    for (const [dx, dy] of diagonal) { // Iterate over diagonal constraints
                        const a = y * (this.segmentsX + 1) + x; // Calculate index of the first particle
                        const b = (y + dy) * (this.segmentsX + 1) + (x + dx); // Calculate index of the second particle
                        if (b >= 0 && b < this.particles.length) { // Check if the second particle is valid
                            this.constraints.push([a, b, Math.sqrt(2) * this.width / this.segmentsX]); // Add a diagonal constraint
                        }
                    }
                }
            }
        }

        // Simulate the cloth physics for one time step
        simulate(windForce, rainForce, deltaTime) { // Wind force, rain force, time step duration
            const type = this.mesh.userData.type; // Get the cloth type from the mesh userData
            const params = simulationParams.clothTypes[type]; // Get the cloth parameters based on the type 

            // Apply forces with material-specific modifications
            const gravity = new THREE.Vector3(0, simulationParams.gravity, 0); // Gravity force
            const adjustedWind = windForce.clone().multiplyScalar(params.windResistance); // Adjust wind force based on wind resistance 
            const adjustedRain = rainForce.clone().multiplyScalar(params.waterAbsorption); // Adjust rain force based on water absorption

            // Apply forces to particles
            for (const p of this.particles) { // Iterate over particles in the cloth
                // Apply base forces
                p.acceleration.add(gravity); // Apply gravity

                // Apply wind with turbulence
                const turbulence = new THREE.Vector3( // Random turbulence effect for wind
                    (Math.random() - 0.5) * 20,  // Random X turbulence
                    (Math.random() - 0.5) * 20, // Random Y turbulence
                    (Math.random() - 0.5) * 20  // Random Z turbulence
                );
                p.acceleration.add(adjustedWind.clone().add(turbulence)); // Apply wind effect with turbulence

                // Apply rain effect
                p.acceleration.add(adjustedRain);

                // Add slight oscillation for more natural movement
                const time = performance.now() * 0.001; // Get current time in seconds
                const oscillation = Math.sin(time + p.position.x) * 0.1; // Sine oscillation effect
                p.acceleration.add(new THREE.Vector3(0, oscillation, 0)); // Apply oscillation effect 
            }

            // Integrate using Verlet Integration
            for (const p of this.particles) { // Iterate over particles in the cloth
                if (p.pinned) continue; // Skip pinned particles

                const velocity = p.position.clone().sub(p.previous).multiplyScalar(this.materialParams.damping); // Calculate velocity with damping factor
                const newPos = p.position.clone().add(velocity).add(p.acceleration.clone().multiplyScalar(deltaTime ** 2)); // Calculate new position using Verlet Integration
                p.previous.copy(p.position); // Update previous position to current position 
                p.position.copy(newPos); // Update current position to new position
                p.acceleration.set(0, 0, 0); // Reset acceleration for next iteration 
            }

            // Satisfy constraints
            for (let i = 0; i < 5; i++) { // Iterate multiple times for better stability
                for (const [a, b, distance] of this.constraints) { // Iterate over constraints 
                    const pa = this.particles[a]; // Get the first particle of the constraint
                    const pb = this.particles[b]; // Get the second particle of the constraint

                    const delta = pb.position.clone().sub(pa.position); // Calculate the vector between particles 
                    const currentDist = delta.length(); // Calculate the current distance between particles
                    const correction = delta.multiplyScalar(1 - distance / currentDist); // Calculate the correction vector 
                    const correctionHalf = correction.multiplyScalar(0.5); // Calculate the half correction vector

                    if (!pa.pinned) { // Check if the first particle is not pinned
                        pa.position.add(correctionHalf); // Move the first particle by half the correction vector 
                    }
                    if (!pb.pinned) { // Check if the second particle is not pinned
                        pb.position.sub(correctionHalf); // Move the second particle by half the correction vector
                    }
                }
            }

            // Update geometry positions
            const positions = this.geometry.attributes.position.array; // Get the position attribute array 
            for (let i = 0; i < this.particles.length; i++) { // Iterate over particles in the cloth 
                positions[i * 3] = this.particles[i].position.x; // Update X position in the attribute array
                positions[i * 3 + 1] = this.particles[i].position.y; // Update Y position in the attribute array
                positions[i * 3 + 2] = this.particles[i].position.z; // Update Z position in the attribute array
            }
            this.geometry.attributes.position.needsUpdate = true; // Mark the position attribute as needing update
            this.geometry.computeVertexNormals(); // Recalculate vertex normals for smooth shading
        }

        // Update material properties if needed
        updateMaterial() { // Update material properties based on simulation parameters
            this.material.envMap = simulationParams.environmentMap ? envMap : null; // Set environment map based on simulation parameter
            this.material.needsUpdate = true; // Mark the material as needing update
        }

        // Dispose of the cloth and clean up resources
        dispose() { // Dispose of the cloth and clean up resources 
            scene.remove(this.mesh); // Remove the cloth mesh from the scene 
            this.geometry.dispose(); // Dispose of the geometry
            this.material.dispose(); // Dispose of the material
        }
    }

    // ----- External Forces -----
    let windForce = new THREE.Vector3(1, 0, 0); // Initial wind direction
    let rainForce = new THREE.Vector3(0, -simulationParams.rainIntensity, 0); // Initial rain force

    // Wind update functions
    function updateWindStrength() { // Update wind strength based on simulation parameters 
        windForce.set( // Set wind force based on wind strength and direction 
            simulationParams.windStrength * simulationParams.windDirection.x,
            simulationParams.windStrength * simulationParams.windDirection.y,
            simulationParams.windStrength * simulationParams.windDirection.z
        );
    }

    function updateWindDirection() { // Update wind direction based on simulation parameters
        updateWindStrength(); // Update wind strength based on new direction
    }

    // ----- GUI Controls -----
    const gui = new dat.GUI({ autoPlace: false }); // Create a new GUI instance with custom placement 
    document.getElementById('gui-container').appendChild(gui.domElement); // Append the GUI to the container

    // Cloth controls
    const clothFolder = gui.addFolder('Cloth Controls'); // Create a new folder for cloth controls
    clothFolder.add(simulationParams, 'addCloth').name('Add Cloth'); // Add button to add a new cloth
    clothFolder.add(simulationParams, 'removeCloth').name('Remove Cloth'); // Add button to remove a cloth
    clothFolder.add(simulationParams, 'selectedClothType', Object.keys(simulationParams.clothTypes)).name('Cloth Type'); // Select cloth type
    clothFolder.open(); // Open the cloth folder by default

    // Physics controls
    const physicsFolder = gui.addFolder('Physics'); // Create a new folder for physics controls
    physicsFolder.add(simulationParams, 'gravity', -20, 20).name('Gravity').onChange(() => {
        // Update rain force when gravity changes
        rainForce.set(0, -simulationParams.rainIntensity, 0);
    });
    physicsFolder.add(simulationParams, 'windStrength', 0, 20).name('Wind Strength').onChange(updateWindStrength); // Wind strength control

    // Wind Direction Controls
    const windDirFolder = physicsFolder.addFolder('Wind Direction'); // Create a new folder for wind direction
    windDirFolder.add(simulationParams.windDirection, 'x', -10, 10).name('Wind X').onChange(updateWindDirection); // Wind X control
    windDirFolder.add(simulationParams.windDirection, 'y', -10, 10).name('Wind Y').onChange(updateWindDirection); // Wind Y control
    windDirFolder.add(simulationParams.windDirection, 'z', -10, 10).name('Wind Z').onChange(updateWindDirection); // Wind Z control
    windDirFolder.open();

    physicsFolder.add(simulationParams, 'rainIntensity', 0, 20).name('Rain Intensity').onChange(updateRainIntensity); // Rain intensity control 
    physicsFolder.open(); // Open the physics folder by default

    const renderFolder = gui.addFolder('Rendering'); // Create a new folder for rendering controls 
    renderFolder.add(simulationParams, 'showShadows').name('Show Shadows').onChange((value) => { // Shadow control 
        renderer.shadowMap.enabled = value; // Enable or disable shadows based on the value 
        directionalLight.castShadow = value; // Enable or disable shadow casting for the light 
        ground.receiveShadow = value; // Enable or disable shadow receiving for the ground 
        rod.traverse(child => { // Traverse the rod children to enable shadows 
            if (child.isMesh) { // Check if the child is a mesh 
                child.castShadow = value; // Enable or disable shadow casting for the child
                child.receiveShadow = value; // Enable or disable shadow receiving for the child
            }
        });
        cloths.forEach(cloth => { // Iterate over cloths to enable shadows
            cloth.mesh.castShadow = value; // Enable or disable shadow casting for the cloth
            cloth.mesh.receiveShadow = value; // Enable or disable shadow receiving for the cloth
        });
    });
    renderFolder.add(simulationParams, 'environmentMap').name('Environment Map').onChange((value) => { // Environment map control 
        scene.environment = value ? envMap : null; // Set the environment map based on the value 
        scene.background = value ? envMap : new THREE.Color(0x87ceeb); // Set the background based on the value
        cloths.forEach(cloth => cloth.updateMaterial()); // Update cloth materials
    });
    renderFolder.open(); // Open the rendering folder by default 

    // ----- Cloth Management Functions -----
    function addNewCloth() { // Function to add a new cloth
        console.log("Add Cloth Called"); // Log a message to the console

        // Calculate the maximum number of cloths based on rod length and spacing
        const rodLength = 40; // Length from the rod creation function
        const spacing = 2; // Spacing between cloths
        const clothWidth = 5; // Width of the cloth
        const maxCloths = Math.floor(rodLength / clothWidth) + spacing + 1; // Maximum number of cloths

        // Check if we've reached the maximum number of cloths
        if (cloths.length >= maxCloths) {
            // Create and show alert using a modal or alert dialog
            showAlert("Exhausted space on the clothesline");
            return; // Exit the function without adding a new cloth
        }

        // Get the selected cloth type and its parameters
        const type = simulationParams.selectedClothType;
        const params = simulationParams.clothTypes[type];

        // Create a new Cloth instance
        const cloth = new Cloth(
            5,  // Width of the cloth
            5,  // Height of the cloth
            20, // Number of segments along X
            20, // Number of segments along Y
            params,
            new THREE.Vector3(-20, 0, 0) // Initial position
        );

        // Calculate the starting position for the first cloth
        const startX = 0; // Slight offset from the left pole

        // Position each cloth with proper spacing
        const positionX = startX + (cloths.length * spacing);

        // Update cloth position
        cloth.mesh.position.x = positionX;
        cloth.mesh.position.y = 0;
        cloth.mesh.position.z = 0;

        // Adjust the cloth's pinned particles to match the rod's position
        cloth.particles.forEach((particle, idx) => {
            if (particle.pinned) {
                particle.position.y = 15; // Align pinned particles with rod height
                particle.previous.y = 15;
                // Update X position for pinned particles to match the cloth position
                particle.position.x += positionX;
                particle.previous.x += positionX;
            }
        });

        cloths.push(cloth);
    }

    function removeCloth() {
        const cloth = cloths.pop(); // Remove the last cloth from the array
        if (cloth) {
            cloth.dispose(); // Dispose of the cloth and clean up resources
        }
    }

    // Function to show alert message
    function showAlert(message) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

        // Create modal container
        const modal = document.createElement('div');
        modal.style.cssText = `
        background: #fff;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
        text-align: center;
        position: relative;
        transform: translateY(-50px);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #333;
    `;

        // Add message
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
        font-size: 18px;
        margin-bottom: 20px;
    `;
        messageDiv.textContent = message;

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'OK';
        closeButton.style.cssText = `
        padding: 10px 20px;
        border: none;
        border-radius: 25px;
        background: #007bff;
        color: white;
        cursor: pointer;
        font-size: 16px;
        transition: background 0.3s ease;
    `;
        closeButton.onclick = () => {
            overlay.style.opacity = '0';
            modal.style.transform = 'translateY(-50px)';
            modal.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentElement) {
                    document.body.removeChild(overlay);
                }
            }, 300);
        };
        closeButton.onmouseover = () => {
            closeButton.style.background = '#0056b3';
        };
        closeButton.onmouseout = () => {
            closeButton.style.background = '#007bff';
        };

        // Append elements
        modal.appendChild(messageDiv);
        modal.appendChild(closeButton);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Trigger animations
        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'translateY(0)';
            modal.style.opacity = '1';
        }, 10);

        // Close modal when clicking outside
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) { // Check if the click is on the overlay itself (not the modal)
                closeButton.onclick(); // Trigger the close button click event
            }
        });
    }

    // ----- Animation Loop -----
    const stats = new Stats(); // Performance monitor
    document.body.appendChild(stats.dom); // Add the stats monitor to the DOM

    let lastTime = performance.now(); // Initialize lastTime with the current time

    // Rain Particle System Setup
    const rainGeometry = new THREE.BufferGeometry(); // Create a new buffer geometry for rain particles
    const rainCount = 50000; // Number of rain particles
    const rainPositions = []; // Array to store rain positions
    const rainVelocities = []; // Array to store rain velocities

    for (let i = 0; i < rainCount; i++) { // Loop to create rain particles 
        rainPositions.push( // Add random positions for rain particles
            (Math.random() - 0.5) * 100, // Random X position 
            Math.random() * 30 + 15,     // Random Y position
            (Math.random() - 0.5) * 100 // Random Z position
        );
        rainVelocities.push(0, -Math.random() * 0.2, 0); // Y velocity for rain particles 
    }

    rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3)); // Set rain positions attribute 
    rainGeometry.setAttribute('velocity', new THREE.Float32BufferAttribute(rainVelocities, 3)); // Set rain velocities attribute 

    const rainMaterial = new THREE.PointsMaterial({ // Create rain material 
        color: 0xaaaaaa,
        size: 0.05,
        transparent: true,
        opacity: 0.5
    });

    const rain = new THREE.Points(rainGeometry, rainMaterial); // Create rain particle system 
    rain.castShadow = false;
    rain.receiveShadow = false;
    scene.add(rain); // Add rain particle system to the scene 

    // Function to update rain particles
    function updateRain(deltaTime) { // Update rain particles based on time step 
        const positions = rain.geometry.attributes.position.array; // Get rain positions array 
        const velocities = rain.geometry.attributes.velocity.array; // Get rain velocities array 

        for (let i = 0; i < rainCount; i++) {
            velocities[i * 3 + 1] += simulationParams.gravity * deltaTime * 0.1; // gravity effect on rain
            positions[i * 3] += velocities[i * 3] * deltaTime; // Update X position
            positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime; // Update Y position
            positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime; // Update Z position

            // Reset rain position if it goes below ground
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3] = (Math.random() - 0.5) * 100; // Random X position 
                positions[i * 3 + 1] = Math.random() * 30 + 15; // Random Y position
                positions[i * 3 + 2] = (Math.random() - 0.5) * 100; // Random Z position 
                velocities[i * 3 + 1] = -Math.random() * 0.2; // Random Y velocity 
            }
        }

        rain.geometry.attributes.position.needsUpdate = true; // Mark rain positions as needing update 
    }

    // Main animation loop
    function animate() {
        requestAnimationFrame(animate); // Request the next frame 

        const currentTime = performance.now(); // Get the current time 
        const deltaTime = (currentTime - lastTime) / 1000 * 3; // Calculate time difference and scale by 3 for speed 
        lastTime = currentTime; // Update lastTime to current time 

        // Simulate wind
        windForce.set(
            simulationParams.windStrength * simulationParams.windDirection.x,
            simulationParams.windStrength * simulationParams.windDirection.y,
            simulationParams.windStrength * simulationParams.windDirection.z
        );

        // Update rain force based on intensity
        rainForce.set(0, -simulationParams.rainIntensity, 0);

        // Simulate each cloth
        cloths.forEach(cloth => {
            cloth.simulate(windForce, rainForce, deltaTime);
        });

        // Update rain particle system
        updateRain(deltaTime);

        // Update controls
        controls.update();

        // Render scene
        renderer.render(scene, camera);
        stats.update(); // Update performance monitor 
    }

    animate(); // Start the animation loop 

    // ----- Raycaster for cloth interaction -----
    const raycaster = new THREE.Raycaster(); // Create a raycaster 
    const mouse = new THREE.Vector2(); // Create a vector to store mouse coordinates

    renderer.domElement.addEventListener('click', onMouseClick, false); // Add click event listener to the renderer 

    function onMouseClick(event) { // Function to handle mouse click events
        event.preventDefault(); // Prevent default action 

        // Calculate mouse position in normalized device coordinates (-1 to +1)
        mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = - (event.clientY / renderer.domElement.clientHeight) * 2 + 1;

        // Update the raycaster with the mouse position and camera
        raycaster.setFromCamera(mouse, camera);

        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(scene.children, true);

        // Loop through the intersects and find cloth meshes
        for (let i = 0; i < intersects.length; i++) {
            const intersectedObject = intersects[i].object;

            // Check if the intersected object is a cloth mesh
            const cloth = cloths.find(c => c.mesh === intersectedObject || c.mesh === intersectedObject.parent);

            if (cloth) {
                cloth.showInfo(); // Show information about the cloth 
                break; // Stop after the first cloth is found
            }
        }
    }

    // Handle window resize
    window.addEventListener('resize', () => { // Event listener for window resize 
        camera.aspect = window.innerWidth / window.innerHeight; // Update camera aspect ratio
        camera.updateProjectionMatrix(); // Update camera projection matrix
        renderer.setSize(window.innerWidth, window.innerHeight); // Resize renderer
    });

    // Function to update rain intensity
    function updateRainIntensity() { // Update rain intensity based on simulation parameters
        rain.material.opacity = THREE.MathUtils.clamp(simulationParams.rainIntensity / 20, 0, 1); // Update rain opacity 
        rainForce.set(0, -simulationParams.rainIntensity, 0); // Update rain force based on intensity ƒ
    }

});