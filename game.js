class InputHandler {
    constructor() {
        this.keys = {};
        window.addEventListener('keydown', e => {
            // e.code を使用して物理キーで判定（IME等の影響を受けにくい）
            const codes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyZ', 'KeyJ'];
            if (codes.includes(e.code)) {
                this.keys[e.code] = true;
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', e => {
            const codes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyZ', 'KeyJ'];
            if (codes.includes(e.code)) {
                this.keys[e.code] = false;
            }
        });
    }

    isDown(key) {
        if (key === 'up') return this.keys['KeyW'];
        if (key === 'down') return this.keys['KeyS'];
        if (key === 'left') return this.keys['KeyA'];
        if (key === 'right') return this.keys['KeyD'];
        if (key === 'shoot') return this.keys['KeyZ'] || this.keys['Space'];
        if (key === 'slow') return this.keys['KeyE'];
        if (key === 'shift') return this.keys['ShiftLeft'] || this.keys['ShiftRight'];
        if (key === 'restart') return this.keys['KeyJ'];
        return false;
    }
}

class Bullet {
    constructor(x, y, vx, vy, color, radius, type) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.radius = radius;
        this.type = type; // 'player', 'normal', 'bonus'
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.width = 20;
        this.height = 20;
        this.x = game.width / 2;
        this.y = game.height - 100;
        this.speed = 5;
        this.slowSpeed = 2;
        this.color = '#3498db'; // 青系
        this.bullets = [];
        this.lastShotTime = 0;
        this.shotInterval = 100; // ms
    }

    update(input, deltaTime) {
        // 金縛り (Shiftで低速)
        const currentSpeed = input.isDown('slow') ? this.slowSpeed : this.speed;

        // 移動
        if (input.isDown('left')) this.x -= currentSpeed;
        if (input.isDown('right')) this.x += currentSpeed;
        if (input.isDown('up')) this.y -= currentSpeed;
        if (input.isDown('down')) this.y += currentSpeed;

        // 画面端の制限
        if (this.x < this.width / 2) this.x = this.width / 2;
        if (this.x > this.game.width - this.width / 2) this.x = this.game.width - this.width / 2;
        if (this.y < this.height / 2) this.y = this.height / 2;
        if (this.y > this.game.height - this.height / 2) this.y = this.game.height - this.height / 2;

        // ショット
        if (input.isDown('shoot')) {
            if (Date.now() - this.lastShotTime > this.shotInterval) {
                this.shoot();
                this.lastShotTime = Date.now();
            }
        }
    }

    shoot() {
        // まっすぐの弾
        this.game.bullets.push(new Bullet(this.x, this.y - 10, 0, -10, '#3498db', 4, 'player'));
    }

    draw(ctx) {
        // 自機（三角形）
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();

        // 当たり判定の点（低速時のみ表示などの演出も可だが、とりあえず常時表示しない、または中心に小さく）
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();

        ctx.restore();
    }
}

class Enemy {
    constructor(game) {
        this.game = game;
        this.x = Math.random() * (game.width - 40) + 20;
        this.y = -20;
        this.speedY = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 1;
        this.markedForDeletion = false;
        this.color = '#e74c3c'; // 赤系
        this.radius = 15;
        this.angle = 0;
        this.shootTimer = 0;
        this.shootInterval = Math.random() * 1000 + 500;
    }

    update(deltaTime) {
        this.y += this.speedY;
        this.x += this.speedX;

        // 画面外に出たら削除
        if (this.y > this.game.height + this.radius) {
            this.markedForDeletion = true;
        }
        if (this.x < 0 || this.x > this.game.width) {
            this.speedX *= -1;
        }

        // 弾幕発射
        this.shootTimer += deltaTime;
        if (this.shootTimer > this.shootInterval) {
            this.shoot();
            this.shootTimer = 0;
        }
    }

    shoot() {
        // 自機狙い弾
        const angle = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
        const speed = 4;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        // 通常弾 (赤)
        this.game.bullets.push(new Bullet(this.x, this.y, vx, vy, '#e74c3c', 3, 'normal'));

        // ボーナス弾 (白) - 通常弾と一緒に発射、少し遅く
        const bonusSpeed = 3;
        const bvx = Math.cos(angle) * bonusSpeed;
        const bvy = Math.sin(angle) * bonusSpeed;
        this.game.bullets.push(new Bullet(this.x, this.y, bvx, bvy, '#fff', 5, 'bonus'));

        // 全方位弾（たまに）
        if (Math.random() < 0.3) {
            for (let i = 0; i < 8; i++) {
                const a = i * (Math.PI / 4);
                const sx = Math.cos(a) * 3;
                const sy = Math.sin(a) * 3;
                this.game.bullets.push(new Bullet(this.x, this.y, sx, sy, '#9b59b6', 3, 'normal'));

                // 隙間にボーナス弾
                const ba = a + (Math.PI / 8);
                const bsx = Math.cos(ba) * 2;
                const bsy = Math.sin(ba) * 2;
                this.game.bullets.push(new Bullet(this.x, this.y, bsx, bsy, '#fff', 4, 'bonus'));
            }
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

class Game {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.player = new Player(this);
        this.input = new InputHandler();
        this.bullets = [];
        this.enemies = [];
        this.enemyTimer = 0;
        this.enemyInterval = 1000;
        this.score = 0;
        this.isShadowMode = false;
        this.gameOver = false;
        this.scoreElement = document.getElementById('score');
    }

    update(deltaTime) {
        if (this.gameOver) {
            if (this.input.isDown('restart')) {
                this.restart();
            }
            return;
        }

        this.isShadowMode = this.input.isDown('shift');
        this.player.update(this.input, deltaTime);

        // 弾の更新
        this.bullets.forEach(bullet => bullet.update());
        this.bullets = this.bullets.filter(bullet =>
            !bullet.markedForDeletion &&
            bullet.x > -50 &&
            bullet.x < this.width + 50 &&
            bullet.y > -50 &&
            bullet.y < this.height + 50
        );

        // 敵の生成と更新
        this.enemyTimer += deltaTime;
        if (this.enemyTimer > this.enemyInterval && this.enemies.length < 3) {
            this.enemies.push(new Enemy(this));
            this.enemyTimer = 0;
            if (this.enemyInterval > 200) this.enemyInterval -= 5; // 徐々に難しく
        }

        this.enemies.forEach(enemy => {
            enemy.update(deltaTime);

            // 当たり判定 (自機弾 vs 敵)
            this.bullets.forEach(bullet => {
                // 自機弾なら敵に当たる（モード関係なし）
                if (bullet.type === 'player' && !bullet.markedForDeletion) {
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < enemy.radius + bullet.radius) {
                        enemy.markedForDeletion = true;
                        bullet.markedForDeletion = true;
                        this.score += 100;
                        this.updateScore();
                    }
                }
            });
        });

        this.enemies = this.enemies.filter(enemy => !enemy.markedForDeletion);

        // 当たり判定 (自機 vs 敵/敵弾)
        if (this.checkCollision()) {
            this.gameOver = true;
            // alert('Game Over! Score: ' + this.score);
        }
    }

    checkCollision() {
        // 対 敵機
        for (const enemy of this.enemies) {
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < enemy.radius + 5) return true;
        }
        // 対 弾
        for (const bullet of this.bullets) {
            if (bullet.markedForDeletion) continue;

            // 当たり判定を行うべき弾か？
            // 通常モード: normal弾に当たる
            // 裏世界モード: bonus弾に当たり（スコア加算）、normal弾には当たらない

            const dx = bullet.x - this.player.x;
            const dy = bullet.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (this.isShadowMode) {
                // 裏世界: ボーナス弾のみ判定。当たったらスコア+回復、弾消滅
                if (bullet.type === 'bonus') {
                    if (dist < 5 + bullet.radius) {
                        bullet.markedForDeletion = true;
                        this.score += 50; // ボーナススコア
                        this.updateScore();
                    }
                }
                // 裏世界でもnormal弾に当たると死ぬ（見えないけど判定はある）
                if (bullet.type === 'normal') {
                    if (dist < 5 + bullet.radius) return true;
                }
            } else {
                // 通常世界: normal弾に当たると死ぬ。bonus弾には当たらない（見えないから）
                if (bullet.type === 'normal') {
                    if (dist < 5 + bullet.radius) return true;
                }
            }
        }
        return false;
    }

    updateScore() {
        this.scoreElement.innerText = 'Score: ' + this.score;
    }

    restart() {
        this.player = new Player(this);
        this.bullets = [];
        this.enemies = [];
        this.enemyTimer = 0;
        this.enemyInterval = 1000;
        this.score = 0;
        this.isShadowMode = false;
        this.gameOver = false;
        this.updateScore();
    }

    draw(ctx) {
        // 1. 白背景で塗りつぶし（基本）
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. 通常弾の描画 (裏世界モード中でも描画するが、後から黒で上書きされる)
        this.bullets.forEach(bullet => {
            if (bullet.type === 'normal') bullet.draw(ctx);
        });

        // 3. 裏世界モードのエフェクト描画
        if (this.isShadowMode) {
            ctx.save();
            // プレイヤーを中心に円形のクリップ領域を作成
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, 150, 0, Math.PI * 2); // 半径150の視界
            ctx.clip();

            // クリップ領域内を黒く塗りつぶし
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, this.width, this.height);

            // クリップ領域内にボーナス弾を描画
            this.bullets.forEach(bullet => {
                if (bullet.type === 'bonus') bullet.draw(ctx);
            });

            ctx.restore();
        }

        // 4. プレイヤー弾（常に見える）
        this.bullets.forEach(bullet => {
            if (bullet.type === 'player') bullet.draw(ctx);
        });

        // 5. プレイヤーと敵を描画
        this.player.draw(ctx);
        this.enemies.forEach(enemy => enemy.draw(ctx));

        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = 'white';
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', this.width / 2, this.height / 2);
            ctx.font = '20px Arial';
            ctx.fillText('Press J to Restart', this.width / 2, this.height / 2 + 40);
        }
    }
}

// ゲームの開始
window.addEventListener('load', function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 800;

    const game = new Game(canvas.width, canvas.height);
    let lastTime = 0;

    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;

        game.update(deltaTime);
        game.draw(ctx);

        requestAnimationFrame(animate);
    }

    animate(0);
});
