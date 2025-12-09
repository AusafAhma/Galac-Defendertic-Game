window.addEventListener('load', function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const input = new InputHandler();
    const audio = new AudioController();
    let player = new Player(canvas.width, canvas.height);

    // Game State
    let lastTime = 0;
    let score = 0;
    let particles = [];
    let enemies = [];
    let projectiles = [];
    let powerUps = [];
    let boss = null;
    let gameActive = false;
    let difficulty = 'normal';
    let animationId;

    // Difficulty Settings
    const difficultySettings = {
        easy: { enemySpawnRate: 0.01, enemySpeedMultiplier: 0.8, bossHealthMultiplier: 0.8 },
        normal: { enemySpawnRate: 0.02, enemySpeedMultiplier: 1.0, bossHealthMultiplier: 1.0 },
        hard: { enemySpawnRate: 0.035, enemySpeedMultiplier: 1.3, bossHealthMultiplier: 1.5 },
    };

    // Starfield
    const stars = [];
    function initializeStars() {
        stars.length = 0;
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2,
                speed: Math.random() * 0.5 + 0.1
            });
        }
    }
    initializeStars();

    // Resize handler
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (player) {
            player.gameWidth = canvas.width;
            player.gameHeight = canvas.height;
        }
        initializeStars();
    });

    // UI Elements
    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-btn');
    const gameOverScreen = document.getElementById('game-over-screen');
    const restartBtn = document.getElementById('restart-btn');
    const hudScore = document.getElementById('score-display');
    const livesDisplay = document.getElementById('lives-display');
    const finalScoreDisplay = document.getElementById('final-score');
    const difficultyButtons = document.querySelectorAll('.diff-btn');

    // Set difficulty
    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            difficultyButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            difficulty = button.dataset.diff;
        });
    });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    function startGame() {
        if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();

        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');

        gameActive = true;
        score = 0;
        updateScore(0);

        enemies = [];
        projectiles = [];
        powerUps = [];
        particles = [];
        boss = null;

        player = new Player(canvas.width, canvas.height);
        player.lives = 3;
        updateLives();

        lastTime = 0;
        animate(0);
    }

    function gameOver() {
        gameActive = false;
        finalScoreDisplay.innerText = `Final Score: ${score}`;
        gameOverScreen.classList.remove('hidden');
        cancelAnimationFrame(animationId);
    }

    function updateScore(points) {
        score += points;
        hudScore.innerText = `Score: ${score}`;
    }

    function updateLives() {
        // Create heart symbols based on lives
        livesDisplay.innerText = 'Lives: ' + '❤️'.repeat(Math.max(0, player.lives));
    }

    function createExplosion(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x, y, color));
        }
        audio.explosion();
    }

    function checkCollisions() {
        // Projectiles hitting Enemies
        projectiles.forEach(projectile => {
            if (projectile.isEnemy) return; // handled in player check

            enemies.forEach(enemy => {
                if (!enemy.markedForDeletion && !projectile.markedForDeletion) {
                    const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
                    if (dist < enemy.radius + projectile.radius) {
                        enemy.lives -= projectile.damage;
                        projectile.markedForDeletion = true;
                        createExplosion(projectile.x, projectile.y, '#ff0', 3); // Small hit effect

                        if (enemy.lives <= 0) {
                            enemy.markedForDeletion = true;
                            createExplosion(enemy.x, enemy.y, enemy.color, 15);
                            updateScore(enemy.scoreValue);
                            // Chance for powerup
                            if (Math.random() < 0.1) {
                                powerUps.push(new PowerUp(enemy.x, enemy.y, Math.random() > 0.5 ? 'shield' : 'spread'));
                            }
                        }
                    }
                }
            });

            // Projectile hitting Boss
            if (boss && !boss.markedForDeletion && !projectile.markedForDeletion) {
                const dist = Math.hypot(projectile.x - boss.x, projectile.y - boss.y);
                if (dist < boss.radius + projectile.radius) {
                    boss.lives -= projectile.damage;
                    projectile.markedForDeletion = true;
                    createExplosion(projectile.x, projectile.y, '#ff0', 5);

                    if (boss.lives <= 0) {
                        boss.markedForDeletion = true;
                        createExplosion(boss.x, boss.y, boss.color, 50);
                        updateScore(1000);
                        boss = null;
                    }
                }
            }
        });

        // Enemy Projectiles hitting Player
        projectiles.forEach(projectile => {
            if (!projectile.isEnemy) return;

            if (!projectile.markedForDeletion) {
                const dist = Math.hypot(projectile.x - player.x, projectile.y - player.y);
                if (dist < player.radius + projectile.radius) {
                    projectile.markedForDeletion = true;
                    playerHit();
                }
            }
        });

        // Enemies hitting Player
        enemies.forEach(enemy => {
            if (!enemy.markedForDeletion) {
                const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                if (dist < player.radius + enemy.radius) {
                    enemy.markedForDeletion = true;
                    createExplosion(enemy.x, enemy.y, enemy.color, 10);
                    playerHit();
                }
            }
        });

        // PowerUps hitting Player
        powerUps.forEach(powerUp => {
            if (!powerUp.markedForDeletion) {
                const dist = Math.hypot(powerUp.x - player.x, powerUp.y - player.y);
                if (dist < player.radius + powerUp.radius) {
                    powerUp.markedForDeletion = true;
                    audio.powerUp();
                    if (powerUp.type === 'shield') {
                        player.shieldActive = true;
                        // Remote shield after 5 seconds
                        setTimeout(() => player.shieldActive = false, 5000);
                    } else if (powerUp.type === 'spread') {
                        player.powerLevel = 2;
                        setTimeout(() => player.powerLevel = 1, 10000);
                    }
                }
            }
        });
    }

    function playerHit() {
        if (player.shieldActive) {
            player.shieldActive = false;
            createExplosion(player.x, player.y, '#0ff', 10); // Shield break effect
            return;
        }

        player.lives--;
        updateLives();
        createExplosion(player.x, player.y, '#f00', 20);

        if (player.lives <= 0) {
            gameOver();
        }
    }

    function drawBackground(ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        stars.forEach(star => {
            ctx.globalAlpha = Math.random() * 0.5 + 0.5;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();

            if (gameActive) {
                star.y += star.speed;
                if (star.y > canvas.height) star.y = 0;
            }
        });
        ctx.globalAlpha = 1.0;
    }

    function animate(timeStamp) {
        if (!gameActive) return;
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;

        drawBackground(ctx);

        // --- SPAWNING ---

        // Revised Boss Logic: Spawn boss if score > 500 and randomly
        if (!boss && score > 500 && Math.random() < 0.0005) {
            boss = new Boss(canvas.width, canvas.height);
            boss.lives *= difficultySettings[difficulty].bossHealthMultiplier;
        }

        // Enemy Spawning
        if (!boss && Math.random() < difficultySettings[difficulty].enemySpawnRate) {
            const enemy = new Enemy(canvas.width, canvas.height);
            enemy.speedY *= difficultySettings[difficulty].enemySpeedMultiplier;
            enemies.push(enemy);
        }

        // --- UPDATES ---

        // Player Shooting
        if (input.isDown('Space')) {
            if (player.shootTimer <= 0) {
                if (player.powerLevel > 1) {
                    projectiles.push(new Projectile(player.x, player.y - player.radius, -Math.PI / 2));
                    projectiles.push(new Projectile(player.x, player.y - player.radius, -Math.PI / 2 - 0.2));
                    projectiles.push(new Projectile(player.x, player.y - player.radius, -Math.PI / 2 + 0.2));
                } else {
                    projectiles.push(new Projectile(player.x, player.y - player.radius, -Math.PI / 2));
                }
                audio.shoot();
                player.shootTimer = player.shootInterval;
            }
        }
        player.update(input);

        // Projectiles
        projectiles.forEach(p => p.update());
        projectiles = projectiles.filter(p => !p.markedForDeletion && p.y > -50 && p.y < canvas.height + 50 && p.x > -50 && p.x < canvas.width + 50);

        // Boss
        if (boss) {
            boss.update();
            if (boss.shootTimer === 0) {
                // Boss shoots 3 bullets
                projectiles.push(new Projectile(boss.x, boss.y + boss.radius, Math.PI / 2, true));
                projectiles.push(new Projectile(boss.x, boss.y + boss.radius, Math.PI / 2 - 0.5, true));
                projectiles.push(new Projectile(boss.x, boss.y + boss.radius, Math.PI / 2 + 0.5, true));
            }
            if (boss.markedForDeletion) boss = null;
        }

        // Enemies
        enemies.forEach(e => e.update(player));
        enemies = enemies.filter(e => !e.markedForDeletion && e.y < canvas.height + 50);

        // PowerUps
        powerUps.forEach(p => p.update());
        powerUps = powerUps.filter(p => !p.markedForDeletion);

        // Particles
        particles.forEach(p => p.update());
        particles = particles.filter(p => !p.markedForDeletion);

        // Check Collisions
        checkCollisions();

        // --- DRAWING ---
        particles.forEach(p => p.draw(ctx));
        powerUps.forEach(p => p.draw(ctx));
        if (player.lives > 0) player.draw(ctx);
        enemies.forEach(e => e.draw(ctx));
        if (boss) boss.draw(ctx);
        projectiles.forEach(p => p.draw(ctx));

        animationId = requestAnimationFrame(animate);
    }
});