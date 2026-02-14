import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GameLoop } from './GameLoop.js';
import { audioManager } from './AudioManager.js';
import './style.css';

console.log("Main.js: Script loading...");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000510);
scene.fog = new THREE.FogExp2(0x000510, 0.005);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 0);
// FPSスタイルのカメラ回転 - ロール（傾き）を防止するためYXZ順序を使用
camera.rotation.order = 'YXZ';

const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

const renderer = new THREE.WebGLRenderer({ antialias: !isTouchDevice });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
const gameLoop = new GameLoop(scene, camera);

// モバイルデバイス時：レーダーをモバイルラッパーに移動
if (isTouchDevice) {
  const radarContainer = document.getElementById('radar-container');
  const mobileRadarWrapper = document.getElementById('mobile-radar-wrapper');
  if (radarContainer && mobileRadarWrapper) {
    // レーダーキャンバスをモバイルラッパーに移動
    const radarCanvas = radarContainer.querySelector('canvas');
    if (radarCanvas) {
      mobileRadarWrapper.appendChild(radarCanvas);
      radarCanvas.style.width = '100%';
      radarCanvas.style.height = '100%';
      radarCanvas.style.borderRadius = '50%';
    }
  }
}

const btnMissile = document.getElementById('btn-missile');
const btnAircraft = document.getElementById('btn-aircraft');

const handleStart = (mode) => {
  // オーバーレイが開いたままなら閉じる
  const infoOverlay = document.getElementById('info-overlay');
  if (infoOverlay && !infoOverlay.classList.contains('hidden')) {
    infoOverlay.classList.add('hidden');
  }

  console.log(`Main: Starting game in ${mode} mode`);
  // 必ずゲームを開始状態にする
  gameLoop.startGame(mode);
  // 音声システム初期化
  audioManager.init();

  // タッチデバイスならポインターロックせずに開始
  if (isTouchDevice) {
    console.log('Main: Touch device detected, bypassing pointer lock');
    gameLoop.isPlaying = true;

    // UIを隠す
    const messageOverlay = document.getElementById('message-overlay');
    if (messageOverlay) messageOverlay.classList.add('hidden');
    // 縦画面警告をゲーム中のみ表示するためのクラス切替
    document.getElementById('ui-layer')?.classList.add('playing');
    audioManager.resume();
  } else {
    // PCならポインターロックを要求
    document.getElementById('ui-layer')?.classList.add('playing');
    controls.lock();
  }
};

if (btnMissile) {
  btnMissile.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log("Missile button clicked");
    handleStart('missile');
  });
}

if (btnAircraft) {
  btnAircraft.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log("Aircraft button clicked");
    handleStart('aircraft');
  });
}

// ------ Mission Info Logic Start ------
const btnInfo = document.getElementById('btn-info');
const infoOverlay = document.getElementById('info-overlay');
const btnCloseInfo = document.getElementById('btn-close-info');
const tabBtns = document.querySelectorAll('.tab-btn');
const infoSections = document.querySelectorAll('.info-section');

if (btnInfo && infoOverlay) {
  btnInfo.addEventListener('click', (e) => {
    e.stopPropagation();
    infoOverlay.classList.remove('hidden');
  });
}

if (btnCloseInfo && infoOverlay) {
  btnCloseInfo.addEventListener('click', (e) => {
    e.stopPropagation();
    infoOverlay.classList.add('hidden');
  });
}

// Tab Switching Logic
tabBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Reset Active States
    tabBtns.forEach(b => b.classList.remove('active'));
    infoSections.forEach(s => s.classList.remove('active'));

    // Set Active State
    btn.classList.add('active');
    const targetId = btn.getAttribute('data-target');
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      targetSection.classList.add('active');
    }
  });
});
// ------ Mission Info Logic End ------

const pauseOverlay = document.getElementById('pause-overlay');
const btnResume = document.getElementById('btn-resume');

// 状態管理を明確化
controls.addEventListener('lock', () => {
  console.log('Main: Pointer Locked - Hiding pause overlay and resuming game');
  if (pauseOverlay) pauseOverlay.classList.add('hidden');
  audioManager.resume();

  // スタート画面が出ていない時のみ、isPlaying を true に戻す
  const messageOverlay = document.getElementById('message-overlay');
  const isStartScreenVisible = messageOverlay && !messageOverlay.classList.contains('hidden');

  if (!isStartScreenVisible) {
    gameLoop.isPlaying = true;
  }
});

controls.addEventListener('unlock', () => {
  console.log('Main: Pointer Unlocked');
  // ゲーム中に（ESC等で）アンロックされた場合のみポーズ画面を出す
  if (gameLoop.isPlaying) {
    console.log('Main: Game was playing, triggering pause');
    gameLoop.isPlaying = false;
    if (pauseOverlay) pauseOverlay.classList.remove('hidden');
  }
});

if (btnResume) {
  const resumeAction = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    console.log("Main: Resume requested - Requesting pointer lock");

    // UIを先に消して状態をセット（即時性を高める）
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    gameLoop.isPlaying = true;

    if (!isTouchDevice) {
      // ポインターロックの再要求
      controls.lock();
    } else {
      audioManager.resume();
    }
  };

  btnResume.addEventListener('click', resumeAction);

  // オーバーレイ全体をクリックしても復帰できるようにする（予備）
  if (pauseOverlay) {
    pauseOverlay.addEventListener('click', (e) => {
      // ボタン以外の場所（背景など）をクリックした場合でも復帰
      if (e.target === pauseOverlay) {
        resumeAction(e);
      }
    });
  }
}

const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 50, 50);
scene.add(dirLight);

const gridHelper = new THREE.GridHelper(2000, 100, 0x004400, 0x002200);
scene.add(gridHelper);

const groundGeo = new THREE.PlaneGeometry(2000, 2000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x050a05, roughness: 0.8 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const turretGeo = new THREE.BoxGeometry(2, 2, 2);
const turretMat = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
const turret = new THREE.Mesh(turretGeo, turretMat);
turret.position.set(0, -0.5, 0);
scene.add(turret);

// 連続射撃のステート管理
window.addEventListener('mousedown', (e) => {
  if (controls.isLocked && gameLoop.isPlaying) {
    if (gameLoop.weaponType === 'missile') {
      gameLoop.fireMissiles();
    } else {
      gameLoop.setFiring(true);
    }
  }
});

window.addEventListener('mouseup', () => {
  gameLoop.setFiring(false);
});

const handleResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};
window.addEventListener('resize', handleResize);
// 画面回転時のリサイズ対応
window.addEventListener('orientationchange', () => {
  setTimeout(handleResize, 100);
});

const clock = new THREE.Clock();
// --- Mobile Touch Controls ---
// isTouchDevice は上部で既に定義されている
let touchStartX = 0;
let touchStartY = 0;
let isTouchMoving = false;
let lastTouchTime = 0;

// タッチ感度設定（値が大きいほど敏感）
const touchSensitivity = 0.4; // 少ない指の動きで大きく照準が動く
const touchDeadzone = 2; // デッドゾーンも少し小さくして反応性向上

// タッチによるエイミング用の変数
let touchId = null; // アクティブなタッチのID

window.addEventListener('touchstart', (e) => {
  // すでにタッチ中の場合や、UIボタン上のタッチは除外
  if (touchId !== null) return;

  const touch = e.touches[0];
  const target = e.target;

  // モバイルコントロールボタン上のタッチは無視
  if (target.closest('#mobile-controls') ||
    target.closest('#mobile-fire-btn') ||
    target.closest('#mobile-weapon-switch') ||
    target.closest('.weapon') ||
    target.closest('#mode-selection') ||
    target.closest('#message-overlay') ||
    target.closest('#pause-overlay') ||
    target.closest('#info-overlay')) {
    return;
  }

  // ブラウザデフォルト動作（ズーム・スクロール等）を防止
  e.preventDefault();

  touchId = touch.identifier;
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  isTouchMoving = false;
  lastTouchTime = Date.now();
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (!gameLoop.isPlaying) return;

  // 対象のタッチを探す
  let touch = null;
  for (let i = 0; i < e.touches.length; i++) {
    if (e.touches[i].identifier === touchId) {
      touch = e.touches[i];
      break;
    }
  }

  if (!touch) return;

  e.preventDefault(); // スクロール防止

  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  // デッドゾーン内なら動かさない
  if (Math.abs(dx) < touchDeadzone && Math.abs(dy) < touchDeadzone) {
    return;
  }

  isTouchMoving = true;

  // 画面サイズに応じた感度調整（小さい画面ほど感度を上げる）
  const screenFactor = Math.min(window.innerWidth, window.innerHeight) / 400;
  const adjustedSensitivity = touchSensitivity / Math.max(screenFactor, 0.5);

  // 直感的な操作：指を動かした方向にカメラが向く
  // 水平方向（左右）- 指を右に動かすと右を向く
  camera.rotation.y -= dx * adjustedSensitivity * (Math.PI / 180);

  // 垂直方向（上下）- 指を上に動かすと上を向く
  const newPitch = camera.rotation.x - dy * adjustedSensitivity * (Math.PI / 180);
  // 上下の回転制限（真上/真下の少し手前まで）
  camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, newPitch));

  // ロール（傾き）を常に0に固定
  camera.rotation.z = 0;

  // 次のフレームの基準点を更新
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: false });

window.addEventListener('touchend', (e) => {
  // 対象のタッチが終了したか確認
  let found = false;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === touchId) {
      found = true;
      break;
    }
  }

  if (!found) return;

  const tapDuration = Date.now() - lastTouchTime;

  // 移動量が少なく、タップ時間が短ければタップ（発射）とみなす
  if (gameLoop.isPlaying && !isTouchMoving && tapDuration < 300) {
    if (gameLoop.weaponType === 'missile') {
      gameLoop.fireMissiles();
    } else {
      gameLoop.setFiring(true);
      setTimeout(() => gameLoop.setFiring(false), 150);
    }
  }

  touchId = null;
});

window.addEventListener('touchcancel', () => {
  touchId = null;
});

// 武器アイコンのタッチ切り替え対応
['weapon-vulcan', 'weapon-missile', 'weapon-laser'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    // clickイベントはタッチでも発生するが、反応を確実にする
    el.addEventListener('click', (e) => {
      // ゲームプレイ中なら
      if (gameLoop.isPlaying) {
        e.stopPropagation(); // 発射の発火を防ぐ
        const type = id.replace('weapon-', '');
        gameLoop.switchWeapon(type);
        updateMobileWeaponUI(type);
      }
    });
  }
});

// --- Mobile Fire Button & Weapon Switch ---
const mobileFireBtn = document.getElementById('mobile-fire-btn');
const mobileWeaponBtns = document.querySelectorAll('.mobile-weapon-btn');
let mobileFireInterval = null;

// モバイル武器UIの更新
function updateMobileWeaponUI(type) {
  mobileWeaponBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.weapon === type) {
      btn.classList.add('active');
    }
  });
  // 既存のweapon-displayも同期
  document.querySelectorAll('.weapon').forEach(el => {
    el.classList.remove('active');
  });
  const activeWeapon = document.getElementById(`weapon-${type}`);
  if (activeWeapon) activeWeapon.classList.add('active');
}

// モバイル発射ボタン
if (mobileFireBtn) {
  // 長押しで連続射撃
  mobileFireBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (gameLoop.isPlaying) {
      if (gameLoop.weaponType === 'missile') {
        // ミサイルはタップごとに発射
        gameLoop.fireMissiles();
      } else {
        // バルカン/レーザーは長押しで連続発射
        gameLoop.setFiring(true);
        // フィードバックとして発射状態を維持
        mobileFireInterval = setInterval(() => {
          if (!gameLoop.isPlaying) {
            clearInterval(mobileFireInterval);
            gameLoop.setFiring(false);
          }
        }, 100);
      }
    }
  }, { passive: false });

  mobileFireBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    gameLoop.setFiring(false);
    if (mobileFireInterval) {
      clearInterval(mobileFireInterval);
      mobileFireInterval = null;
    }
  }, { passive: false });

  mobileFireBtn.addEventListener('touchcancel', () => {
    gameLoop.setFiring(false);
    if (mobileFireInterval) {
      clearInterval(mobileFireInterval);
      mobileFireInterval = null;
    }
  });
}

// モバイル武器切替ボタン
mobileWeaponBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (gameLoop.isPlaying) {
      const type = btn.dataset.weapon;
      gameLoop.switchWeapon(type);
      updateMobileWeaponUI(type);
    }
  });
});

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  gameLoop.update(dt);
  renderer.render(scene, camera);
}
animate();
