class Vector {
    constructor(x = 0.0, y = 0.0) {
        this.x = x;
        this.y = y;
    }

    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
    }

    magnitude() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }

    static add(a, b) {
        return new this(a.x + b.x, a.y + b.y);
    }

    static subtract(a, b) {
        return new this(a.x - b.x, a.y - b.y);
    }

    static distance(a, b) {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }
}

class Boid {
    
}