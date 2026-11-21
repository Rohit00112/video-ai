import * as THREE from 'three';
import { STYLE_TOKENS } from '../../config/videoConfig.js';
import { createSeededRng } from '../../utils/math.js';

export class AssetManager {
  private readonly textures = new Map<string, THREE.Texture>();
  private readonly materials = new Map<string, THREE.Material>();
  private readonly geometries = new Map<string, THREE.BufferGeometry>();
  private gradientMap: THREE.DataTexture | null = null;
  private outlineMaterial: THREE.MeshBasicMaterial | null = null;

  public getToonGradientMap(): THREE.DataTexture {
    if (this.gradientMap) return this.gradientMap;
    // Crisp 3-step toon ramp matching cel-shaded storybook look
    const colors = new Uint8Array([
      135, 135, 135, 255,
      210, 210, 210, 255,
      255, 255, 255, 255,
    ]);
    const tex = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.gradientMap = tex;
    return tex;
  }

  public getOutlineMaterial(): THREE.MeshBasicMaterial {
    if (!this.outlineMaterial) {
      this.outlineMaterial = new THREE.MeshBasicMaterial({
        color: STYLE_TOKENS.colors.inkOutline,
        side: THREE.BackSide,
      });
    }
    return this.outlineMaterial;
  }

  public createToonMaterial(
    key: string,
    params: {
      color: string;
      map?: THREE.Texture;
      emissive?: string;
      emissiveIntensity?: number;
      transparent?: boolean;
      opacity?: number;
    }
  ): THREE.MeshToonMaterial {
    const existing = this.materials.get(key);
    if (existing instanceof THREE.MeshToonMaterial) return existing;

    const mat = new THREE.MeshToonMaterial({
      color: params.color,
      map: params.map ?? null,
      gradientMap: this.getToonGradientMap(),
      emissive: params.emissive ? new THREE.Color(params.emissive) : new THREE.Color(0x000000),
      emissiveIntensity: params.emissiveIntensity ?? 0,
      transparent: params.transparent ?? false,
      opacity: params.opacity ?? 1,
    });
    this.materials.set(key, mat);
    return mat;
  }

  /**
   * Wraps any 3D geometry with a crisp BackSide inverted-hull black ink outline,
   * unifying 3D structures with 2D-in-3D illustrated stickman characters.
   */
  public createOutlinedMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    options: {
      outlineScale?: number;
      castShadow?: boolean;
      receiveShadow?: boolean;
      noOutline?: boolean;
    } = {}
  ): THREE.Group {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = options.receiveShadow ?? true;
    group.add(mesh);

    if (!options.noOutline) {
      const outlineScale = options.outlineScale ?? 1.055;
      const outline = new THREE.Mesh(geometry, this.getOutlineMaterial());
      outline.scale.setScalar(outlineScale);
      outline.castShadow = false;
      outline.receiveShadow = false;
      group.add(outline);
    }

    return group;
  }

  public getRoadTexture(): THREE.CanvasTexture {
    const key = 'tex-road';
    const existing = this.textures.get(key);
    if (existing instanceof THREE.CanvasTexture) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const rng = createSeededRng(1010);

    // Base warm ochre dirt
    ctx.fillStyle = STYLE_TOKENS.colors.roadBase;
    ctx.fillRect(0, 0, 512, 512);

    // Darker worn side edges
    const edgeGradL = ctx.createLinearGradient(0, 0, 72, 0);
    edgeGradL.addColorStop(0, '#9E6E2B');
    edgeGradL.addColorStop(1, 'rgba(158, 110, 43, 0)');
    ctx.fillStyle = edgeGradL;
    ctx.fillRect(0, 0, 72, 512);

    const edgeGradR = ctx.createLinearGradient(512, 0, 440, 0);
    edgeGradR.addColorStop(0, '#9E6E2B');
    edgeGradR.addColorStop(1, 'rgba(158, 110, 43, 0)');
    ctx.fillStyle = edgeGradR;
    ctx.fillRect(440, 0, 72, 512);

    // Scattered stylized oval pebbles matching REFERENCE_STYLE_BIBLE.md
    for (let i = 0; i < 190; i++) {
      const x = 24 + rng() * 464;
      const y = rng() * 512;
      const rx = 6 + rng() * 14;
      const ry = 4 + rng() * 9;
      const rot = (rng() - 0.5) * 0.7;
      const palette = ['#DFBA78', '#B88943', '#9E794E', '#C9984D', '#8C7A65'];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = palette[Math.floor(rng() * palette.length)];
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(58, 38, 16, 0.32)';
      ctx.stroke();
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 14);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.set(key, tex);
    return tex;
  }

  public getGrassTexture(): THREE.CanvasTexture {
    const key = 'tex-grass';
    const existing = this.textures.get(key);
    if (existing instanceof THREE.CanvasTexture) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const rng = createSeededRng(2020);

    ctx.fillStyle = STYLE_TOKENS.colors.grassLight;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 420; i++) {
      const x = rng() * 512;
      const y = rng() * 512;
      const r = 10 + rng() * 28;
      ctx.fillStyle = rng() > 0.5 ? 'rgba(72, 138, 24, 0.25)' : 'rgba(122, 194, 52, 0.22)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 600; i++) {
      const x = rng() * 512;
      const y = rng() * 512;
      ctx.strokeStyle = rng() > 0.5 ? '#3E7A14' : '#74BC2D';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 6, y - 8 - rng() * 8);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 18);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.set(key, tex);
    return tex;
  }

  public getWoodPlankTexture(baseColor: string, lineColor: string, key: string): THREE.CanvasTexture {
    const existing = this.textures.get(key);
    if (existing instanceof THREE.CanvasTexture) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const rng = createSeededRng(key.length * 997);

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    const planks = 8;
    const pw = 256 / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(i * pw, 0, pw, 256);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(i * pw, 0);
      ctx.lineTo(i * pw, 256);
      ctx.stroke();

      // Subtle wood grain
      for (let g = 0; g < 3; g++) {
        ctx.strokeStyle = 'rgba(0,0,0,0.07)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const gx = i * pw + 6 + rng() * (pw - 12);
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx + (rng() - 0.5) * 4, 256);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.set(key, tex);
    return tex;
  }

  public getRoofShingleTexture(): THREE.CanvasTexture {
    const key = 'tex-roof';
    const existing = this.textures.get(key);
    if (existing instanceof THREE.CanvasTexture) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = STYLE_TOKENS.colors.cottageRoof;
    ctx.fillRect(0, 0, 256, 256);

    const rows = 10;
    const rh = 256 / rows;
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = r % 2 === 0 ? 'rgba(255, 224, 140, 0.14)' : 'rgba(130, 72, 8, 0.14)';
      ctx.fillRect(0, r * rh, 256, rh);
      ctx.strokeStyle = '#8F570B';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, r * rh);
      ctx.lineTo(256, r * rh);
      ctx.stroke();
      const offset = (r % 2) * 16;
      for (let x = offset; x < 256; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, r * rh);
        ctx.lineTo(x, (r + 1) * rh);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.set(key, tex);
    return tex;
  }

  public getHelpWantedSignTexture(): THREE.CanvasTexture {
    const key = 'tex-help-wanted';
    const existing = this.textures.get(key);
    if (existing instanceof THREE.CanvasTexture) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d')!;

    // Wood border frame
    ctx.fillStyle = '#734B22';
    ctx.fillRect(0, 0, 512, 320);

    // Cream sign face
    ctx.fillStyle = '#FAF6EB';
    ctx.fillRect(22, 22, 468, 276);

    // Inner ink border
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 8;
    ctx.strokeRect(22, 22, 468, 276);

    ctx.fillStyle = '#D94B1A';
    ctx.font = '900 92px "Arial Black", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HELP', 256, 114);
    ctx.fillText('WANTED', 256, 214);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.set(key, tex);
    return tex;
  }

  public registerGeometry(key: string, geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    this.geometries.set(key, geometry);
    return geometry;
  }

  public dispose(): void {
    for (const tex of this.textures.values()) tex.dispose();
    for (const mat of this.materials.values()) mat.dispose();
    for (const geo of this.geometries.values()) geo.dispose();
    this.gradientMap?.dispose();
    this.outlineMaterial?.dispose();
    this.textures.clear();
    this.materials.clear();
    this.geometries.clear();
  }
}
