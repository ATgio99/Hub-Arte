// ============================================================================
// Cattedrale 3D — V4 "Cattedrale monumentale + materializzazione visibile".
//
// Rispetto alla V3: NIENTE pietre-pagina, NIENTE esplosione. La cattedrale è
// scenografia pura, ricostruita PROCEDURALMENTE fedele alla silhouette dello
// screenshot di riferimento (croce latina molto sviluppata in lunghezza):
//   · TORRE FRONTALE con GUGLIA TRAFORATA (lattice) + pinnacoli angolari
//   · 2 GUGLIE MINORI gemelle al transetto
//   · NAVATA lunga con CONTRAFFORTI + ARCHI RAMPANTI + pinnacoli
//   · TETTO A FALDE in TEGOLE ROSSE (PBR terracotta) con cresta
//   · ROSONE + portale strombato sulla facciata, FINESTRE OGIVALI emissive
//
// MATERIALIZZAZIONE (cuore della richiesta): dissolvenza progressiva guidata
// dallo scroll, DAL BASSO VERSO L'ALTO. Shader: soglia su world-Y (uReveal) +
// FRONTE D'ONDA dorato luminoso sulla fascia di transizione. Il wireframe
// blueprint svanisce nella stessa fascia man mano che la pietra emerge.
// Le finestre ogivali si accendono via via. Camera: blueprint dall'alto →
// discesa in vista 3/4 della facciata (come lo screenshot). NIENTE esplosione.
// three.js puro. EffectComposer + UnrealBloomPass (solo emissive) + vignette.
// ============================================================================
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// ---- Palette atmosfera (carta calda / ambra / oro che trapela) -------------
const FOG_COLOR = 0xe8d9bf;
const SKY_TOP = 0xeadcc4;
const SKY_BOT = 0xcdb38a;
const GOLD_EMISSIVE = 0xffb347; // luce dorata / fronte d'onda
const WINDOW_EMISSIVE = 0xffcf7a; // finestre calde
const SUN_COLOR = 0xfff0d4;
const ROOF_RED = 0xb24a28; // tinta tetto (fallback / tint)

const PR_CAP = 1.5;

// Estensione verticale dell'edificio (per mappare lo scroll alla soglia Y).
// La materializzazione va da Y_MIN (base, terreno) a Y_MAX (punta guglia).
const Y_MIN = -2.2;
const Y_MAX = 34.0; // punta della guglia traforata

// ---- util ------------------------------------------------------------------
const damp = (cur: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.damp(cur, target, lambda, dt);
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp01 = (x: number) => THREE.MathUtils.clamp(x, 0, 1);
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

// ============================================================================
// Callbacks
// ============================================================================
export interface CathedralCallbacks {
  onReady?: () => void;
  onProgress?: (p: number) => void; // 0..1 caricamento texture reale
  onPhase?: (phase: number) => void; // 1..3 (arrivo / materializzazione / discesa)
  onReveal?: (r: number) => void; // 0..1 quanto è materializzato (per HUD)
}

// ============================================================================
// Scene controller
// ============================================================================
export class CathedralScene {
  private host: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private bloom!: UnrealBloomPass;
  private vignettePass!: ShaderPass;

  private cb: CathedralCallbacks;
  private reduced: boolean;
  private mobile: boolean;

  private raf = 0;
  private clock = new THREE.Clock();
  private destroyed = false;
  private ready = false;

  // gruppi scena
  private wire = new THREE.Group(); // blueprint wireframe (svanisce dal basso)
  private solid = new THREE.Group(); // cattedrale in pietra (emerge dal basso)
  private terrain!: THREE.Mesh;
  private innerLight!: THREE.PointLight;

  // materiali con shader di reveal (registrati per aggiornarne le uniform)
  private revealMats: THREE.Material[] = [];
  private wireRevealMats: { mat: THREE.ShaderMaterial }[] = [];
  private windowMeshes: { mesh: THREE.Object3D; mat: THREE.MeshStandardMaterial }[] = [];

  // materiali pietra condivisi
  private stoneMat!: THREE.MeshStandardMaterial;
  private roofMat!: THREE.MeshStandardMaterial;

  // uniform condivise di reveal
  private uReveal = { value: Y_MIN }; // soglia world-Y corrente
  private uBand = { value: 3.2 }; // larghezza fascia del fronte d'onda
  private uGold = { value: new THREE.Color(GOLD_EMISSIVE) };
  private uTime = { value: 0 };

  // stato animazione
  private t = 0;
  private targetT = 0;
  private parallax = new THREE.Vector2(0, 0);
  private parallaxTarget = new THREE.Vector2(0, 0);
  private _look = new THREE.Vector3();
  private phase = 1;

  private camKeys!: { pos: THREE.Vector3; look: THREE.Vector3 }[];

  constructor(host: HTMLElement, cb: CathedralCallbacks = {}, reducedMotion = false) {
    this.host = host;
    this.cb = cb;
    this.reduced = reducedMotion;
    this.mobile = (host.clientWidth || window.innerWidth) < 760;

    this.initRenderer();
    this.initScene();
    this.buildSkyAndFog();
    this.buildLights();
    this.buildCameraKeys();
    this.loadTextures();
    this.bind();
  }

  // ---- renderer + composer -------------------------------------------------
  private initRenderer() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, PR_CAP));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.mobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.host.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";

    this.camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 600);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloomStrength = this.mobile ? 0.4 : 0.8;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), bloomStrength, 0.7, 0.78);
    this.composer.addPass(this.bloom);
    this.vignettePass = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignettePass);
    this.composer.addPass(new OutputPass());
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, PR_CAP));
  }

  private initScene() {
    this.scene.add(this.wire);
    this.scene.add(this.solid);
  }

  private buildSkyAndFog() {
    this.scene.fog = new THREE.FogExp2(FOG_COLOR, 0.0085);
    const skyGeo = new THREE.SphereGeometry(300, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(SKY_TOP) }, bottom: { value: new THREE.Color(SKY_BOT) } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
        void main(){ float h = clamp((normalize(vP).y*0.5+0.5),0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.8)),1.0);} `,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.name = "sky";
    this.scene.add(sky);
  }

  private buildLights() {
    const amb = new THREE.HemisphereLight(SKY_TOP, 0x6b5a40, 0.9);
    this.scene.add(amb);
    const sun = new THREE.DirectionalLight(SUN_COLOR, 2.4);
    sun.position.set(-26, 34, 22);
    sun.castShadow = !this.mobile;
    if (sun.castShadow) {
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 160;
      const d = 48;
      const c = sun.shadow.camera as THREE.OrthographicCamera;
      c.left = -d; c.right = d; c.top = d; c.bottom = -d;
      sun.shadow.bias = -0.0005;
    }
    this.scene.add(sun);
    // controluce freddo per staccare le guglie dal cielo
    const rim = new THREE.DirectionalLight(0xbfd0e0, 0.5);
    rim.position.set(18, 12, -24);
    this.scene.add(rim);
    // luce dorata interna che "trapela"
    this.innerLight = new THREE.PointLight(GOLD_EMISSIVE, 0, 60, 1.6);
    this.innerLight.position.set(0, 5, 4);
    this.scene.add(this.innerLight);
  }

  // ---- camera keyframes ----------------------------------------------------
  // Tre chiavi: blueprint dall'alto → 3/4 lontano → 3/4 ravvicinato (come screenshot).
  private buildCameraKeys() {
    this.camKeys = [
      // 1 — ARRIVO blueprint: alto, quasi zenitale-isometrica, abbraccia tutta la pianta
      { pos: new THREE.Vector3(34, 62, 70), look: new THREE.Vector3(2, 6, -4) },
      // 2 — vista 3/4 media, la materializzazione sale dal basso
      { pos: new THREE.Vector3(46, 30, 60), look: new THREE.Vector3(2, 8, -6) },
      // 3 — DISCESA: 3/4 ravvicinato sulla facciata/torre (inquadratura screenshot)
      { pos: new THREE.Vector3(40, 17, 46), look: new THREE.Vector3(-2, 11, -8) },
    ];
    this.camera.position.copy(this.camKeys[0].pos);
    this._look.copy(this.camKeys[0].look);
    this.camera.lookAt(this._look);
  }

  // ---- caricamento texture -------------------------------------------------
  private loadTextures() {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_u, loaded, total) => { this.cb.onProgress?.(total ? loaded / total : 0); };

    const loader = new THREE.TextureLoader(manager);
    const base = (import.meta as any).env?.BASE_URL || "./";
    const url = (f: string) => `${base}textures/${f}`.replace("//textures", "/textures");

    const loaded: Record<string, THREE.Texture | null> = {};
    const tryLoad = (key: string, file: string, srgb = false) => {
      loader.load(url(file),
        (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
          loaded[key] = tex;
        }, undefined, () => { loaded[key] = null; });
    };
    tryLoad("stoneDiff", "stone_diff.jpg", true);
    tryLoad("stoneNor", "stone_nor.jpg");
    tryLoad("stoneArm", "stone_arm.jpg");
    tryLoad("terrDiff", "terrain_diff.jpg", true);
    tryLoad("terrNor", "terrain_nor.jpg");
    tryLoad("terrArm", "terrain_arm.jpg");
    tryLoad("roofDiff", "roof_diff.jpg", true);
    tryLoad("roofNor", "roof_nor.jpg");
    tryLoad("roofArm", "roof_arm.jpg");

    const finish = () => {
      this.buildStoneMaterial(loaded);
      this.buildRoofMaterial(loaded);
      this.buildTerrain(loaded);
      this.buildCathedral();
      this.buildWireframe();
      this.ready = true;
      this.cb.onReady?.();
      this.clock.start();
      this.loop();
    };
    manager.onLoad = () => { this.cb.onProgress?.(1); if (!this.ready) finish(); };
    setTimeout(() => { if (!this.ready) finish(); }, 4000);
  }

  private proceduralStone(tint = "#cdb48f"): THREE.Texture {
    const s = 256;
    const c = document.createElement("canvas"); c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = tint; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      const v = 150 + Math.random() * 90;
      ctx.fillStyle = `rgba(${v},${v - 18},${v - 50},0.06)`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ---- SHADER DI REVEAL: aggiunge soglia world-Y + fronte d'onda dorato -----
  // Applica a un MeshStandardMaterial: i frammenti con worldY > uReveal vengono
  // scartati; la fascia [uReveal-uBand, uReveal] riceve un bagliore dorato che
  // simula il fronte d'onda della materializzazione.
  private patchReveal(mat: THREE.MeshStandardMaterial) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uReveal = this.uReveal;
      shader.uniforms.uBand = this.uBand;
      shader.uniforms.uGold = this.uGold;
      shader.uniforms.uTime = this.uTime;
      shader.vertexShader =
        "varying vec3 vWorldPos;\n" +
        shader.vertexShader.replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\n  vWorldPos = (modelMatrix * vec4(transformed,1.0)).xyz;"
        );
      // alcune build non includono worldpos_vertex se non c'è shadow: forziamo
      if (!shader.vertexShader.includes("vWorldPos =")) {
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n  vWorldPos = (modelMatrix * vec4(transformed,1.0)).xyz;"
        );
      }
      shader.fragmentShader =
        "uniform float uReveal;\nuniform float uBand;\nuniform vec3 uGold;\nuniform float uTime;\nvarying vec3 vWorldPos;\n" +
        shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
           float edge = uReveal - vWorldPos.y;            // >0 sotto la soglia = materializzato
           if (edge < -0.02) discard;                      // sopra la soglia: ancora invisibile
           // fronte d'onda: bagliore dorato nella fascia appena materializzata
           float band = 1.0 - smoothstep(0.0, uBand, edge);
           band = clamp(band, 0.0, 1.0);
           float pulse = 0.78 + 0.22 * sin(uTime * 2.0 + vWorldPos.y * 0.6);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, uGold, band * 0.92 * pulse);
           gl_FragColor.rgb += uGold * band * band * 0.9 * pulse;`
        );
    };
    mat.transparent = false;
    mat.needsUpdate = true;
    this.revealMats.push(mat);
  }

  private buildStoneMaterial(loaded: Record<string, THREE.Texture | null>) {
    const diff = loaded.stoneDiff ?? this.proceduralStone();
    const mat = new THREE.MeshStandardMaterial({
      map: diff, normalMap: loaded.stoneNor ?? undefined,
      color: 0xe6dcc6, roughness: 0.93, metalness: 0.0,
    });
    if (loaded.stoneArm) { mat.aoMap = loaded.stoneArm; mat.roughnessMap = loaded.stoneArm; mat.aoMapIntensity = 0.9; }
    [diff, loaded.stoneNor, loaded.stoneArm].forEach((t) => { if (t) t.repeat.set(1, 1); });
    this.patchReveal(mat);
    this.stoneMat = mat;
  }

  private buildRoofMaterial(loaded: Record<string, THREE.Texture | null>) {
    const diff = loaded.roofDiff ?? this.proceduralStone("#b24a28");
    diff.repeat.set(3, 3);
    const mat = new THREE.MeshStandardMaterial({
      map: diff, normalMap: loaded.roofNor ?? undefined,
      color: loaded.roofDiff ? 0xffffff : ROOF_RED, roughness: 0.88, metalness: 0.0,
    });
    if (mat.normalScale) mat.normalScale.set(0.8, 0.8);
    if (loaded.roofNor) loaded.roofNor.repeat.set(3, 3);
    if (loaded.roofArm) { mat.aoMap = loaded.roofArm; mat.roughnessMap = loaded.roofArm; mat.aoMapIntensity = 0.8; loaded.roofArm.repeat.set(3, 3); }
    this.patchReveal(mat);
    this.roofMat = mat;
  }

  private buildTerrain(loaded: Record<string, THREE.Texture | null>) {
    const size = 320, segs = this.mobile ? 110 : 200;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const noise2 = (x: number, z: number) =>
      Math.sin(x * 0.05) * Math.cos(z * 0.045) * 4.0 +
      Math.sin(x * 0.12 + 1.3) * Math.cos(z * 0.1) * 1.6 +
      Math.sin(x * 0.26 + 2.1) * Math.cos(z * 0.22) * 0.6;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const d = Math.hypot(x, z);
      const flat = THREE.MathUtils.smoothstep(d, 22, 60);
      let y = noise2(x, z) * flat;
      const basin = -2.0 * Math.exp(-(d * d) / (2 * 30 * 30));
      const ridge = 10.0 * Math.exp(-Math.pow(d - 130, 2) / (2 * 40 * 40));
      y = y + basin + ridge;
      pos.setY(i, y);
    }
    geo.computeVertexNormals();
    geo.setAttribute("uv2", geo.attributes.uv.clone());

    const diff = loaded.terrDiff ?? this.proceduralStone();
    diff.repeat.set(26, 26);
    const mat = new THREE.MeshStandardMaterial({
      map: diff, normalMap: loaded.terrNor ?? undefined,
      color: 0xd8c9ad, roughness: 1.0, metalness: 0.0,
    });
    if (mat.normalScale) mat.normalScale.set(0.6, 0.6);
    if (loaded.terrNor) loaded.terrNor.repeat.set(26, 26);
    if (loaded.terrArm) { mat.aoMap = loaded.terrArm; mat.roughnessMap = loaded.terrArm; mat.aoMapIntensity = 0.7; loaded.terrArm.repeat.set(26, 26); }
    this.patchReveal(mat);
    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.position.y = -2.2;
    this.terrain.receiveShadow = !this.mobile;
    this.solid.add(this.terrain);
  }

  // ==========================================================================
  // CATTEDRALE PROCEDURALE — parti riusabili, silhouette dello screenshot.
  // Convenzione assi: navata sviluppata lungo -Z (la facciata/torre è a +Z).
  // ==========================================================================
  private buildCathedral() {
    const g = new THREE.Group();
    const stone = this.stoneMat;

    // raccolta wireframe-source: ogni parte "solida" registra anche le sue edge
    // (lo facciamo a parte in buildWireframe ricostruendo le primitive chiave).

    // ---- helper: aggiungi mesh in pietra con ombre -------------------------
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = !this.mobile;
      g.add(m);
      return m;
    };

    // ---- finestra ogivale emissiva (lancetta a sesto acuto) ----------------
    // ritorna un gruppo da posizionare; registra il materiale emissivo + Y.
    const ogival = (w: number, h: number): THREE.Mesh => {
      const shape = new THREE.Shape();
      const r = w / 2;
      shape.moveTo(-r, 0);
      shape.lineTo(-r, h - r);
      shape.quadraticCurveTo(-r, h + r * 0.3, 0, h + r * 0.7); // spiovente sinistro verso punta
      shape.quadraticCurveTo(r, h + r * 0.3, r, h - r);
      shape.lineTo(r, 0);
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1a130a, emissive: WINDOW_EMISSIVE, emissiveIntensity: 0.0,
        roughness: 0.4, metalness: 0.0, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      this.windowMeshes.push({ mesh: m, mat });
      return m;
    };
    const placeWindow = (parent: THREE.Object3D, win: THREE.Mesh, x: number, y: number, z: number, ry = 0) => {
      win.position.set(x, y, z); win.rotation.y = ry;
      parent.add(win);
    };

    // ---- GUGLIA TRAFORATA (lattice) ----------------------------------------
    // cono affusolato costruito a "costoloni" + anelli, traforato (LineSegments
    // sottili in pietra chiara) sopra un tamburo. h = altezza, r = raggio base.
    const guglia = (h: number, r: number): THREE.Group => {
      const grp = new THREE.Group();
      const ribMat = stone;
      const rings = 7;
      const ribs = 8;
      // costoloni (sottili prismi che convergono alla punta)
      for (let i = 0; i < ribs; i++) {
        const a = (i / ribs) * Math.PI * 2;
        const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
        const ribGeo = new THREE.CylinderGeometry(0.05, 0.16, h, 4);
        const m = new THREE.Mesh(ribGeo, ribMat);
        // posiziona la base sul cerchio e inclina verso l'apice (0,h,0)
        m.position.set(bx / 2, h / 2, bz / 2);
        const apex = new THREE.Vector3(0, h, 0);
        const baseP = new THREE.Vector3(bx, 0, bz);
        m.position.copy(baseP.clone().lerp(apex, 0.5));
        m.lookAt(apex);
        m.rotateX(Math.PI / 2);
        m.castShadow = !this.mobile;
        grp.add(m);
      }
      // anelli orizzontali decrescenti (traforo)
      for (let k = 1; k < rings; k++) {
        const f = k / rings;
        const rr = r * (1 - f);
        const ry = h * f;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.max(rr, 0.05), 0.05, 6, 16), ribMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = ry;
        grp.add(ring);
      }
      // punta + croce
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, h * 0.16, 6), ribMat);
      tip.position.y = h;
      grp.add(tip);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), ribMat);
      crossV.position.y = h + h * 0.16;
      grp.add(crossV);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), ribMat);
      crossH.position.y = h + h * 0.16 + 0.18;
      grp.add(crossH);
      return grp;
    };

    // ---- pinnacolo (piccola guglia piena) ----------------------------------
    const pinnacolo = (h = 2.4): THREE.Group => {
      const grp = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, h * 0.45, 0.7), stone);
      base.position.y = h * 0.225;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, h * 0.6, 4), stone);
      cone.position.y = h * 0.45 + h * 0.3;
      cone.rotation.y = Math.PI / 4;
      grp.add(base, cone);
      grp.traverse((o: any) => { if (o.isMesh) o.castShadow = !this.mobile; });
      return grp;
    };

    // ---- CONTRAFFORTE + ARCO RAMPANTE + pinnacolo --------------------------
    // pilastro esterno collegato al cleristorio da un arco rampante inclinato.
    const contrafforte = (): THREE.Group => {
      const grp = new THREE.Group();
      // pilastro contrafforte (esterno, basso e tozzo che sale)
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.0, 9, 1.4), stone);
      pier.position.set(0, 4.5, 0);
      grp.add(pier);
      // pinnacolo sopra il contrafforte
      const pin = pinnacolo(3.2); pin.position.set(0, 9, 0); grp.add(pin);
      // arco rampante: barra inclinata che va dal pilastro verso il muro alto
      const archGeo = new THREE.BoxGeometry(0.5, 0.7, 5.2);
      const arch = new THREE.Mesh(archGeo, stone);
      arch.position.set(0, 8.2, -3.0);
      arch.rotation.x = -0.42; // sale verso il cleristorio (-Z, +Y)
      grp.add(arch);
      // mezzo arco sotto (curva) — quarto di toro
      const halfArch = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.28, 6, 12, Math.PI / 2), stone);
      halfArch.rotation.z = Math.PI;
      halfArch.position.set(0, 9.6, -2.4);
      halfArch.rotation.y = Math.PI / 2;
      grp.add(halfArch);
      grp.traverse((o: any) => { if (o.isMesh) { o.castShadow = o.receiveShadow = !this.mobile; } });
      return grp;
    };

    // ---- dimensioni generali (croce latina lunga) -------------------------
    const NAVE_LEN = 56;     // lunghezza navata lungo Z
    const NAVE_W = 9;        // larghezza corpo centrale
    const NAVE_WALL_H = 11;  // altezza muri navata (cleristorio)
    const AISLE_W = 4.0;     // navate laterali
    const NAVE_Z0 = 4;       // estremo verso la facciata (+Z)
    const NAVE_Z1 = NAVE_Z0 - NAVE_LEN; // estremo absidale (-Z)
    const NAVE_CZ = (NAVE_Z0 + NAVE_Z1) / 2;

    // ---- corpo navata centrale --------------------------------------------
    add(new THREE.BoxGeometry(NAVE_W, NAVE_WALL_H, NAVE_LEN), stone, 0, NAVE_WALL_H / 2, NAVE_CZ);
    // navate laterali (più basse)
    const aisleH = 6.5;
    add(new THREE.BoxGeometry(AISLE_W, aisleH, NAVE_LEN), stone, NAVE_W / 2 + AISLE_W / 2, aisleH / 2, NAVE_CZ);
    add(new THREE.BoxGeometry(AISLE_W, aisleH, NAVE_LEN), stone, -(NAVE_W / 2 + AISLE_W / 2), aisleH / 2, NAVE_CZ);

    // ---- TETTO ROSSO a falde (prisma triangolare lungo Z) ------------------
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-NAVE_W / 2 - 0.4, 0);
    roofShape.lineTo(NAVE_W / 2 + 0.4, 0);
    roofShape.lineTo(0, 4.6);
    roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: NAVE_LEN, bevelEnabled: false });
    roofGeo.translate(0, 0, -NAVE_LEN / 2);
    roofGeo.computeVertexNormals();
    // UV planari per il tetto (l'estrusione non genera UV utili)
    this.planarUV(roofGeo, 0.16);
    const roof = add(roofGeo, this.roofMat, 0, NAVE_WALL_H, NAVE_CZ);
    roof.castShadow = !this.mobile;
    // cresta decorativa
    add(new THREE.BoxGeometry(0.4, 0.5, NAVE_LEN), stone, 0, NAVE_WALL_H + 4.7, NAVE_CZ);
    // falde tetto navate laterali (rosse anch'esse, inclinate verso l'esterno)
    for (const s of [1, -1]) {
      const ag = new THREE.BoxGeometry(AISLE_W + 0.6, 0.4, NAVE_LEN);
      const a = add(ag, this.roofMat, s * (NAVE_W / 2 + AISLE_W / 2), aisleH + 0.6, NAVE_CZ);
      a.rotation.z = s * 0.32;
    }

    // ---- file di CONTRAFFORTI lungo la navata (entrambi i lati) ------------
    const bays = 9;
    for (let i = 0; i < bays; i++) {
      const z = NAVE_Z0 - 5 - i * (NAVE_LEN - 8) / (bays - 1);
      for (const s of [1, -1]) {
        const cf = contrafforte();
        cf.position.set(s * (NAVE_W / 2 + AISLE_W + 1.0), -2.0, z);
        if (s < 0) cf.rotation.y = Math.PI; // specchia l'arco verso il muro
        g.add(cf);
      }
      // finestra ogivale del cleristorio (entrambi i lati del corpo alto)
      for (const s of [1, -1]) {
        const w = ogival(1.5, 3.2);
        placeWindow(g, w, s * (NAVE_W / 2 + 0.06), 5.5, z, s > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
      // finestra navata laterale (più bassa)
      for (const s of [1, -1]) {
        const w = ogival(1.2, 2.2);
        placeWindow(g, w, s * (NAVE_W / 2 + AISLE_W + 0.06), 2.4, z, s > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
    }

    // ---- TRANSETTO (braccio trasversale) + 2 guglie minori gemelle ---------
    const transZ = NAVE_Z1 + 16;
    const transW = 22, transH = NAVE_WALL_H, transD = 9;
    add(new THREE.BoxGeometry(transW, transH, transD), stone, 0, transH / 2, transZ);
    // tetto rosso del transetto
    const trShape = new THREE.Shape();
    trShape.moveTo(-transD / 2 - 0.4, 0); trShape.lineTo(transD / 2 + 0.4, 0); trShape.lineTo(0, 4.0); trShape.closePath();
    const trGeo = new THREE.ExtrudeGeometry(trShape, { depth: transW, bevelEnabled: false });
    trGeo.translate(0, 0, -transW / 2); trGeo.rotateY(Math.PI / 2); trGeo.computeVertexNormals();
    this.planarUV(trGeo, 0.16);
    add(trGeo, this.roofMat, 0, transH, transZ);
    // ROSONE sul fronte del transetto (lato +X)
    {
      const rose = this.buildRose(2.4);
      rose.position.set(transW / 2 + 0.1, 7.5, transZ);
      rose.rotation.y = Math.PI / 2;
      g.add(rose);
    }
    // 2 guglie minori gemelle sopra il transetto / incrocio
    for (const s of [1, -1]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 14, 4), stone);
      tower.position.set(s * 4.5, 7 + transH - NAVE_WALL_H, transZ - 0.5);
      tower.position.y = transH + 4;
      tower.castShadow = !this.mobile;
      g.add(tower);
      // bifore sulla torretta
      const bif = ogival(1.0, 2.0);
      placeWindow(g, bif, s * 4.5, transH + 5.0, transZ + 2.06);
      const sp = guglia(9, 1.6);
      sp.position.set(s * 4.5, transH + 11, transZ - 0.5);
      g.add(sp);
      // 4 pinnacoli angolari alla base della guglia
      for (const dx of [-1.4, 1.4]) for (const dz of [-1.4, 1.4]) {
        const p = pinnacolo(2.2);
        p.position.set(s * 4.5 + dx, transH + 11, transZ - 0.5 + dz);
        g.add(p);
      }
    }

    // ---- ABSIDE poligonale all'estremo -Z ----------------------------------
    const apse = new THREE.Mesh(new THREE.CylinderGeometry(NAVE_W / 2 + 1.5, NAVE_W / 2 + 1.5, aisleH + 2, 7, 1, false, 0, Math.PI), stone);
    apse.position.set(0, (aisleH + 2) / 2, NAVE_Z1);
    apse.rotation.y = Math.PI / 2;
    apse.castShadow = !this.mobile;
    g.add(apse);

    // ==========================================================================
    // TORRE FRONTALE + GUGLIA TRAFORATA (il fulcro della silhouette)
    // ==========================================================================
    const towerW = 8.5, towerH = 20;
    const tz = NAVE_Z0 + 1.5; // davanti alla navata (+Z)
    add(new THREE.BoxGeometry(towerW, towerH, towerW), stone, 0, towerH / 2, tz);
    // cornicione
    add(new THREE.BoxGeometry(towerW + 1.2, 0.8, towerW + 1.2), stone, 0, towerH, tz);
    // bifore alte sulla torre (4 lati)
    const faces: [number, number, number][] = [
      [0, 0, towerW / 2 + 0.06], [0, 0, -(towerW / 2 + 0.06)],
      [towerW / 2 + 0.06, 0, 0], [-(towerW / 2 + 0.06), 0, 0],
    ];
    faces.forEach(([fx, _fy, fz], idx) => {
      const ry = (fx !== 0) ? Math.PI / 2 : 0;
      for (const off of [-1.6, 1.6]) {
        const w = ogival(1.4, 4.2);
        if (fx !== 0) placeWindow(g, w, fx, 13, off, ry);
        else placeWindow(g, w, off, 13, fz, ry);
      }
      idx;
    });
    // PORTALE STROMBATO sulla facciata della torre (lato +Z, in basso)
    {
      const portal = new THREE.Group();
      // serie di archi concentrici rientranti (strombatura)
      for (let k = 0; k < 4; k++) {
        const rr = 2.2 - k * 0.32;
        const arc = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.18, 6, 14, Math.PI), stone);
        arc.position.set(0, 4.0, tz + towerW / 2 + 0.1 - k * 0.28);
        portal.add(arc);
        const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.0, 0.3), stone);
        jambL.position.set(-rr, 2.0, tz + towerW / 2 + 0.1 - k * 0.28);
        const jambR = jambL.clone(); jambR.position.x = rr;
        portal.add(jambL, jambR);
      }
      // luce emissiva del portale
      const door = ogival(2.6, 3.4);
      (door.material as THREE.MeshStandardMaterial).emissive.setHex(GOLD_EMISSIVE);
      placeWindow(portal, door, 0, 0.6, tz + towerW / 2 + 0.12);
      portal.traverse((o: any) => { if (o.isMesh) o.castShadow = !this.mobile; });
      g.add(portal);
    }
    // ROSONE grande sulla facciata della torre, sopra il portale
    {
      const rose = this.buildRose(2.0);
      rose.position.set(0, 9.5, tz + towerW / 2 + 0.12);
      g.add(rose);
    }
    // 4 pinnacoli angolari della torre
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      const p = pinnacolo(4.5);
      p.position.set(dx * (towerW / 2 - 0.2), towerH + 0.4, tz + dz * (towerW / 2 - 0.2));
      g.add(p);
    }
    // GUGLIA TRAFORATA principale sopra la torre
    {
      const sp = guglia(14, 3.0);
      sp.position.set(0, towerH + 0.8, tz);
      g.add(sp);
    }

    this.solid.add(g);
    // calcola la world-Y reale di ogni finestra (per l'accensione progressiva)
    this.solid.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    for (const w of this.windowMeshes) {
      w.mesh.getWorldPosition(v);
      (w as any).worldY = v.y;
    }
  }

  // rosone: anello + traforo radiale (raggi) + occhio centrale emissivo
  private buildRose(r: number): THREE.Group {
    const grp = new THREE.Group();
    const stone = this.stoneMat;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.22, 8, 28), stone);
    grp.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(r * 0.62, 0.14, 8, 24), stone);
    grp.add(ring2);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.1, r * 2 - 0.2, 0.12), stone);
      spoke.rotation.z = a;
      grp.add(spoke);
    }
    // vetro emissivo dietro
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x120c06, emissive: WINDOW_EMISSIVE, emissiveIntensity: 0.0, roughness: 0.3,
    });
    const glass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 28), glassMat);
    glass.position.z = -0.12;
    grp.add(glass);
    this.windowMeshes.push({ mesh: glass, mat: glassMat });
    grp.traverse((o: any) => { if (o.isMesh && o.geometry?.type !== "CircleGeometry") o.castShadow = !this.mobile; });
    return grp;
  }

  // UV planari (XZ→uv) per superfici estruse: evita lo stiramento della texture
  private planarUV(geo: THREE.BufferGeometry, scale: number) {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) * scale + pos.getZ(i) * scale;
      uv[i * 2 + 1] = pos.getY(i) * scale + pos.getZ(i) * scale * 0.5;
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setAttribute("uv2", new THREE.BufferAttribute(uv.slice(), 2));
  }

  // ---- wireframe blueprint (svanisce dal basso man mano che emerge la pietra)
  private buildWireframe() {
    // ShaderMaterial per le linee: opacità per-frammento legata alla soglia Y.
    // Sopra il fronte d'onda = linea piena (inchiostro); sotto = svanita.
    const lineVert = `
      varying vec3 vWorldPos;
      void main(){
        vWorldPos = (modelMatrix * vec4(position,1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }`;
    const lineFrag = `
      uniform float uReveal; uniform float uBand; uniform vec3 uInk; uniform vec3 uGold;
      varying vec3 vWorldPos;
      void main(){
        float edge = uReveal - vWorldPos.y; // >0 già materializzato → linea sparisce
        float vis = smoothstep(0.0, uBand*0.8, -edge); // 1 sopra il fronte (ancora filo)
        // bagliore dorato sulla linea proprio sul fronte d'onda
        float band = (1.0 - smoothstep(0.0, uBand, edge)) * (1.0 - vis);
        vec3 col = mix(uInk, uGold, clamp(band*1.4,0.0,1.0));
        float a = vis * 0.85 + band * 0.6;
        if (a < 0.02) discard;
        gl_FragColor = vec4(col, a);
      }`;
    const makeLineMat = () => {
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: {
          uReveal: this.uReveal, uBand: this.uBand,
          uInk: { value: new THREE.Color(0x2a2014) }, uGold: this.uGold,
        },
        vertexShader: lineVert, fragmentShader: lineFrag,
      });
      this.wireRevealMats.push({ mat: m });
      return m;
    };

    const mk = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, ry = 0) => {
      const e = new THREE.EdgesGeometry(geo, 18);
      const ls = new THREE.LineSegments(e, makeLineMat());
      ls.position.set(x, y, z); ls.rotation.y = ry;
      this.wire.add(ls);
      geo.dispose();
    };

    // ricostruisci le primitive-chiave (le stesse misure della pietra)
    const NAVE_LEN = 56, NAVE_W = 9, NAVE_WALL_H = 11, AISLE_W = 4.0;
    const NAVE_Z0 = 4, NAVE_Z1 = NAVE_Z0 - NAVE_LEN, NAVE_CZ = (NAVE_Z0 + NAVE_Z1) / 2;
    mk(new THREE.BoxGeometry(NAVE_W, NAVE_WALL_H, NAVE_LEN), 0, NAVE_WALL_H / 2, NAVE_CZ);
    mk(new THREE.BoxGeometry(AISLE_W, 6.5, NAVE_LEN), NAVE_W / 2 + AISLE_W / 2, 3.25, NAVE_CZ);
    mk(new THREE.BoxGeometry(AISLE_W, 6.5, NAVE_LEN), -(NAVE_W / 2 + AISLE_W / 2), 3.25, NAVE_CZ);
    // tetto navata
    const rShape = new THREE.Shape();
    rShape.moveTo(-NAVE_W / 2 - 0.4, 0); rShape.lineTo(NAVE_W / 2 + 0.4, 0); rShape.lineTo(0, 4.6); rShape.closePath();
    const rGeo = new THREE.ExtrudeGeometry(rShape, { depth: NAVE_LEN, bevelEnabled: false });
    rGeo.translate(0, 0, -NAVE_LEN / 2);
    mk(rGeo, 0, NAVE_WALL_H, NAVE_CZ);
    // transetto
    const transZ = NAVE_Z1 + 16;
    mk(new THREE.BoxGeometry(22, 11, 9), 0, 5.5, transZ);
    // torre frontale + (silhouette guglia come cono)
    const towerW = 8.5, towerH = 20, tz = NAVE_Z0 + 1.5;
    mk(new THREE.BoxGeometry(towerW, towerH, towerW), 0, towerH / 2, tz);
    mk(new THREE.ConeGeometry(3.0, 14, 8), 0, towerH + 0.8 + 7, tz);
    // guglie minori
    for (const s of [1, -1]) {
      mk(new THREE.BoxGeometry(4, 14, 4), s * 4.5, 11 + 4, transZ - 0.5);
      mk(new THREE.ConeGeometry(1.6, 9, 8), s * 4.5, 11 + 11 + 4.5, transZ - 0.5);
    }

    // griglia "carta" a terra
    const grid = new THREE.GridHelper(220, 60, 0x3a2c18, 0x3a2c18);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.12;
    grid.position.y = -2.18;
    grid.renderOrder = -1;
    this.wire.add(grid);
    this.gridMat = grid.material as THREE.Material;
  }
  private gridMat?: THREE.Material;

  // ---- input ---------------------------------------------------------------
  private onResize = () => {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  };
  private onPointerMove = (e: PointerEvent) => {
    this.parallaxTarget.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };
  private onPointerLeave = () => { this.parallaxTarget.set(0, 0); };

  private bind() {
    window.addEventListener("resize", this.onResize);
    const c = this.renderer.domElement;
    c.addEventListener("pointermove", this.onPointerMove);
    c.addEventListener("pointerleave", this.onPointerLeave);
  }
  private unbind() {
    window.removeEventListener("resize", this.onResize);
    const c = this.renderer.domElement;
    c.removeEventListener("pointermove", this.onPointerMove);
    c.removeEventListener("pointerleave", this.onPointerLeave);
  }

  // ---- API pubblica --------------------------------------------------------
  setProgress(t: number) { this.targetT = clamp01(t); }

  // ---- loop ----------------------------------------------------------------
  private loop = () => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;
    this.uTime.value = time;

    if (this.reduced) this.t = Math.max(this.targetT, 0.85);
    else if (this.mobile) this.t = 0.9; // mobile statico: scena già materializzata in 3/4
    else this.t = damp(this.t, this.targetT, 5.0, dt);

    // ---- MATERIALIZZAZIONE: lo scroll [0.08 → 0.5] muove la soglia Y -------
    // matT 0..1: 0 = tutto wireframe, 1 = tutto pietra. Salita dal basso.
    const matT = easeInOut(seg(this.t, 0.08, 0.5));
    // soglia world-Y con un po' di margine sopra Y_MAX così completa davvero
    this.uReveal.value = Y_MIN + (Y_MAX - Y_MIN + 4) * matT;
    // fascia del fronte d'onda: più larga a metà corsa (effetto più visibile)
    this.uBand.value = 2.2 + 3.0 * Math.sin(Math.PI * clamp01(matT));

    // visibilità gruppi
    this.solid.visible = matT > 0.001;
    this.wire.visible = matT < 0.999;
    if (this.gridMat) (this.gridMat as any).opacity = 0.12 * (1 - matT);

    // luce interna cresce con la materializzazione e resta
    this.innerLight.intensity = matT * 22.0;

    // finestre: si accendono via via, da quelle in basso a quelle in alto
    for (let i = 0; i < this.windowMeshes.length; i++) {
      const wy = (this.windowMeshes[i] as any).worldY ?? 8;
      const lit = clamp01((this.uReveal.value - wy) / 3.0); // accesa quando il fronte la supera
      const flick = 0.85 + 0.15 * Math.sin(time * 1.5 + i);
      this.windowMeshes[i].mat.emissiveIntensity = lit * 1.9 * flick;
    }

    // fase HUD
    const phase = this.t < 0.1 ? 1 : matT < 0.98 ? 2 : 3;
    if (phase !== this.phase) { this.phase = phase; this.cb.onPhase?.(phase); }
    this.cb.onReveal?.(matT);

    // ---- camera: blueprint dall'alto → discesa in 3/4 (NIENTE esplosione) --
    const { pos, look } = this.cameraForT(this.t);
    if (!this.reduced && !this.mobile) {
      this.parallax.x = damp(this.parallax.x, this.parallaxTarget.x, 3, dt);
      this.parallax.y = damp(this.parallax.y, this.parallaxTarget.y, 3, dt);
      pos.x += this.parallax.x * 1.4;
      pos.y += -this.parallax.y * 0.8;
    }
    // orbita lievissima finale (quando t>0.85)
    if (this.t > 0.85) {
      const o = (this.t - 0.85) / 0.15;
      const ang = Math.sin(time * 0.18) * 0.05 * o;
      const rx = pos.x * Math.cos(ang) - pos.z * Math.sin(ang);
      const rz = pos.x * Math.sin(ang) + pos.z * Math.cos(ang);
      pos.x = rx; pos.z = rz;
    }
    const k = this.reduced ? 1 : 1 - Math.exp(-6 * dt);
    this.camera.position.lerp(pos, k);
    this._look.lerp(look, k);
    this.camera.lookAt(this._look);

    // bloom: forte solo durante/dopo materializzazione (fronte d'onda + finestre)
    this.bloom.strength = (this.mobile ? 0.35 : 0.5) + Math.sin(Math.PI * clamp01(matT)) * 0.45 + (matT > 0.95 ? 0.25 : 0);

    this.composer.render();
  };

  private cameraForT(t: number): { pos: THREE.Vector3; look: THREE.Vector3 } {
    const k = this.camKeys;
    let a = 0, b = 1, lt = 0;
    if (t < 0.5) { a = 0; b = 1; lt = seg(t, 0, 0.5); }
    else { a = 1; b = 2; lt = seg(t, 0.5, 1); }
    const e = easeInOut(lt);
    return { pos: k[a].pos.clone().lerp(k[b].pos, e), look: k[a].look.clone().lerp(k[b].look, e) };
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.unbind();
    this.scene.traverse((o: any) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: any) => { for (const key in m) { const v = m[key]; if (v && v.isTexture) v.dispose?.(); } m.dispose?.(); });
      }
    });
    this.composer?.dispose?.();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.host) this.host.removeChild(this.renderer.domElement);
  }
}

// ---- Vignette shader (sottile, calda) --------------------------------------
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    offset: { value: 1.1 },
    darkness: { value: 1.12 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; varying vec2 vUv;
    void main(){
      vec4 tex = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * vec2(offset);
      float v = clamp(1.0 - dot(uv, uv) * (darkness - 1.0), 0.0, 1.0);
      gl_FragColor = vec4(mix(tex.rgb, tex.rgb * v, 0.9), tex.a);
    }`,
};
