import * as THREE from 'three';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 700px)').matches;
const shouldUseHeavy3D = !isMobile && !reduceMotion;


/* ============================================================
   FLOATING TRIANGLE SPACE BACKGROUND
   ============================================================ */

const spatialCanvas = document.getElementById('spatial-canvas');
const spatialCtx = spatialCanvas.getContext('2d');
let triangles = [];
let triangleMouseX = window.innerWidth / 2;
let triangleMouseY = window.innerHeight / 2;
let targetMouseX = window.innerWidth / 2;
let targetMouseY = window.innerHeight / 2;
let scrollPosition = 0;
let previousScroll = 0;

function resizeSpatialCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    spatialCanvas.width = window.innerWidth * dpr;
    spatialCanvas.height = window.innerHeight * dpr;
    spatialCanvas.style.width = window.innerWidth + 'px';
    spatialCanvas.style.height = window.innerHeight + 'px';
    spatialCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createTriangles();
}

function createTriangles() {
    triangles = [];
    // Fewer triangles on mobile to save battery/CPU
    const maxCount = isMobile ? 40 : 90;
    const amount = Math.min(
        Math.max(Math.floor((window.innerWidth * window.innerHeight) / 18000), 20),
        maxCount
    );
    for (let i = 0; i < amount; i++) {
        const size = Math.random() * 28 + 8;
        triangles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size,
            speedX: (Math.random() - 0.5) * 0.22,
            speedY: Math.random() * 0.28 + 0.03,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.004,
            opacity: Math.random() * 0.22 + 0.06,
            mouseStrength: Math.random() * 0.8 + 0.4,
            depth: Math.random() * 1.5 + 0.5,
            shape: Math.random() * 0.25 + 0.9
        });
    }
}

// Only track mouse on non-touch devices
if (!isMobile) {
    window.addEventListener('mousemove', (event) => {
        targetMouseX = event.clientX;
        targetMouseY = event.clientY;
    });
}

window.addEventListener('scroll', () => {
    scrollPosition = window.scrollY;
}, { passive: true });

function drawTriangle(triangle) {
    if (!isMobile) {
        // Smooth lerp toward mouse position
        triangleMouseX += (targetMouseX - triangleMouseX) * 0.05;
        triangleMouseY += (targetMouseY - triangleMouseY) * 0.05;
        const dx = triangle.x - triangleMouseX;
        const dy = triangle.y - triangleMouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 220) {
            const force = (220 - distance) / 220;
            triangle.x += (dx / (distance || 1)) * force * 0.18 * triangle.mouseStrength;
            triangle.y += (dy / (distance || 1)) * force * 0.18 * triangle.mouseStrength;
        }
    }

    const scrollOffset = (scrollPosition - previousScroll) * 0.08 * triangle.depth;
    triangle.y -= scrollOffset;

    spatialCtx.save();
    spatialCtx.translate(triangle.x, triangle.y);
    spatialCtx.rotate(triangle.rotation);
    spatialCtx.beginPath();
    spatialCtx.moveTo(0, -triangle.size / 2);
    spatialCtx.lineTo(triangle.size / 2 * triangle.shape, triangle.size / 2);
    spatialCtx.lineTo(-triangle.size / 2, triangle.size / 2);
    spatialCtx.closePath();
    spatialCtx.strokeStyle = `rgba(107, 176, 140, ${triangle.opacity})`;
    spatialCtx.lineWidth = 1;
    spatialCtx.stroke();
    spatialCtx.restore();
}

function drawAllTriangles() {
    spatialCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const triangle of triangles) {
        drawTriangle(triangle);
    }
}

function animateTriangles() {
    spatialCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const triangle of triangles) {
        triangle.x += triangle.speedX;
        triangle.y += triangle.speedY;
        triangle.rotation += triangle.rotationSpeed;

        if (triangle.y > window.innerHeight + triangle.size) {
            triangle.y = -triangle.size;
            triangle.x = Math.random() * window.innerWidth;
        }
        if (triangle.x > window.innerWidth + triangle.size) triangle.x = -triangle.size;
        if (triangle.x < -triangle.size) triangle.x = window.innerWidth + triangle.size;

        drawTriangle(triangle);
    }
    previousScroll = scrollPosition;
    requestAnimationFrame(animateTriangles);
}

resizeSpatialCanvas();
if (reduceMotion) {
    drawAllTriangles();
} else {
    animateTriangles();
}

let resizeTimer;
window.addEventListener('resize', () => {
    // Debounce resize to avoid thrashing on mobile orientation change
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        resizeSpatialCanvas();
        if (reduceMotion) drawAllTriangles();
    }, 150);
});


/* ============================================================
   HERO THREE.JS SCENE
   ============================================================ */

const scene = new THREE.Scene();
const modelContainer = document.getElementById('app');

if (modelContainer && !shouldUseHeavy3D) {
    modelContainer.style.opacity = '0.2';
}

const camera = new THREE.PerspectiveCamera(75, modelContainer.clientWidth / modelContainer.clientHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    alpha: true,
    powerPreference: 'low-power'
});
renderer.setSize(modelContainer.clientWidth, modelContainer.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
modelContainer.appendChild(renderer.domElement);

let mouseX = 0;
let mouseY = 0;
let lastMouseMoveTime = Date.now();

if (!isMobile) {
    window.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = (event.clientY / window.innerHeight) * 2 - 1;
        lastMouseMoveTime = Date.now();
    });
}

function buildShadowEntity() {
    const group = new THREE.Group();
    group.name = 'shadowFigure';

    const geometry = new THREE.IcosahedronGeometry(1.35, 1);
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i);
        const offset = 1 + (Math.random() - 0.5) * 0.22;
        vertex.multiplyScalar(offset);
        position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: 0x1c2027,
        emissive: 0x0e2a20,
        emissiveIntensity: 0.35,
        flatShading: true,
        roughness: 0.55,
        metalness: 0.2
    });

    const core = new THREE.Mesh(geometry, material);
    const edges = new THREE.EdgesGeometry(geometry, 12);
    const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
        color: 0x6bb08c,
        transparent: true,
        opacity: 0.55
    }));

    // Fewer particles on mobile
    const particleCount = isMobile ? 40 : 90;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const r = 0.6 + Math.random() * 0.9;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        particlePositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
        color: 0xffd166,
        size: 0.03,
        transparent: true,
        opacity: 0.7
    }));

    group.add(core, wireframe, particles);
    return group;
}

const shadowFigure = buildShadowEntity();
shadowFigure.scale.set(1.3, 1.3, 1.3);
scene.add(shadowFigure);

function animateHeroFrame() {
    const figure = scene.getObjectByName('shadowFigure');
    if (figure) {
        const idleThreshold = 1000;
        const timeSinceMove = Date.now() - lastMouseMoveTime;
        if (!reduceMotion && timeSinceMove < idleThreshold && !isMobile) {
            const targetRotationY = mouseX * 0.6;
            figure.rotation.y += (targetRotationY - figure.rotation.y) * 0.05;
        } else if (!reduceMotion) {
            figure.rotation.y += 0.0015;
        }
        figure.rotation.x += (0 - figure.rotation.x) * 0.05;
        figure.rotation.z += (0 - figure.rotation.z) * 0.05;
    }
    renderer.render(scene, camera);
}

function animate() {
    requestAnimationFrame(animate);
    animateHeroFrame();
}

if (reduceMotion || !shouldUseHeavy3D) {
    animateHeroFrame();
} else {
    animate();
}

const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(2, 3, 4);
scene.add(directionalLight);
const rimLight = new THREE.PointLight(0x5b7cff, 3, 12);
rimLight.position.set(-2, 2, -3);
scene.add(rimLight);

window.addEventListener('resize', () => {
    camera.aspect = modelContainer.clientWidth / modelContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(modelContainer.clientWidth, modelContainer.clientHeight);
    if (reduceMotion) animateHeroFrame();
});


/* ============================================================
   LOADING SCREEN
   ============================================================ */

const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

function runLoadingSequence() {
    if (reduceMotion) {
        loadingOverlay.style.display = 'none';
        return;
    }
    const duration = 650;
    const start = performance.now();
    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        loadingText.textContent = `Loading ${Math.round(progress * 100)}%`;
        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);
        }
    }
    requestAnimationFrame(step);
}
runLoadingSequence();


/* ============================================================
   SCROLL REVEAL & GROUND
   ============================================================ */

const groundGeometry = new THREE.PlaneGeometry(300, 300);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x0c0c12 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.9;
scene.add(ground);
scene.fog = new THREE.Fog(0x08080c, 3, 16);

const revealSections = document.querySelectorAll('section:not(.hero)');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 }); // Lower threshold so sections appear earlier on mobile

revealSections.forEach((section) => revealObserver.observe(section));

const heroSection = document.getElementById('home');
let ticking = false;
const baseModelOpacity = isMobile ? 0.3 : 1;

function updateModelOnScroll() {
    const heroHeight = heroSection.offsetHeight;
    const progress = Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
    modelContainer.style.opacity = baseModelOpacity * (1 - progress);
    modelContainer.style.transform = `scale(${1 + progress * 0.15}) translateY(${progress * -40}px)`;

    const figure = scene.getObjectByName('shadowFigure');
    if (figure) {
        figure.position.x = progress * 2.5;
        figure.position.y = progress * -0.6;
    }
    if (reduceMotion) animateHeroFrame();
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(() => {
            updateModelOnScroll();
            ticking = false;
        });
        ticking = true;
    }
}, { passive: true });
updateModelOnScroll();


/* ============================================================
   3D TECH CORE — ABOUT (Lazy-loaded via IntersectionObserver)
   ============================================================ */

const coreContainer = document.getElementById('tech-core-app');
let coreInitialised = false;

if (coreContainer) {
    const coreObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !coreInitialised) {
                coreInitialised = true;
                initAboutCore();
                coreObserver.disconnect();
            }
        });
    }, { threshold: 0.1 });

    coreObserver.observe(coreContainer);
}

function initAboutCore() {
    const coreScene = new THREE.Scene();
    const coreCamera = new THREE.PerspectiveCamera(45, coreContainer.clientWidth / coreContainer.clientHeight, 0.1, 1000);
    coreCamera.position.set(0, 0, 7);

    const coreRenderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        alpha: true,
        powerPreference: 'low-power'
    });
    coreRenderer.setSize(coreContainer.clientWidth, coreContainer.clientHeight);
    coreRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    coreContainer.appendChild(coreRenderer.domElement);

    coreScene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pointLight1 = new THREE.PointLight(0x6bb08c, 4, 15);
    pointLight1.position.set(3, 3, 3);
    coreScene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x5b7cff, 4, 15);
    pointLight2.position.set(-3, -3, 3);
    coreScene.add(pointLight2);

    const coreGroup = new THREE.Group();
    coreScene.add(coreGroup);

    const crystalGeo = new THREE.IcosahedronGeometry(1, 1);
    const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x0b0d12, emissive: 0x1a2b22, emissiveIntensity: 0.5,
        roughness: 0.2, metalness: 0.8, flatShading: true
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    coreGroup.add(crystal);

    const wireMat = new THREE.LineBasicMaterial({ color: 0x6bb08c, transparent: true, opacity: 0.4 });
    const wireframe = new THREE.LineSegments(new THREE.EdgesGeometry(crystalGeo), wireMat);
    crystal.add(wireframe);

    const ringMat = new THREE.MeshStandardMaterial({ color: 0x5b7cff, metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide });
    const accentRingMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 1.0, roughness: 0.1, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.015, 16, 100), ringMat);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.02, 16, 100), accentRingMat);
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.01, 16, 100), wireMat);
    ring1.rotation.x = Math.PI / 2.5;
    ring2.rotation.y = Math.PI / 3;
    ring3.rotation.x = Math.PI / 1.5;
    coreGroup.add(ring1, ring2, ring3);

    // Fewer particles on mobile
    const particleCount = isMobile ? 30 : 60;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const r = 1.2 + Math.random() * 1.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        particlePos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        particlePos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        particlePos[i * 3 + 2] = r * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
        color: 0xffd166, size: 0.04, transparent: true, opacity: 0.8
    }));
    coreGroup.add(particles);

    let coreMouseX = 0;
    let coreMouseY = 0;
    if (!isMobile) {
        window.addEventListener('mousemove', (event) => {
            coreMouseX = (event.clientX / window.innerWidth) * 2 - 1;
            coreMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        });
    }

    const coreClock = new THREE.Clock();
    function renderCoreFrame(elapsedTime) {
        if (!reduceMotion) {
            coreGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.15;
            crystal.rotation.y = elapsedTime * 0.2;
            crystal.rotation.x = elapsedTime * 0.1;
            ring1.rotation.z = elapsedTime * 0.4;
            ring2.rotation.x = elapsedTime * 0.3;
            ring3.rotation.y = elapsedTime * 0.2;
            particles.rotation.y = elapsedTime * -0.15;
            particles.rotation.z = elapsedTime * 0.1;
            if (!isMobile) {
                const targetRotX = coreMouseY * 0.15;
                const targetRotZ = -coreMouseX * 0.15;
                coreGroup.rotation.x += (targetRotX - coreGroup.rotation.x) * 0.08;
                coreGroup.rotation.y += (targetRotZ - coreGroup.rotation.y) * 0.08;
            }
        }
        coreRenderer.render(coreScene, coreCamera);
    }

    function animateCore() {
        requestAnimationFrame(animateCore);
        renderCoreFrame(coreClock.getElapsedTime());
    }

    if (reduceMotion) {
        renderCoreFrame(0);
    } else {
        animateCore();
    }

    window.addEventListener('resize', () => {
        coreCamera.aspect = coreContainer.clientWidth / coreContainer.clientHeight;
        coreCamera.updateProjectionMatrix();
        coreRenderer.setSize(coreContainer.clientWidth, coreContainer.clientHeight);
        if (reduceMotion) renderCoreFrame(0);
    });
}


/* ============================================================
   CONTACT CONSOLE — COPY EMAIL
   ============================================================ */

document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
        const value = button.getAttribute('data-copy');
        const actionLabel = button.querySelector('.row-action');
        if (!actionLabel) return;
        const originalLabel = actionLabel.textContent;
        try {
            await navigator.clipboard.writeText(value);
            actionLabel.textContent = 'COPIED';
        } catch (error) {
            actionLabel.textContent = 'FAILED';
        }
        setTimeout(() => {
            actionLabel.textContent = originalLabel;
        }, 1600);
    });
});
