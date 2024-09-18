const buffer = 30;
const radius = 100;
const fps = 30;

class Section {
    constructor(left, top, width, height) {
        this.left = left;
        this.top = top;
        this.right = left + width;
        this.bottom = top + height;
        this.particles = new Set();
    }

    addParticle(particle) {
        this.particles.add(particle);
    }

    removeParticle(particle) {
        this.particles.delete(particle);
    }

    updateParticles() {
        this.particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
    }

    exportParticles() {
        return [...this.particles];
    }
}

class Particle {
    constructor(particleNetwork) {
        this.canvas = particleNetwork.canvas;
        this.context = particleNetwork.context;
        this.particleColor = particleNetwork.options.particleColor;
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.velocity = {
            x: (Math.random() - 0.5) * particleNetwork.options.velocity,
            y: (Math.random() - 0.5) * particleNetwork.options.velocity
        };
    }

    update() {
        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Infinite canvas effect: wrap around the edges
        if (this.x > this.canvas.width + buffer) {
            this.x = -buffer;
        } else if (this.x < -buffer) {
            this.x = this.canvas.width + buffer;
        }

        if (this.y > this.canvas.height + buffer) {
            this.y = -buffer;
        } else if (this.y < -buffer) {
            this.y = this.canvas.height + buffer;
        }
    }

    draw() {
        // TODO: Maybe prerender this as an image for performance
        const angle = Math.atan2(this.velocity.y, this.velocity.x);

        this.context.save(); // Save the current state of the context

        // Translate to the particle's position and rotate according to its velocity direction
        this.context.translate(this.x, this.y);
        this.context.rotate(angle);

        // Draw the chevron/arrow
        this.context.beginPath();
        this.context.moveTo(-2.5, -1.5); // Back left point
        this.context.lineTo(2.5, 0);  // Front point
        this.context.lineTo(-2.5, 1.5);  // Back right point
        this.context.closePath();

        this.context.fillStyle = this.particleColor;
        this.context.fill();
        this.context.restore();
    }
}
   
class ParticleNetwork {
    constructor(container, options = {}) {
        this.container = container;
        this.containerSize = { width: container.offsetWidth, height: container.offsetHeight };
        this.options = Object.assign({
            particleColor: '#FFFFFF',
            background: '#1a252f',
            interactive: true,
            velocity: 1,
            density: 4000,
            numSections: 5,
        }, options);
        this.sections = [];

        this.init();
    }

    init() {
        this.createBackground();

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.context = this.canvas.getContext('2d');
        this.canvas.width = this.containerSize.width;
        this.canvas.height = this.containerSize.height;
        this.context.globalAlpha = 0.25;

        this.setStyles(this.container, { position: 'relative' });
        this.setStyles(this.canvas, { zIndex: 20, position: 'relative' });

        window.addEventListener('resize', this.handleResize.bind(this));

        const sectionWidth = Math.ceil((this.canvas.width + 2 * buffer) / this.options.numSections);
        const sectionHeight = Math.ceil((this.canvas.height + 2 * buffer) / this.options.numSections);
        this.createSections(sectionWidth, sectionHeight);

        // Create particles
        for (let i = 0; i < this.canvas.width * this.canvas.height / this.options.density; i++) {
            //Add particle to section
            let particle = new Particle(this);
            let section = this.sections[((particle.y - buffer) / sectionHeight) | 0][((particle.x - buffer) / sectionWidth) | 0];
            section.addParticle(particle);
        }

        if (this.options.interactive) {
            this.interactiveParticle = new Particle(this);
            this.interactiveParticle.velocity = { x: 0, y: 0 };

            this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
            this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        }

        requestAnimationFrame(this.update.bind(this));
    }

    createBackground() {
        this.backgroundElement = document.createElement('div');
        this.container.appendChild(this.backgroundElement);
        this.setStyles(this.backgroundElement, {
            position: 'absolute',
            top: 0, left: 0, bottom: 0, right: 0, zIndex: 1,
        });
        if (/^#[0-9A-F]{3,6}$/i.test(this.options.background)) {
            this.backgroundElement.style.background = this.options.background;
        }
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
        for (let property in styles) {
            element.style[property] = styles[property];
        }
    }


    handleResize() {
        // Update canvas and container sizes
        const { offsetWidth, offsetHeight } = this.container;
        this.canvas.width = this.containerSize.width = offsetWidth;
        this.canvas.height = this.containerSize.height = offsetHeight;
    
        //Get all particles
        let particles = [];
        for (let i = 0; i < this.options.numSections; i++) {
            for (let j = 0; j < this.options.numSections; j++) {
                particles.push(...this.sections[i][j].exportParticles());
            }
        }
    
        // Reinitialize sections based on new canvas size
        this.sections = [];
        const sectionWidth = Math.ceil((this.canvas.width + 2 * buffer) / this.options.numSections);
        const sectionHeight = Math.ceil((this.canvas.height + 2 * buffer) / this.options.numSections);
    
        for (let i = 0; i < this.options.numSections; i++) {
            this.sections[i] = [];
            const top = -buffer + i * sectionHeight;
            const height = (i === this.options.numSections - 1) 
                ? this.canvas.height + buffer - i * sectionHeight 
                : sectionHeight;
    
            for (let j = 0; j < this.options.numSections; j++) {
                const left = -buffer + j * sectionWidth;
                const width = (j === this.options.numSections - 1) 
                    ? this.canvas.width + buffer - j * sectionWidth 
                    : sectionWidth;
    
                this.sections[i][j] = new Section(left, top, width, height);
            }
        }
    
        //Reassign particles to sections
        for (let particle of particles) {
            particle.update();
            let section = this.sections[((particle.y - buffer) / sectionHeight) | 0][((particle.x - buffer) / sectionWidth) | 0];
            section.addParticle(particle);
        }
    }    

    handleMouseMove(event) {
        this.interactiveParticle.x = event.clientX - this.canvas.offsetLeft;
        this.interactiveParticle.y = event.clientY - this.canvas.offsetTop;
    }

    handleMouseUp() {
        var sectionWidth = ((this.canvas.width + 2 * buffer)/ this.options.numSections) | 0;
        var sectionHeight = ((this.canvas.height + 2 * buffer)/ this.options.numSections) | 0;
        //Assign velocity to interactive particle
        this.interactiveParticle.velocity = {
            x: (Math.random() - 0.5) * this.options.velocity,
            y: (Math.random() - 0.5) * this.options.velocity
        };
        //Add particle to section
        let section = this.sections[((this.interactiveParticle.y - buffer) / sectionHeight) | 0][((this.interactiveParticle.x - buffer) / sectionWidth) | 0];
        section.addParticle(this.interactiveParticle);

        //Create new interactive particle
        this.interactiveParticle = new Particle(this);
        this.interactiveParticle.velocity = { x: 0, y: 0 };
    }

    drawSectionBoundaries() {
        this.context.strokeStyle = '#FF0000'; // Red lines for visibility
        this.context.lineWidth = 1;

        var numSections = this.options.numSections;
        for (let i = 0; i < numSections; i++) {
            for (let j = 0; j < numSections; j++) {
                let section = this.sections[i][j];
                // Draw section boundary
                this.context.beginPath();
                this.context.rect(section.left + buffer, section.top + buffer, 
                                  section.right - section.left, section.bottom - section.top);
                this.context.stroke();
            }
        }
    }

    update() {
        // Clear canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        //this.drawSectionBoundaries();

        //Update particles
        var numSections = this.options.numSections;
        this.sections.flat().forEach(section => section.updateParticles());

        //Move particles to correct sections
        for (let i = 0; i < numSections; i++) {
            for (let j = 0; j < numSections; j++) {
                var section = this.sections[i][j];
                let particles = section.exportParticles();
                for (let particle of particles) {
                    //Check if particle is in bounds
                    if (particle.x > section.left && particle.x < section.right && particle.y > section.top && particle.y < section.bottom) {
                        continue;
                    }

                    //Check against neighbors
                    for (let k = -1; k <= 1; k++) {
                        for (let l = -1; l <= 1; l++) {
                            if (k == 0 && l == 0) {
                                continue;
                            }
                            //Get neighbor (including wrap around sections)
                            let neighbor = this.sections[(i + k + numSections) % numSections][(j + l + numSections) % numSections];
                            if (neighbor.left <= particle.x && particle.x <= neighbor.right && neighbor.top <= particle.y && particle.y <= neighbor.bottom) {
                                this.sections[i][j].removeParticle(particle);
                                neighbor.addParticle(particle);
                                break;
                            }
                        }
                    }
                }

            }
        }

        //Draw connections between particles
        for (let i = 0; i < numSections; i++) {
            for (let j = 0; j < numSections; j++) {
                var section = this.sections[i][j];
                let particles1 = this.sections[i][j].exportParticles();
                
                //Check against self 
                for (let i = 0; i < particles1.length; i++) {
                    const particle1 = particles1[i];
                    for (let j = particles1.length - 1; j > i; j--) {
                        const particle2 = particles1[j];
                        let xDiff = Math.abs(particle1.x - particle2.x);
                        let yDiff = Math.abs(particle1.y - particle2.y);
                        if (xDiff > radius || yDiff > radius) {
                            continue;
                        }
                        let distance = xDiff*xDiff + yDiff*yDiff;
                        if (distance <= radius*radius) {
                            this.context.beginPath();
                            this.context.strokeStyle = this.options.particleColor;
                            this.context.lineWidth = (radius*radius - distance) / (radius*radius);
                            this.context.moveTo(particle1.x, particle1.y);
                            this.context.lineTo(particle2.x, particle2.y);
                            this.context.stroke();
                        }
                    }
                }

                
                //Assign neighbors: nw, n, ne, and e (if not on edge)
                var toCheck = [];
                if (i > 0) {
                    toCheck.push(this.sections[i-1][j]);
                    if (j > 0) {
                        toCheck.push(this.sections[i-1][j-1]);
                    }
                    if (j < numSections - 1) {
                        toCheck.push(this.sections[i-1][j+1]);
                    }
                }
                if (j < numSections - 1) {
                    toCheck.push(this.sections[i][j+1]);
                }
                //Check against neighbors
                for (let neighbor of toCheck) {
                    let particles2 = neighbor.exportParticles();
                    for (let particle1 of particles1) {
                        for (let particle2 of particles2) {
                            let xDiff = Math.abs(particle1.x - particle2.x);
                            let yDiff = Math.abs(particle1.y - particle2.y);
                            if (xDiff > radius || yDiff > radius) {
                                continue;
                            }
                            let distance = xDiff*xDiff + yDiff*yDiff;
                            if (distance <= radius*radius) {
                                this.context.beginPath();
                                this.context.strokeStyle = this.options.particleColor;
                                this.context.lineWidth = (radius*radius - distance) / (radius*radius);
                                this.context.moveTo(particle1.x, particle1.y);
                                this.context.lineTo(particle2.x, particle2.y);
                                this.context.stroke();
                            }
                        }
                    }
                }

                //Check against interactive particle
                if (this.options.interactive) {
                    let particle2 = this.interactiveParticle;
                    particle2.update();
                    particle2.draw();
                    for (let particle1 of particles1) {
                        let xDiff = Math.abs(particle1.x - particle2.x);
                        let yDiff = Math.abs(particle1.y - particle2.y);
                        if (xDiff > radius || yDiff > radius) {
                            continue;
                        }
                        let distance = xDiff*xDiff + yDiff*yDiff;
                        if (distance <= radius*radius) {
                            this.context.beginPath();
                            this.context.strokeStyle = this.options.particleColor;
                            this.context.lineWidth = (radius*radius - distance) / (radius*radius);
                            this.context.moveTo(particle1.x, particle1.y);
                            this.context.lineTo(particle2.x, particle2.y);
                            this.context.stroke();
                        }
                    }
                }
            }
        }

        //Animate frame
        if (this.options.velocity !== 0) {
            setTimeout(() => {
                requestAnimationFrame(this.update.bind(this));
              }, 1000 / fps);
        }
    }
}

// Initialization
function loadParticles() {
    const container = document.getElementById("particle-canvas");
    const options = {
        particleColor: '#FFF',
        interactive: true,
        background: '#000000',
        velocity: 4,
        density: 4000,
        numSections: 7,

    };
    new ParticleNetwork(container, options);
}