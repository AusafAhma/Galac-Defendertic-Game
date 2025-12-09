class Entity {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.markedForDeletion = false;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    update() {
        // Override in subclasses
    }
}

class Player extends Entity {
    constructor(gameWidth, gameHeight) {
        super(gameWidth / 2, gameHeight - 50, 20, '#0ff');
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.speed = 5;
        this.shootTimer = 0;
        this.shootInterval = 15; // Frames between shots
        this.powerLevel = 1;
        this.shieldActive = false;
    }

    update(input) {
        // Movement
        if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
            this.x -= this.speed;
        }
        if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
            this.x += this.speed;
        }
        if (input.isDown('ArrowUp') || input.isDown('KeyW')) {
            this.y -= this.speed;
        }
        if (input.isDown('ArrowDown') || input.isDown('KeyS')) {
            this.y += this.speed;
        }

        // Boundaries
        this.x = Math.max(this.radius, Math.min(this.gameWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(this.gameHeight - this.radius, this.y));

        // Shooting
        if (this.shootTimer > 0) this.shootTimer--;
    }

    draw(ctx) {
        // Simple triangle for ship
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, this.radius);
        ctx.lineTo(0, this.radius * 0.5); // Indent at bottom
        ctx.lineTo(-this.radius, this.radius);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();

        // Engine flame
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.5, this.radius);
        ctx.lineTo(0, this.radius + (Math.random() * 10 + 5));
        ctx.lineTo(this.radius * 0.5, this.radius);
        ctx.closePath();
        ctx.fillStyle = 'orange';
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'orange';
        ctx.fill();

        if (this.shieldActive) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}

class Projectile extends Entity {
    constructor(x, y, angle, isEnemy = false) {
        super(x, y, 5, isEnemy ? '#f00' : '#ff0');
        this.angle = angle;
        this.speed = isEnemy ? 5 : 10;
        this.isEnemy = isEnemy;
        this.damage = 1;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        if (this.isEnemy) {
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        } else {
            ctx.rect(-5, -2, 10, 4);
        }
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.restore();
    }
}

class PowerUp extends Entity {
    constructor(x, y, type) {
        const color = type === 'shield' ? '#0f0' : '#00f';
        super(x, y, 10, color);
        this.type = type; // 'shield', 'spread'
        this.speedY = 2;
    }

    update() {
        this.y += this.speedY;
        if (this.y > 2000) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type === 'shield' ? 'S' : 'P', 0, 0);

        ctx.restore();
    }
}

class Boss extends Entity {
    constructor(gameWidth, gameHeight) {
        super(gameWidth / 2, -100, 60, '#f00');
        this.gameWidth = gameWidth;
        this.lives = 50;
        this.maxLives = 50;
        this.speedX = 3;
        this.state = 'entering'; // entering, fight
        this.shootTimer = 0;
    }

    update() {
        if (this.state === 'entering') {
            this.y += 2;
            if (this.y > 100) {
                this.state = 'fight';
            }
        } else {
            this.x += this.speedX;
            if (this.x < this.radius || this.x > this.gameWidth - this.radius) {
                this.speedX = -this.speedX;
            }

            this.shootTimer++;
            if (this.shootTimer > 60) {
                this.shootTimer = 0;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        // Boss Geometry
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, 0);
        ctx.lineTo(this.radius * 0.5, this.radius);
        ctx.lineTo(-this.radius * 0.5, this.radius);
        ctx.lineTo(-this.radius, 0);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();

        // Health bar
        const hpPercent = this.lives / this.maxLives;
        ctx.fillStyle = '#600';
        ctx.fillRect(-50, -80, 100, 10);
        ctx.fillStyle = '#f00';
        ctx.fillRect(-50, -80, 100 * hpPercent, 10);

        ctx.restore();
    }
}

class Enemy extends Entity {
    constructor(gameWidth, gameHeight) {
        super(0, 0, 15, '#f00');
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.x = Math.random() * gameWidth;
        this.y = -this.radius; // Start above screen
        this.speedY = Math.random() * 2 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.lives = 1;
        this.scoreValue = 10;

        // Randomize type visual slightly
        this.type = Math.random() > 0.8 ? 'chaser' : 'basic';
    }

    update(player) {
        this.y += this.speedY;
        this.x += this.speedX;

        if (this.type === 'chaser' && player) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * 1; // Slight homing
            this.y += Math.sin(angle) * 1;
        }

        // Bounce off walls
        if (this.x < this.radius || this.x > this.gameWidth - this.radius) {
            this.speedX = -this.speedX;
        }

        if (this.y > this.gameHeight + this.radius) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Rotate slowly
        // ctx.rotate(Date.now() / 500); // Simple animation

        ctx.beginPath();
        if (this.type === 'chaser') {
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius, this.radius);
            ctx.lineTo(-this.radius, this.radius);
        } else {
            // Hexagon for basic enemy
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const sx = Math.cos(angle) * this.radius;
                const sy = Math.sin(angle) * this.radius;
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
        }
        ctx.closePath();
        ctx.fillStyle = this.type === 'chaser' ? '#f0f' : '#f00';
        ctx.fill();
        ctx.shadowBlur = 8;
        ctx.shadowColor = ctx.fillStyle;

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-5, -5, 3, 0, Math.PI * 2);
        ctx.arc(5, -5, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class Particle extends Entity {
    constructor(x, y, color) {
        super(x, y, Math.random() * 3 + 1, color);
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        this.life = 1.0; // Opacity/Life
        this.decay = Math.random() * 0.05 + 0.02;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.life -= this.decay;
        if (this.life <= 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}
