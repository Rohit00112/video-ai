import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { ColorGrade } from '../lighting/LightingManager.js';

/**
 * Display-space cinematic grade: saturation/contrast, warm-cool split toning,
 * vignette, deterministic film grain, and impact-driven chromatic aberration.
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uSaturation: { value: 1.1 },
    uContrast: { value: 1.05 },
    uWarmth: { value: 0.0 },
    uVignette: { value: 0.3 },
    uGrainSeed: { value: 0.0 },
    uGrain: { value: 0.035 },
    uAberration: { value: 0.0 },
    uAspect: { value: 1080 / 1920 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uWarmth;
    uniform float uVignette;
    uniform float uGrainSeed;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uAspect;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32 + uGrainSeed);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 center = vUv - 0.5;
      vec3 col;
      if (uAberration > 0.0005) {
        vec2 dir = center * uAberration;
        col.r = texture2D(tDiffuse, vUv + dir).r;
        col.g = texture2D(tDiffuse, vUv).g;
        col.b = texture2D(tDiffuse, vUv - dir).b;
      } else {
        col = texture2D(tDiffuse, vUv).rgb;
      }

      // Contrast around mid grey, then saturation
      col = (col - 0.5) * uContrast + 0.5;
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);

      // Split toning: warm highlights / cool-teal shadows (cinematic orange-teal)
      vec3 warm = vec3(1.06, 1.0, 0.9);
      vec3 cool = vec3(0.92, 1.0, 1.08);
      vec3 tone = mix(cool, warm, smoothstep(0.15, 0.85, luma));
      col *= mix(vec3(1.0), tone, clamp(uWarmth, 0.0, 1.0) * 1.4);
      if (uWarmth < 0.0) {
        col = mix(col, col * vec3(0.9, 0.98, 1.1), -uWarmth);
      }

      // Oval vignette tuned for 9:16
      vec2 vc = center * vec2(uAspect * 1.6, 1.0);
      float vig = smoothstep(0.85, 0.25, length(vc) * 1.25);
      col *= mix(1.0 - uVignette, 1.0, vig);

      // Fine deterministic grain
      float g = hash(vUv * 1000.0) - 0.5;
      col += g * uGrain;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

export class PostFxPipeline {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly grade: ShaderPass;
  private readonly renderPass: RenderPass;
  private readonly renderer: THREE.WebGLRenderer;

  private readonly style: 'cel' | 'storytime';

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number,
    style: 'cel' | 'storytime' = 'cel'
  ) {
    this.renderer = renderer;
    this.style = style;
    const target = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      samples: 4, // MSAA inside the composer so outlines stay crisp
    });
    this.composer = new EffectComposer(renderer, target);
    this.composer.setPixelRatio(1);
    this.composer.setSize(width, height);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Half-res bloom: threshold sits above 1.0 so unlit white character billboards never bloom;
    // only HDR "emissive" props (intensity > 1) glow
    this.bloom = new UnrealBloomPass(new THREE.Vector2(width / 2, height / 2), 0.35, 0.55, 1.12);
    this.composer.addPass(this.bloom);

    this.composer.addPass(new OutputPass());

    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.uAspect.value = width / height;
    this.composer.addPass(this.grade);
  }

  public render(grade: ColorGrade, frame: number, impactStrength: number): void {
    this.bloom.strength = grade.bloomStrength + impactStrength * 0.25;
    this.renderer.toneMappingExposure = grade.exposure;
    const u = this.grade.uniforms;
    // Storytime (reference) look: warmer, softer, cozier — lifted warmth, gentler contrast, deeper vignette, soft glow
    const st = this.style === 'storytime';
    u.uSaturation.value = grade.saturation * (st ? 1.06 : 1);
    u.uContrast.value = st ? Math.min(grade.contrast, 1.0) * 0.96 : grade.contrast;
    u.uWarmth.value = st ? Math.max(grade.warmth, 0) + 0.32 : grade.warmth;
    u.uVignette.value = st ? Math.max(grade.vignette, 0.42) : grade.vignette;
    u.uGrain.value = st ? 0.02 : 0.035;
    if (st) this.bloom.strength = Math.max(this.bloom.strength, 0.5);
    u.uGrainSeed.value = (frame % 97) * 0.137;
    u.uAberration.value = impactStrength * 0.018;
    this.composer.render();
  }

  public dispose(): void {
    this.composer.dispose();
    this.bloom.dispose();
  }
}
