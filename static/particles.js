var buffer = 30;
var radius = 100;
var rad2 = radius*radius;

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
        const angle = Math.atan2(this.velocity.y, this.velocity.x);

        this.context.save(); // Save the current state of the context

        // Translate to the particle's position and rotate according to its velocity direction
        this.context.translate(this.x, this.y);
        this.context.rotate(angle);

        // Draw the chevron/arrow
        this.context.beginPath();
        this.context.moveTo(-5, -3); // Back left point
        this.context.lineTo(5, 0);  // Front point
        this.context.lineTo(-5, 3);  // Back right point
        this.context.closePath();

        this.context.fillStyle = this.particleColor;
        this.context.globalAlpha = 1;
        this.context.fill();

        this.context.restore();
    }
}

class ParticleNetwork {
    constructor(container, options = {}) {
        this.container = container;
        this.containerSize = {
            width: this.container.offsetWidth,
            height: this.container.offsetHeight
        };
        this.options = {
            particleColor: options.particleColor || '#fff',
            background: options.background || '#1a252f',
            interactive: options.interactive !== undefined ? options.interactive : true,
            velocity: options.speed,
            density: options.density,
            numSections: options.numSections !== undefined ? options.numSections : 1
        };

        this.init();
    }

    init() {
        // Create background
        this.backgroundElement = document.createElement('div');
        this.container.appendChild(this.backgroundElement);
        this.setStyles(this.backgroundElement, {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            zIndex: 1
        });

        if (/^#[0-9A-F]{3,6}$/i.test(this.options.background)) {
            this.setStyles(this.backgroundElement, { background: this.options.background });
        } else if (/\.(gif|jpg|jpeg|tiff|png)$/i.test(this.options.background)) {
            this.setStyles(this.backgroundElement, {
                background: `url("${this.options.background}") no-repeat center`,
                backgroundSize: 'cover'
            });
        } else {
            console.error('Invalid background image or color');
            return;
        }

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.context = this.canvas.getContext('2d');
        this.canvas.width = this.containerSize.width;
        this.canvas.height = this.containerSize.height;

        this.setStyles(this.container, { position: 'relative' });
        this.setStyles(this.canvas, { zIndex: 20, position: 'relative' });

        window.addEventListener('resize', this.handleResize.bind(this));

        this.particles = [];
        for (let i = 0; i < this.canvas.width * this.canvas.height / this.options.density; i++) {
            this.particles.push(new Particle(this));
        }

        if (this.options.interactive) {
            this.interactiveParticle = new Particle(this);
            this.interactiveParticle.velocity = { x: 0, y: 0 };
            this.particles.push(this.interactiveParticle);

            this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
            this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        }

        requestAnimationFrame(this.update.bind(this));
    }

    setStyles(element, styles) {
        for (let property in styles) {
            element.style[property] = styles[property];
        }
    }

    handleResize() {  
        // Update the canvas dimensions
        this.canvas.width = this.containerSize.width = this.container.offsetWidth;
        this.canvas.height = this.containerSize.height = this.container.offsetHeight;
    }

    handleMouseMove(event) {
        this.interactiveParticle.x = event.clientX - this.canvas.offsetLeft;
        this.interactiveParticle.y = event.clientY - this.canvas.offsetTop;
    }

    handleMouseUp() {
        this.interactiveParticle.velocity = {
            x: (Math.random() - 0.5) * this.options.velocity,
            y: (Math.random() - 0.5) * this.options.velocity
        };
        this.interactiveParticle = new Particle(this);
        this.interactiveParticle.velocity = { x: 0, y: 0 };
        this.particles.push(this.interactiveParticle);
        console.log(this.particles.length);
    }

    update() {
        //const currentTime = performance.now();

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.globalAlpha = 1;

        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            particle.update();
            particle.draw();

            for (let j = this.particles.length - 1; j > i; j--) {
                const otherParticle = this.particles[j];

                if (Math.abs(particle.x - otherParticle.x) > radius || Math.abs(particle.y - otherParticle.y) > radius) {
                    continue;
                }

                const distance = (Math.pow(particle.x - otherParticle.x, 2) +
                                           Math.pow(particle.y - otherParticle.y, 2));

                if (distance <= rad2) {
                    this.context.beginPath();
                    this.context.strokeStyle = this.options.particleColor;
                    //this.context.globalAlpha = (rad2 - distance) / rad2;
                    this.context.lineWidth = (rad2 - distance) / (rad2);
                    this.context.moveTo(particle.x, particle.y);
                    this.context.lineTo(otherParticle.x, otherParticle.y);
                    this.context.stroke();
                }
            }
        }
        if (this.options.velocity !== 0) {
            requestAnimationFrame(this.update.bind(this));
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
        speed: 1,
        density: 4000,
        numSections: 7,

    };
    new ParticleNetwork(container, options);
}
