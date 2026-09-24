import * as THREE from "three";
import { generateLevel, type GeneratedLevel } from "./generate";
import { Input } from "./input";
import { Player } from "./player";
import {
  curseRerollAllowance,
  enemyRerollAllowance,
  findStub,
  mulberry32,
  rollOffers,
  shopsForLevel,
  type Difficulty,
  type Offer,
  type ShopKind,
} from "./shops";
import { World } from "./world";

const CAMERA_OFFSET = new THREE.Vector3(0, 18, 14);

type Stacks = Record<string, number>;

type Run = {
  difficulty: Difficulty;
  level: number;
  gold: number;
  seed: number;
  upgrades: Stacks;
  curses: Stacks;
  greater: Stacks;
  enemies: Stacks;
  lastEnemy: string | null;
  enemyRerollsSpent: number;
  curseRerollsSpent: number;
};

type Mode = "menu" | "shop" | "play";

const SHOP_COPY: Record<ShopKind, { title: string; border: string; note: string }> = {
  enemy: {
    title: "Adversaries",
    border: "#ae1313",
    note: "Choose one. It stays for the run, but does nothing yet.",
  },
  curse: {
    title: "Curses",
    border: "#ff00ef",
    note: "Choose one. A selection is required. Effects are stubs.",
  },
  upgrade: {
    title: "Upgrades",
    border: "#00c8ff",
    note: "Buy with Golden Gifts, or continue. The middle pedestal skips.",
  },
  greater: {
    title: "Greater Curse",
    border: "#ff00ef",
    note: "A greater curse replaces the normal curse shop. Effects are stubs.",
  },
};

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly input = new Input();
  private readonly world: World;
  private readonly player: Player;
  private readonly glow: THREE.PointLight;
  private readonly lookTarget = new THREE.Vector3();
  private readonly wish = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly overlay: HTMLElement;
  private readonly hud: HTMLElement;
  private last = 0;
  private time = 0;
  private snapCamera = true;
  private mode: Mode = "menu";
  private run: Run | null = null;
  private shopQueue: ShopKind[] = [];
  private shopIndex = 0;
  private offers: Offer[] = [];
  private upgradeBan: string[] = [];
  private rng: () => number = Math.random;
  private level: GeneratedLevel | null = null;
  private giftsLeft = 0;
  private collapse = false;
  private beaconArmed = false;
  private collapseTime = 0;
  private goldSpots: { x: number; y: number; z: number }[] = [];

  constructor(canvas: HTMLCanvasElement, overlay: HTMLElement, hud: HTMLElement) {
    this.overlay = overlay;
    this.hud = hud;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.background = new THREE.Color(0x100814);
    this.scene.fog = new THREE.FogExp2(0x100814, 0.016);

    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 220);
    this.scene.add(new THREE.HemisphereLight(0xc7b4ff, 0x1a1024, 0.7));
    const key = new THREE.DirectionalLight(0xfff1dd, 1.45);
    key.position.set(-14, 26, 12);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x7a5cff, 0.4);
    fill.position.set(12, 8, -14);
    this.scene.add(fill);
    this.glow = new THREE.PointLight(0xff8ad4, 3.2, 16, 2);
    this.scene.add(this.glow);

    this.world = new World(this.scene);
    this.world.loadPreview(3);
    this.player = new Player(this.scene, { x: 0, y: 0, z: 0 });
    this.camera.position.set(0, CAMERA_OFFSET.y, CAMERA_OFFSET.z);
    this.camera.lookAt(0, 1.1, 0);

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    overlay.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest("button");
      if (!button) return;
      this.onUi(button.dataset.action ?? "", button.dataset.id ?? "");
    });
    this.renderMenu();
    document.body.classList.add("in-menu");
  }

  frame(now: number): void {
    if (this.last === 0) this.last = now;
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.time += dt;

    const position = this.player.position;
    const desired = new THREE.Vector3(position.x, position.y, position.z).add(CAMERA_OFFSET);
    if (this.snapCamera) {
      this.camera.position.copy(desired);
      this.snapCamera = false;
    } else {
      this.camera.position.lerp(desired, 1 - Math.pow(0.0008, dt));
    }
    this.lookTarget.set(position.x, position.y + 1.1, position.z);
    this.camera.lookAt(this.lookTarget);

    if (this.mode === "play" && this.run && this.level) this.play(dt);
    this.world.update(this.time, this.camera);
    this.glow.position.set(position.x, position.y + 1.6, position.z);
    this.renderer.render(this.scene, this.camera);
  }

  private play(dt: number): void {
    const run = this.run;
    const level = this.level;
    if (!run || !level) return;

    this.camera.updateMatrixWorld();
    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-6) this.forward.set(0, 0, -1);
    this.forward.normalize();
    this.right.crossVectors(this.forward, this.camera.up).normalize();
    const axis = this.input.axis();
    this.wish.copy(this.right).multiplyScalar(axis.x).addScaledVector(this.forward, axis.y);

    this.player.update(
      dt,
      this.world.solids,
      this.camera,
      this.wish.x,
      this.wish.z,
      this.input.consumeJump(),
      this.input.jumpHeld,
      axis.x,
      level.spawn,
    );

    const feet = this.player.position;
    const pickup = this.world.pickupAt(feet.x, feet.z, 1.15);
    if (pickup && Math.abs(feet.y - pickup.y) < 2.2) {
      if (pickup.kind === "gift") {
        this.world.takePickup(pickup.id);
        this.giftsLeft -= 1;
        this.goldSpots.push({ x: pickup.x, y: pickup.y, z: pickup.z });
        if (this.giftsLeft <= 0) this.beginCollapse(run);
      } else {
        this.world.takePickup(pickup.id);
        this.player.respawn(level.spawn);
      }
    }

    if (this.collapse) {
      run.gold += this.world.takeGold(feet.x, feet.z, 1.15);
      if (!this.world.onBeacon(feet.x, feet.z)) this.beaconArmed = true;
      this.collapseTime += dt;
      const interval = Math.max(0.38, 1.55 - (run.level - 1) * 0.045);
      const rank = Math.floor(this.collapseTime / interval);
      this.world.fallTiles(rank);
      if (this.beaconArmed && this.world.onBeacon(feet.x, feet.z)) {
        this.finishLevel();
        return;
      }
    }
    this.renderHud(run);
  }

  private beginCollapse(run: Run): void {
    this.collapse = true;
    this.beaconArmed = !this.world.onBeacon(this.player.position.x, this.player.position.z);
    const value = run.difficulty === "casual" ? 2 : 1;
    this.world.spawnGold(this.goldSpots, value);
  }

  private finishLevel(): void {
    if (!this.run) return;
    this.run.level += 1;
    this.openLevel();
  }

  private onUi(action: string, id: string): void {
    if (action === "start") {
      this.startRun(id as Difficulty);
      return;
    }
    if (action === "menu") {
      this.mode = "menu";
      this.run = null;
      this.hud.innerHTML = "";
      document.body.classList.add("in-menu");
      this.renderMenu();
      return;
    }
    if (!this.run || this.mode !== "shop") return;
    if (action === "reroll") this.reroll();
    if (action === "continue") this.advanceShop();
    if (action === "pick") this.pick(id);
  }

  private startRun(difficulty: Difficulty): void {
    const upgrades: Stacks = difficulty === "casual" ? { GraceWings: 1, Orb: 1 } : {};
    this.run = {
      difficulty,
      level: 1,
      gold: 0,
      seed: (Math.random() * 1_000_000_000) | 0,
      upgrades,
      curses: {},
      greater: {},
      enemies: {},
      lastEnemy: null,
      enemyRerollsSpent: 0,
      curseRerollsSpent: 0,
    };
    this.openLevel();
  }

  private openLevel(): void {
    const run = this.run;
    if (!run) return;
    this.shopQueue = shopsForLevel(run.level, run.difficulty);
    this.shopIndex = 0;
    this.rng = mulberry32(run.seed + run.level * 997);
    this.showShop();
  }

  private showShop(): void {
    const run = this.run;
    if (!run) return;
    while (this.shopIndex < this.shopQueue.length) {
      const kind = this.shopQueue[this.shopIndex];
      this.upgradeBan = [];
      const ban = kind === "enemy" && run.lastEnemy ? [run.lastEnemy] : [];
      this.offers = rollOffers(kind, run.level, run.difficulty, this.owned(kind), ban, this.rng);
      if (this.offers.length > 0) {
        this.mode = "shop";
        document.body.classList.add("in-menu");
        this.renderShop();
        return;
      }
      this.shopIndex += 1;
    }
    this.startPlay();
  }

  private owned(kind: ShopKind): Stacks {
    const run = this.run;
    if (!run) return {};
    if (kind === "enemy") return run.enemies;
    if (kind === "curse") return run.curses;
    if (kind === "greater") return run.greater;
    return run.upgrades;
  }

  private reroll(): void {
    const run = this.run;
    if (!run) return;
    const kind = this.shopQueue[this.shopIndex];
    if (!kind || this.offers.length === 0) return;
    if (kind === "upgrade") {
      this.upgradeBan.push(...this.offers.map((offer) => offer.id));
      this.offers = rollOffers(kind, run.level, run.difficulty, run.upgrades, this.upgradeBan, this.rng);
      if (this.offers.length === 0) {
        this.advanceShop();
        return;
      }
      this.renderShop();
      return;
    }
    const spent = kind === "enemy" ? run.enemyRerollsSpent : run.curseRerollsSpent;
    const allowance = kind === "enemy"
      ? enemyRerollAllowance(run.level, run.difficulty)
      : curseRerollAllowance(run.level, run.difficulty);
    if (spent >= allowance) return;
    if (kind === "enemy") run.enemyRerollsSpent += 1;
    else run.curseRerollsSpent += 1;
    const ban = [
      ...(kind === "enemy" && run.lastEnemy ? [run.lastEnemy] : []),
      ...this.offers.map((offer) => offer.id),
    ];
    const next = rollOffers(kind, run.level, run.difficulty, this.owned(kind), ban, this.rng);
    if (next.length > 0) this.offers = next;
    this.renderShop();
  }

  private pick(id: string): void {
    const run = this.run;
    if (!run) return;
    const kind = this.shopQueue[this.shopIndex];
    const offer = this.offers.find((entry) => entry.id === id);
    if (!kind || !offer) return;
    if (kind === "upgrade") {
      if (offer.price === null || run.gold < offer.price) return;
      run.gold -= offer.price;
    }
    const stacks = this.owned(kind);
    stacks[id] = (stacks[id] ?? 0) + 1;
    if (kind === "enemy") run.lastEnemy = id;
    this.advanceShop();
  }

  private advanceShop(): void {
    this.shopIndex += 1;
    this.showShop();
  }

  private startPlay(): void {
    const run = this.run;
    if (!run) return;
    this.level = generateLevel(run.level, run.difficulty, mulberry32(run.seed + run.level * 131));
    this.world.load(this.level);
    const names = Object.entries(run.enemies).flatMap(([id, count]) => {
      const stub = findStub("enemy", id);
      return Array.from({ length: count }, () => stub?.name ?? id);
    });
    this.world.setAdversaries(names);
    this.player.respawn(this.level.spawn);
    this.snapCamera = true;
    this.giftsLeft = this.level.giftCount;
    this.collapse = false;
    this.beaconArmed = false;
    this.collapseTime = 0;
    this.goldSpots = [];
    this.mode = "play";
    this.overlay.innerHTML = "";
    this.overlay.className = "";
    document.body.classList.remove("in-menu");
    this.renderHud(run);
  }

  private renderMenu(): void {
    this.overlay.className = "screen";
    this.overlay.innerHTML = `
      <section class="panel">
        <p class="kicker">Nullscape-style run</p>
        <h1>Choose a difficulty</h1>
        <p class="lede">Collect every black gift. That starts the collapse, turns them into Golden Gifts, and opens the beacon. Step back onto the gold platform to leave.</p>
        <div class="choices">
          <button data-action="start" data-id="casual">
            <strong>Casual</strong>
            <span>Starts with Grace Wings and Orb. Curses every 3 levels. No tripmines. Golden Gifts are worth double. Seamines wait until level 15.</span>
          </button>
          <button data-action="start" data-id="normal">
            <strong>Normal</strong>
            <span>Adversaries on level 1 and even levels. Curses on even levels until greater curses take over. Tripmines from level 5. Ice tiles from level 8.</span>
          </button>
          <button data-action="start" data-id="extreme">
            <strong>Extreme</strong>
            <span>Curses almost every level. Tripmines from level 3. Ice from level 5. More rerolls, and late upgrades cost more. Solo adversary picks still follow Normal.</span>
          </button>
        </div>
      </section>`;
  }

  private renderShop(): void {
    const run = this.run;
    const kind = this.shopQueue[this.shopIndex];
    if (!run || !kind) return;
    const copy = SHOP_COPY[kind];
    const rerolls = this.rerollLabel(kind, run);
    const cards = this.offers
      .map((offer) => {
        const price = offer.price === null ? "" : `<em>${offer.price} gold</em>`;
        const disabled = offer.price !== null && run.gold < offer.price ? "disabled" : "";
        return `<button class="pedestal" style="--border:${copy.border}" data-action="pick" data-id="${offer.id}" ${disabled}>
          <strong>${escapeHtml(offer.name)}</strong>
          ${price}
          <span>${escapeHtml(offer.blurb)}</span>
        </button>`;
      })
      .join("");
    this.overlay.className = "screen";
    this.overlay.innerHTML = `
      <section class="panel shop">
        <p class="kicker">Level ${run.level} · ${run.difficulty} · ${run.gold} golden gifts</p>
        <h1>${copy.title}</h1>
        <p class="lede">${copy.note}</p>
        <div class="choices">${kind === "upgrade" ? upgradeRow(this.offers, run.gold, copy.border) : cards}</div>
        <div class="shop-actions">
          <button data-action="reroll" ${rerolls.disabled ? "disabled" : ""}>${rerolls.label}</button>
          <button data-action="menu">Abandon run</button>
        </div>
      </section>`;
  }

  private rerollLabel(kind: ShopKind, run: Run): { label: string; disabled: boolean } {
    if (kind === "upgrade") return { label: "Reroll", disabled: false };
    const spent = kind === "enemy" ? run.enemyRerollsSpent : run.curseRerollsSpent;
    const allowance = kind === "enemy"
      ? enemyRerollAllowance(run.level, run.difficulty)
      : curseRerollAllowance(run.level, run.difficulty);
    const left = allowance - spent;
    return { label: `Reroll (${left})`, disabled: left <= 0 };
  }

  private renderHud(run: Run): void {
    const phase = this.collapse ? "Collapse — return to the beacon" : `Gifts ${this.giftsLeft}`;
    const owned = summarize(run);
    this.hud.innerHTML = `
      <div class="hud-card">
        <strong>Level ${run.level}</strong>
        <span>${run.difficulty}</span>
        <span>${phase}</span>
        <span>${run.gold} golden gifts</span>
      </div>
      <p class="hud-owned">${owned}</p>`;
  }
}

function upgradeRow(offers: Offer[], gold: number, border: string): string {
  const card = (offer: Offer | undefined) => {
    if (!offer) return `<div class="pedestal empty" style="--border:${border}"></div>`;
    const disabled = offer.price !== null && gold < offer.price ? "disabled" : "";
    return `<button class="pedestal" style="--border:${border}" data-action="pick" data-id="${offer.id}" ${disabled}>
      <strong>${escapeHtml(offer.name)}</strong>
      <em>${offer.price ?? 0} gold</em>
      <span>${escapeHtml(offer.blurb)}</span>
    </button>`;
  };
  return `${card(offers[0])}<button class="pedestal continue" data-action="continue"><strong>Continue</strong><span>Skip this shop.</span></button>${card(offers[1])}`;
}

function summarize(run: Run): string {
  const parts = [
    listNames("Upgrades", run.upgrades, "upgrade"),
    listNames("Curses", run.curses, "curse"),
    listNames("Greater", run.greater, "greater"),
    listNames("Adversaries", run.enemies, "enemy"),
  ].filter(Boolean);
  return parts.join(" · ") || "No stubs yet";
}

function listNames(label: string, stacks: Stacks, kind: ShopKind): string {
  const names = Object.entries(stacks).map(([id, count]) => {
    const name = findStub(kind, id)?.name ?? id;
    return count > 1 ? `${name} ×${count}` : name;
  });
  return names.length ? `${label}: ${names.join(", ")}` : "";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
