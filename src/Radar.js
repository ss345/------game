import * as THREE from 'three';

export class Radar {
    constructor(containerId, gameLoop) {
        this.gameLoop = gameLoop;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'radar-canvas';
        this.ctx = this.canvas.getContext('2d');

        this.size = 200;
        this.canvas.width = this.size;
        this.canvas.height = this.size;

        this.container = document.getElementById(containerId);
        this.container.appendChild(this.canvas);

        this.range = 300; // スポーン距離250mに合わせて、レーダー範囲を300mに拡張
        this._lookDir = new THREE.Vector3(); // フリーズ防止：計算用ベクトルを再利用するように事前定義
    }

    update() {
        this.ctx.clearRect(0, 0, this.size, this.size);

        // 背景（円）
        this.ctx.beginPath();
        this.ctx.arc(this.size / 2, this.size / 2, this.size / 2 - 2, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 40, 0, 0.5)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#0f0';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // グリッド線
        this.ctx.beginPath();
        this.ctx.moveTo(this.size / 2, 0);
        this.ctx.lineTo(this.size / 2, this.size);
        this.ctx.moveTo(0, this.size / 2);
        this.ctx.lineTo(this.size, this.size / 2);
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        this.ctx.stroke();

        // プレイヤーの向き（視覚的なFOVコーン）
        // カメラのワールド方向を取得
        this.gameLoop.camera.getWorldDirection(this._lookDir);

        // XZ平面上での角度を計算（-Zが上、+Xが右にマッピングされるように atan2(z, x) を使用）
        const heading = Math.atan2(this._lookDir.z, this._lookDir.x);
        const fov = 1.0;

        this.ctx.save();
        this.ctx.translate(this.size / 2, this.size / 2);

        // 視界範囲（扇形）
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        // Canvasの角度系 (0は右、PI/2は下) にそのまま適合
        this.ctx.arc(0, 0, this.size / 2 - 2, heading - fov / 2, heading + fov / 2);
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
        this.ctx.fill();

        // 視界の境界線
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        this.ctx.restore();

        // 敵の表示（回転コンテキスト内ではなく、絶対座標から回転させてプロット）
        this.ctx.save();
        this.ctx.translate(this.size / 2, this.size / 2);
        // 敵のプロット自体は rotationY に影響されない絶対座標系（XZ）で行う
        // ただし、もしレーダー自体を回転させるならここで rotate(-rotationY) するが、
        // 現状の実装は固定方位（北が上）と思われるので、視界コーンだけ回す。

        // 敵の表示
        this.gameLoop.enemies.forEach(enemy => {
            const pos = enemy.mesh.position;
            const dx = pos.x;
            const dz = pos.z;
            const dy = pos.y; // 高度

            // 自分（0,0,0）からの相対距離
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < this.range) {
                const scale = (this.size / 2) / this.range;
                // レコーダーのY軸（画面上の垂直）はワールドのZ軸（奥行き）に対応
                // キャンバスは下方向が+Yなので、-dz を使うことで「上が北（-Z）」になるようにマッピング
                const rx = dx * scale;
                const rz = dz * scale;

                // 高度に応じて色を変える (赤: 高い, 青: 低い)
                const heightFactor = Math.min(1, dy / 50);
                this.ctx.fillStyle = `rgb(${Math.floor(255 * heightFactor)}, ${Math.floor(255 * (1 - heightFactor))}, 255)`;

                this.ctx.beginPath();
                this.ctx.arc(rx, rz, 3, 0, Math.PI * 2);
                this.ctx.fill();

                // 敵がミサイルや爆撃機なら枠をつける
                if (enemy.type === 'missile' || enemy.type === 'bomber') {
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
        });

        this.ctx.restore();

        // 中央（自分）
        this.ctx.fillStyle = '#ff0';
        this.ctx.beginPath();
        this.ctx.arc(this.size / 2, this.size / 2, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }
}
