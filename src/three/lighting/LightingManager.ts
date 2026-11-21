import * as THREE from 'three';
import { STYLE_TOKENS } from '../../config/videoConfig.js';
import { SceneScript } from '../../services/scripting/schema.js';

export interface ColorGrade {
  bloomStrength: number;
  saturation: number;
  contrast: number;
  /** -1 cool … +1 warm split toning */
  warmth: number;
  vignette: number;
  exposure: number;
}

const BASE_GRADE: ColorGrade = { bloomStrength: 0.32, saturation: 1.14, contrast: 1.06, warmth: 0.08, vignette: 0.32, exposure: 1.0 };

const GRADES: Record<string, ColorGrade> = {
  daylight: BASE_GRADE,
  crisp_noon: BASE_GRADE,
  warm_golden: { ...BASE_GRADE, warmth: 0.22, bloomStrength: 0.4 },
  soft_overcast: { ...BASE_GRADE, saturation: 1.02, warmth: -0.05 },
  sunset_golden: { ...BASE_GRADE, warmth: 0.32, bloomStrength: 0.55, saturation: 1.18 },
  storm_rain: { ...BASE_GRADE, warmth: -0.3, saturation: 0.92, contrast: 1.08, vignette: 0.4, bloomStrength: 0.45, exposure: 1.12 },
  indoor_cozy: { ...BASE_GRADE, warmth: 0.3, vignette: 0.45, bloomStrength: 0.5 },
  space_neon: { ...BASE_GRADE, warmth: -0.2, bloomStrength: 0.7, contrast: 1.1 },
  space_alert: { ...BASE_GRADE, warmth: 0.1, bloomStrength: 0.75, vignette: 0.55 },
  subway_noir: { ...BASE_GRADE, warmth: -0.15, bloomStrength: 0.7, vignette: 0.5 },
  mars_day: { ...BASE_GRADE, warmth: 0.25 },
  jungle_sun: { ...BASE_GRADE, saturation: 1.2 },
  dream_night: { ...BASE_GRADE, warmth: -0.12, bloomStrength: 0.65, vignette: 0.42 },
  dream_sky: { ...BASE_GRADE, bloomStrength: 0.5, saturation: 1.12 },
  mediterranean_day: { ...BASE_GRADE, saturation: 1.18, warmth: 0.12, bloomStrength: 0.36 },
  pizza_sunset: { ...BASE_GRADE, warmth: 0.34, bloomStrength: 0.6, saturation: 1.2, vignette: 0.38 },
  freezer_glow: { ...BASE_GRADE, warmth: -0.28, bloomStrength: 0.65, saturation: 1.1 },
};

export class LightingManager {
  private readonly sunLight: THREE.DirectionalLight;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly skyDome: THREE.Mesh;
  private readonly fog: THREE.Fog;

  constructor(scene: THREE.Scene) {
    // Atmospheric sky-blue fog matching reference distance depth
    this.fog = new THREE.Fog(
      STYLE_TOKENS.colors.fog,
      STYLE_TOKENS.lighting.fogNear,
      STYLE_TOKENS.lighting.fogFar
    );
    scene.fog = this.fog;

    // Gradient sky dome (upper crisp sky blue -> soft misty horizon)
    const skyGeo = new THREE.SphereGeometry(120, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(STYLE_TOKENS.colors.skyTop) },
        bottomColor: { value: new THREE.Color(STYLE_TOKENS.colors.skyHorizon) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, 12.0, 0.0)).y;
          float t = clamp(pow(max(h, 0.0), 0.72), 0.0, 1.0);
          gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
        }
      `,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(this.skyDome);

    // Hemisphere ambient fill (sky blue top, meadow green ground bounce)
    this.hemiLight = new THREE.HemisphereLight(
      STYLE_TOKENS.lighting.hemiSky,
      STYLE_TOKENS.lighting.hemiGround,
      STYLE_TOKENS.lighting.hemiIntensity
    );
    scene.add(this.hemiLight);

    // Warm directional sunlight from upper-left casting crisp angled shadows
    this.sunLight = new THREE.DirectionalLight('#FFF7E6', STYLE_TOKENS.lighting.sunIntensity);
    const [sx, sy, sz] = STYLE_TOKENS.lighting.sunPosition;
    this.sunLight.position.set(sx, sy, sz);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 85;
    this.sunLight.shadow.camera.left = -26;
    this.sunLight.shadow.camera.right = 26;
    this.sunLight.shadow.camera.top = 26;
    this.sunLight.shadow.camera.bottom = -26;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    scene.add(this.sunLight);
  }

  public applyPreset(preset: SceneScript['lightingPreset']): void {
    const uniforms = (this.skyDome.material as THREE.ShaderMaterial).uniforms;
    switch (preset) {
      case 'warm_golden':
        this.sunLight.color.set('#FFE3B0');
        this.sunLight.intensity = 1.75;
        this.hemiLight.intensity = 0.95;
        this.fog.color.set('#D2DFEA');
        uniforms.topColor.value.set('#73A7D2');
        uniforms.bottomColor.value.set('#E6DFD2');
        break;
      case 'soft_overcast':
        this.sunLight.color.set('#E2EBF2');
        this.sunLight.intensity = 1.25;
        this.hemiLight.intensity = 0.85;
        this.fog.color.set('#B4C9D6');
        uniforms.topColor.value.set('#7D9DB3');
        uniforms.bottomColor.value.set('#C5D5E0');
        break;
      case 'crisp_noon':
        this.sunLight.color.set('#FFFFFF');
        this.sunLight.intensity = 1.65;
        this.hemiLight.intensity = 0.98;
        this.fog.color.set('#C2DDF0');
        uniforms.topColor.value.set('#6BA4D4');
        uniforms.bottomColor.value.set('#D2E8F5');
        break;
      case 'sunset_golden':
        this.sunLight.color.set('#FFB366');
        this.sunLight.intensity = 1.8;
        this.hemiLight.intensity = 0.9;
        this.fog.color.set('#F4B97A');
        uniforms.topColor.value.set('#D96B27');
        uniforms.bottomColor.value.set('#FFE0A6');
        break;
      case 'storm_rain':
        this.sunLight.color.set('#A8BDD4');
        this.sunLight.intensity = 0.88;
        this.hemiLight.intensity = 0.65;
        this.fog.color.set('#55687A');
        uniforms.topColor.value.set('#28384A');
        uniforms.bottomColor.value.set('#5C7084');
        break;
      case 'indoor_cozy':
        this.sunLight.color.set('#FFD89B');
        this.sunLight.intensity = 1.45;
        this.hemiLight.intensity = 0.78;
        this.fog.color.set('#3A281A');
        uniforms.topColor.value.set('#241A12');
        uniforms.bottomColor.value.set('#463222');
        break;
      case 'space_neon':
        this.sunLight.color.set('#B8F0FF');
        this.sunLight.intensity = 1.65;
        this.hemiLight.intensity = 0.85;
        this.fog.color.set('#080C1C');
        uniforms.topColor.value.set('#040610');
        uniforms.bottomColor.value.set('#111A38');
        break;
      case 'space_alert':
        this.sunLight.color.set('#FF6B6B');
        this.sunLight.intensity = 1.8;
        this.hemiLight.intensity = 0.72;
        this.fog.color.set('#2A0810');
        uniforms.topColor.value.set('#140408');
        uniforms.bottomColor.value.set('#3D0C16');
        break;
      case 'subway_noir':
        this.sunLight.color.set('#C8A2FF');
        this.sunLight.intensity = 1.45;
        this.hemiLight.intensity = 0.75;
        this.fog.color.set('#140E26');
        uniforms.topColor.value.set('#0A0716');
        uniforms.bottomColor.value.set('#241545');
        break;
      case 'mars_day':
        this.sunLight.color.set('#FFD7B0');
        this.sunLight.intensity = 1.65;
        this.hemiLight.intensity = 0.92;
        this.fog.color.set('#E39A74');
        uniforms.topColor.value.set('#8F4938');
        uniforms.bottomColor.value.set('#F2B284');
        break;
      case 'jungle_sun':
        this.sunLight.color.set('#FFF2B8');
        this.sunLight.intensity = 1.68;
        this.hemiLight.intensity = 0.95;
        this.fog.color.set('#A8DEC4');
        uniforms.topColor.value.set('#4BA3C7');
        uniforms.bottomColor.value.set('#C6F0D8');
        break;
      case 'dream_night':
        this.sunLight.color.set('#E2D9FF');
        this.sunLight.intensity = 1.45;
        this.hemiLight.intensity = 0.85;
        this.fog.color.set('#3A3168');
        uniforms.topColor.value.set('#1C1F4A');
        uniforms.bottomColor.value.set('#5C4D94');
        break;
      case 'dream_sky':
        this.sunLight.color.set('#FFF3D4');
        this.sunLight.intensity = 1.7;
        this.hemiLight.intensity = 0.98;
        this.fog.color.set('#F5D5E8');
        uniforms.topColor.value.set('#8B6CE0');
        uniforms.bottomColor.value.set('#FFD8EA');
        break;
      case 'mediterranean_day':
        this.sunLight.color.set('#FFF1D6');
        this.sunLight.intensity = 1.85;
        this.hemiLight.intensity = 1.0;
        this.fog.color.set('#CDE7F7');
        uniforms.topColor.value.set('#3F8FE0');
        uniforms.bottomColor.value.set('#D9F0FF');
        break;
      case 'pizza_sunset':
        this.sunLight.color.set('#FFB070');
        this.sunLight.intensity = 1.9;
        this.hemiLight.intensity = 0.92;
        this.fog.color.set('#F7B58A');
        uniforms.topColor.value.set('#C8509A');
        uniforms.bottomColor.value.set('#FFC27A');
        break;
      case 'freezer_glow':
        this.sunLight.color.set('#CFE8FF');
        this.sunLight.intensity = 1.5;
        this.hemiLight.intensity = 0.95;
        this.fog.color.set('#9CC8F0');
        uniforms.topColor.value.set('#2F5FB8');
        uniforms.bottomColor.value.set('#BFE3FF');
        break;
      case 'daylight':
      default:
        this.sunLight.color.set('#FFF7E6');
        this.sunLight.intensity = STYLE_TOKENS.lighting.sunIntensity;
        this.hemiLight.intensity = STYLE_TOKENS.lighting.hemiIntensity;
        this.fog.color.set(STYLE_TOKENS.colors.fog);
        uniforms.topColor.value.set(STYLE_TOKENS.colors.skyTop);
        uniforms.bottomColor.value.set(STYLE_TOKENS.colors.skyHorizon);
        break;
    }
  }

  /** Per-mood cinematic grade consumed by PostFxPipeline */
  public getGrade(preset: SceneScript['lightingPreset']): ColorGrade {
    return GRADES[preset] ?? GRADES.daylight;
  }

  public dispose(): void {
    this.skyDome.geometry.dispose();
    (this.skyDome.material as THREE.Material).dispose();
  }
}
