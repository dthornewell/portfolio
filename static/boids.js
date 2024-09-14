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
        if (this.x > this.canvas.width + 20 || this.x < -20) {
            this.velocity.x = -this.velocity.x;
        }
        if (this.y > this.canvas.height + 20 || this.y < -20) {
            this.velocity.y = -this.velocity.y;
        }
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }

    draw() {
        this.context.beginPath();
        this.context.fillStyle = this.particleColor;
        this.context.globalAlpha = 0.7;
        this.context.arc(this.x, this.y, 1.5, 0, 2 * Math.PI);
        this.context.fill();
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
            interactive: (options.interactive !== undefined) ? options.interactive : true,
            velocity: this.setVelocity(options.speed),
            density: this.setDensity(options.density)
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
            console.error('invalid background image or color');
            return;
        }

        // Validate particle color
        if (!/^#[0-9A-F]{3,6}$/i.test(this.options.particleColor)) {
            console.error('invalid particle color');
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

    setVelocity(speed) {
        return speed === 'fast' ? 1 : speed === 'slow' ? 0.33 : speed === 'none' ? 0 : 0.66;
    }

    setDensity(density) {
        return density === 'high' ? 5000 : density === 'low' ? 20000 : isNaN(parseInt(density, 10)) ? 10000 : density;
    }

    setStyles(element, styles) {
        for (let property in styles) {
            element.style[property] = styles[property];
        }
    }

    handleResize() {
        if (this.container.offsetWidth === this.containerSize.width &&
            this.container.offsetHeight === this.containerSize.height) {
            return;
        }
        this.canvas.width = this.containerSize.width = this.container.offsetWidth;
        this.canvas.height = this.containerSize.height = this.container.offsetHeight;

        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.particles = [];
            for (let i = 0; i < this.canvas.width * this.canvas.height / this.options.density; i++) {
                this.particles.push(new Particle(this));
            }
            if (this.options.interactive) {
                this.particles.push(this.interactiveParticle);
            }
            requestAnimationFrame(this.update.bind(this));
        }, 500);
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
    }

    update() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.globalAlpha = 1;

        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            particle.update();
            particle.draw();

            for (let j = this.particles.length - 1; j > i; j--) {
                const otherParticle = this.particles[j];
                const distance = Math.sqrt(Math.pow(particle.x - otherParticle.x, 2) +
                                            Math.pow(particle.y - otherParticle.y, 2));

                if (distance <= 120) {
                    this.context.beginPath();
                    this.context.strokeStyle = this.options.particleColor;
                    this.context.globalAlpha = (120 - distance) / 120;
                    this.context.lineWidth = 0.7;
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

// Initialisation

const container = document.getElementById('particle-canvas');
var options = {
  particleColor: '#FFF',
  interactive: true,
  background: '#000000',
  speed: 'fast',
  density: 'high'
};
var particleCanvas = new ParticleNetwork(container, options);