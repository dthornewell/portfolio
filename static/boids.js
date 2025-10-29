const buffer = 30;
const fps = 60;

class Vector {
    constructor(x = 0.0, y = 0.0) {
        this.x = x;
        this.y = y;
    }

    add(v) { this.x += v.x; this.y += v.y; }
    sub(v) { this.x -= v.x; this.y -= v.y; }
    mult(s) { this.x *= s; this.y *= s; }
    div(s) { if (s !== 0) { this.x /= s; this.y /= s; } }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    setMag(m) { const len = this.mag() || 0.0001; this.x = (this.x / len) * m; this.y = (this.y / len) * m; }
    limit(max) { const m = this.mag(); if (m > max) this.setMag(max); }
    heading() { return Math.atan2(this.y, this.x); }
    copy() { return new Vector(this.x, this.y); }

    static distance(a, b) { const dx = a.x - b.x; const dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
    static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
}

class Section {
    constructor(left, top, width, height) {
        this.left = left;
        this.top = top;
        this.right = left + width;
        this.bottom = top + height;
        this.particles = new Set();
    }

    addParticle(particle) { this.particles.add(particle); }
    removeParticle(particle) { this.particles.delete(particle); }
    exportParticles() { return [...this.particles]; }
}

class Boid {
    constructor(x, y, network) {
        this.network = network;
        this.pos = new Vector(x, y);
        // random initial velocity
        const v = network.options.velocity || 2;
        this.vel = new Vector((Math.random() - 0.5) * v, (Math.random() - 0.5) * v);
        this.acc = new Vector(0, 0);
        this.perception = network.options.perception || 100;
        this.maxSpeed = network.options.maxSpeed || (network.options.velocity || 4);
        this.maxForce = network.options.maxForce || 0.05;
        this.sepWeight = network.options.separationWeight || 1.5;
        this.alignWeight = network.options.alignmentWeight || 1.0;
        this.cohWeight = network.options.cohesionWeight || 1.0;
        this.color = network.options.particleColor || '#FFF';
    }

    applyForce(force) { this.acc.add(force); }

    flock(boids) {
        let total = 0;
        const steerSeparation = new Vector(0, 0);
        const steerAlignment = new Vector(0, 0);
        const steerCohesion = new Vector(0, 0);

        for (let other of boids) {
            if (other === this) continue;
            const d = Vector.distance(this.pos, other.pos);
            if (d < this.perception) {
                // separation: vector away inversely proportional to distance
                const diff = Vector.sub(this.pos, other.pos);
                diff.div(d || 1);
                steerSeparation.add(diff);

                // alignment: sum neighbor velocities
                steerAlignment.add(other.vel);

                // cohesion: sum neighbor positions
                steerCohesion.add(other.pos);

                total++;
            }
        }

        if (total > 0) {
            // Separation
            steerSeparation.div(total);
            if (steerSeparation.mag() > 0) {
                steerSeparation.setMag(this.maxSpeed);
                steerSeparation.sub(this.vel);
                steerSeparation.limit(this.maxForce);
            }

            // Alignment
            steerAlignment.div(total);
            steerAlignment.setMag(this.maxSpeed);
            steerAlignment.sub(this.vel);
            steerAlignment.limit(this.maxForce);

            // Cohesion
            steerCohesion.div(total);
            steerCohesion.sub(this.pos);
            steerCohesion.setMag(this.maxSpeed);
            steerCohesion.sub(this.vel);
            steerCohesion.limit(this.maxForce);

            // apply weighted forces
            steerSeparation.mult(this.sepWeight);
            steerAlignment.mult(this.alignWeight);
            steerCohesion.mult(this.cohWeight);

            this.applyForce(steerSeparation);
            this.applyForce(steerAlignment);
            this.applyForce(steerCohesion);
        }
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);

        const canvas = this.network.canvas;
        if (this.pos.x > canvas.width + buffer) this.pos.x = -buffer;
        if (this.pos.x < -buffer) this.pos.x = canvas.width + buffer;
        if (this.pos.y > canvas.height + buffer) this.pos.y = -buffer;
        if (this.pos.y < -buffer) this.pos.y = canvas.height + buffer;
    }

    draw(ctx) {
        const angle = this.vel.heading();
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(-3.5, -2);
        ctx.lineTo(4, 0);
        ctx.lineTo(-3.5, 2);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        // restore alpha on restore() below
        ctx.restore();
    }
}

class BoidNetwork {
    constructor(container, options = {}) {
        this.container = container;
        this.containerSize = { width: container.offsetWidth, height: container.offsetHeight };
        this.options = Object.assign({
            particleColor: '#FFFFFF',
            background: '#1a252f',
            interactive: true,
            velocity: 2,
            density: 4000,
            numBoids: 100,
            numSections: 5,
            linkRadius: 100,
            perception: 100,
            maxSpeed: 3,
            maxForce: 0.05,
            separationWeight: 1.5,
            alignmentWeight: 1.0,
            cohesionWeight: 1.0
        }, options);

        // global alpha multiplier for all drawing (connections + boids)
        this.options.alphaMultiplier = this.options.alphaMultiplier || 1.0;

        this.boids = [];
        this.sections = [];
        this.init();
    }

    init() {
        // Create background element
        this.backgroundElement = document.createElement('div');
        this.container.appendChild(this.backgroundElement);
        this.setStyles(this.backgroundElement, {
            position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, zIndex: 1,
            background: this.options.background
        });

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.context = this.canvas.getContext('2d');
        this.canvas.width = this.containerSize.width;
        this.canvas.height = this.containerSize.height;
        this.context.globalAlpha = 1.0;
        this.setStyles(this.canvas, { zIndex: 20, position: 'relative' });

        window.addEventListener('resize', this.handleResize.bind(this));

        const sectionWidth = Math.ceil((this.canvas.width + 2 * buffer) / this.options.numSections);
        const sectionHeight = Math.ceil((this.canvas.height + 2 * buffer) / this.options.numSections);
        this.createSections(sectionWidth, sectionHeight);

        // create boids
        const count = this.options.numBoids || Math.floor(this.canvas.width * this.canvas.height / this.options.density);
        for (let i = 0; i < count; i++) {
            const b = new Boid(Math.random() * this.canvas.width, Math.random() * this.canvas.height, this);
            this.boids.push(b);
            let si = ((b.pos.y - buffer) / sectionHeight) | 0;
            let sj = ((b.pos.x - buffer) / sectionWidth) | 0;
            si = Math.max(0, Math.min(this.options.numSections - 1, si));
            sj = Math.max(0, Math.min(this.options.numSections - 1, sj));
            this.sections[si][sj].addParticle(b);
        }

        if (this.options.interactive) {
            this.canvas.addEventListener('click', (e) => {
                const x = e.clientX - this.canvas.offsetLeft;
                const y = e.clientY - this.canvas.offsetTop;
                const b = new Boid(x, y, this);
                this.boids.push(b);
                const sectionWidth = Math.ceil((this.canvas.width + 2 * buffer) / this.options.numSections);
                const sectionHeight = Math.ceil((this.canvas.height + 2 * buffer) / this.options.numSections);
                let si = ((b.pos.y - buffer) / sectionHeight) | 0;
                let sj = ((b.pos.x - buffer) / sectionWidth) | 0;
                si = Math.max(0, Math.min(this.options.numSections - 1, si));
                sj = Math.max(0, Math.min(this.options.numSections - 1, sj));
                this.sections[si][sj].addParticle(b);
            });
        }

        requestAnimationFrame(this.update.bind(this));
    }

    createSections(sectionWidth, sectionHeight) {
        this.sections = Array.from({ length: this.options.numSections }, (_, i) => 
            Array.from({ length: this.options.numSections }, (_, j) => {
                const left = -buffer + j * sectionWidth;
                const top = -buffer + i * sectionHeight;
                const width = (j === this.options.numSections - 1) ? this.canvas.width + buffer - j * sectionWidth : sectionWidth;
                const height = (i === this.options.numSections - 1) ? this.canvas.height + buffer - i * sectionHeight : sectionHeight;
                return new Section(left, top, width, height);
            })
        );
    }

    setStyles(element, styles) {
        for (let property in styles) element.style[property] = styles[property];
    }

    handleResize() {
        const { offsetWidth, offsetHeight } = this.container;
        this.canvas.width = this.containerSize.width = offsetWidth;
        this.canvas.height = this.containerSize.height = offsetHeight;
        // recreate sections and reassign boids
        const sectionWidth = Math.ceil((this.canvas.width + 2 * buffer) / this.options.numSections);
        const sectionHeight = Math.ceil((this.canvas.height + 2 * buffer) / this.options.numSections);
        this.createSections(sectionWidth, sectionHeight);
        for (let b of this.boids) {
            let si = ((b.pos.y - buffer) / sectionHeight) | 0;
            let sj = ((b.pos.x - buffer) / sectionWidth) | 0;
            si = Math.max(0, Math.min(this.options.numSections - 1, si));
            sj = Math.max(0, Math.min(this.options.numSections - 1, sj));
            this.sections[si][sj].addParticle(b);
        }
    }

    update() {
        const ctx = this.context;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // reassign boids to sections 
        for (let i = 0; i < this.options.numSections; i++) {
            for (let j = 0; j < this.options.numSections; j++) {
                this.sections[i][j].particles.clear();
            }
        }
        const sectionWidth = Math.ceil((this.canvas.width + 2 * buffer) / this.options.numSections);
        const sectionHeight = Math.ceil((this.canvas.height + 2 * buffer) / this.options.numSections);
        for (let b of this.boids) {
            let si = ((b.pos.y - buffer) / sectionHeight) | 0;
            let sj = ((b.pos.x - buffer) / sectionWidth) | 0;
            si = Math.max(0, Math.min(this.options.numSections - 1, si));
            sj = Math.max(0, Math.min(this.options.numSections - 1, sj));
            this.sections[si][sj].addParticle(b);
        }

        for (let b of this.boids) {
            let si = ((b.pos.y - buffer) / sectionHeight) | 0;
            let sj = ((b.pos.x - buffer) / sectionWidth) | 0;
            si = Math.max(0, Math.min(this.options.numSections - 1, si));
            sj = Math.max(0, Math.min(this.options.numSections - 1, sj));

            let neighbors = [];
            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    const ni = si + di;
                    const nj = sj + dj;
                    if (ni < 0 || ni >= this.options.numSections || nj < 0 || nj >= this.options.numSections) continue;
                    neighbors.push(...this.sections[ni][nj].exportParticles());
                }
            }

            b.flock(neighbors);
        }

        // Draw connections between nearby boids (within linkRadius) using sections to limit checks
        const linkRadius = this.options.linkRadius || this.options.perception;
        const linkRSq = linkRadius * linkRadius;
        const numSections = this.options.numSections;

        for (let i = 0; i < numSections; i++) {
            for (let j = 0; j < numSections; j++) {
                const particles1 = this.sections[i][j].exportParticles();

                // within same section
                for (let a = 0; a < particles1.length; a++) {
                    const p1 = particles1[a];
                    for (let bIdx = a + 1; bIdx < particles1.length; bIdx++) {
                        const p2 = particles1[bIdx];
                        const dx = p1.pos.x - p2.pos.x;
                        const dy = p1.pos.y - p2.pos.y;
                        if (Math.abs(dx) > linkRadius || Math.abs(dy) > linkRadius) continue;
                        const distSq = dx * dx + dy * dy;
                        if (distSq <= linkRSq) {
                            const alpha = (linkRSq - distSq) / linkRSq;
                            ctx.beginPath();
                            ctx.strokeStyle = this.options.particleColor;
                            ctx.lineWidth = Math.max(0.1, alpha * 1.2);
                            ctx.globalAlpha = Math.max(0.06, alpha * this.options.alphaMultiplier * 0.9);
                            ctx.moveTo(p1.pos.x, p1.pos.y);
                            ctx.lineTo(p2.pos.x, p2.pos.y);
                            ctx.stroke();
                            ctx.globalAlpha = 1.0;
                        }
                    }
                }

                // check neighbor sections (north, north-west, north-east, east) to avoid duplicate lines
                const toCheck = [];
                if (i > 0) {
                    toCheck.push(this.sections[i-1][j]);
                    if (j > 0) toCheck.push(this.sections[i-1][j-1]);
                    if (j < numSections - 1) toCheck.push(this.sections[i-1][j+1]);
                }
                if (j < numSections - 1) toCheck.push(this.sections[i][j+1]);

                for (let neighbor of toCheck) {
                    const particles2 = neighbor.exportParticles();
                    for (let p1 of particles1) {
                        for (let p2 of particles2) {
                            const dx = p1.pos.x - p2.pos.x;
                            const dy = p1.pos.y - p2.pos.y;
                            if (Math.abs(dx) > linkRadius || Math.abs(dy) > linkRadius) continue;
                            const distSq = dx * dx + dy * dy;
                            if (distSq <= linkRSq) {
                                const alpha = (linkRSq - distSq) / linkRSq;
                                ctx.beginPath();
                                ctx.strokeStyle = this.options.particleColor;
                                ctx.lineWidth = Math.max(0.1, alpha * 1.2);
                                ctx.globalAlpha = Math.max(0.06, alpha * this.options.alphaMultiplier * 0.9);
                                ctx.moveTo(p1.pos.x, p1.pos.y);
                                ctx.lineTo(p2.pos.x, p2.pos.y);
                                ctx.stroke();
                                ctx.globalAlpha = 1.0;
                            }
                        }
                    }
                }
            }
        }

        for (let boid of this.boids) {
            boid.update();
            boid.draw(ctx);
        }

        setTimeout(() => {
            requestAnimationFrame(this.update.bind(this));
        }, 1000 / fps);
    }
}

function loadBoids(backgroundColor, opts = {}) {
    const container = document.getElementById('particleCanvas') || document.getElementById('particle-canvas');
    const options = Object.assign({ particleColor: '#FFF', background: backgroundColor || '#1a252f' }, opts);
    new BoidNetwork(container, options);
}