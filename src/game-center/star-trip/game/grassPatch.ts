import * as THREE from 'three'

import accentLeafUrl from '../assets/textures/grass/v0.1.7/accentleaf.png?url'
import grassLeafUrl from '../assets/textures/grass/v0.1.7/grassleaf.png?url'
import { buildSurfaceFrame, normalFromLatLon, terrainRadiusAtNormal } from './planetMath'

export type StarTripGrassPatchSummary = {
  version: string
  center: { lat: number; lon: number }
  groundRadius: number
  bladeInstances: number
  accentInstances: number
  proceduralGround: boolean
  source: string
}

export type StarTripGrassPatch = {
  root: THREE.Group
  summary: StarTripGrassPatchSummary
  update: (time: number, camera: THREE.Camera, playerPosition: THREE.Vector3) => void
}

const PATCH_CENTER = { lat: -18.3, lon: 22.8 }
const PATCH_RADIUS_X = 14.2
const PATCH_RADIUS_Z = 11.4
const MAIN_BLADE_COUNT = 6000
const ACCENT_BLADE_COUNT = 1
const textureLoader = new THREE.TextureLoader()

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function fract(value: number) {
  return value - Math.floor(value)
}

function floorHash(x: number, y: number) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123)
}

function floorNoise(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = fract(x)
  const fy = fract(y)
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = floorHash(ix, iy)
  const b = floorHash(ix + 1, iy)
  const c = floorHash(ix, iy + 1)
  const d = floorHash(ix + 1, iy + 1)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, ux),
    THREE.MathUtils.lerp(c, d, ux),
    uy,
  )
}

function floorFbm(x: number, y: number) {
  let value = 0
  let amplitude = 0.55
  let px = x
  let py = y
  for (let i = 0; i < 3; i += 1) {
    value += amplitude * floorNoise(px, py)
    px = px * 2.07 + 19.7
    py = py * 2.07 + 7.3
    amplitude *= 0.5
  }
  return value
}

function grassPatchColorIndex(x: number, z: number) {
  let index = 0
  if (floorFbm(x * 0.22, z * 0.22) > 0.537) index = 1
  if (floorFbm(x * 0.2 + 17, z * 0.2 + 31) > 0.471) index = 2
  return index
}

function loadPixelTexture(url: string) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    textureLoader.load(
      url,
      (texture) => {
        texture.magFilter = THREE.NearestFilter
        texture.minFilter = THREE.NearestFilter
        texture.generateMipmaps = false
        texture.colorSpace = THREE.SRGBColorSpace
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        resolve(texture)
      },
      undefined,
      reject,
    )
  })
}

function normalAtPatchOffset(centerNormal: THREE.Vector3, right: THREE.Vector3, forward: THREE.Vector3, x: number, z: number) {
  return centerNormal
    .clone()
    .multiplyScalar(terrainRadiusAtNormal(centerNormal))
    .addScaledVector(right, x)
    .addScaledVector(forward, z)
    .normalize()
}

function materialBaseColor(material: THREE.Material) {
  if ('color' in material && material.color instanceof THREE.Color) return material.color.clone()
  return new THREE.Color(0x84ad53)
}

function createTerrainGrassMaterial(source: THREE.Material) {
  const centerNormal = normalFromLatLon(PATCH_CENTER.lat, PATCH_CENTER.lon)
  const centerPoint = centerNormal.clone().multiplyScalar(terrainRadiusAtNormal(centerNormal))
  const frame = buildSurfaceFrame(centerNormal)
  const baseColor = materialBaseColor(source)

  return new THREE.ShaderMaterial({
    name: `ST017_spawn_meadow_terrain_grass_${source.name || 'material'}`,
    uniforms: {
      baseColor: { value: baseColor },
      centerPoint: { value: centerPoint },
      patchRight: { value: frame.right },
      patchForward: { value: frame.forward },
      colorBase: { value: new THREE.Color(0x83aa3a) },
      colorPatch2: { value: new THREE.Color(0x88ad3e) },
      colorPatch3: { value: new THREE.Color(0x7ea538) },
      sunDirection: { value: new THREE.Vector3(0.38, 0.72, 0.42).normalize() },
    },
    vertexShader: `
      varying vec3 vWorld;
      varying vec3 vNormal;

      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 centerPoint;
      uniform vec3 patchRight;
      uniform vec3 patchForward;
      uniform vec3 colorBase;
      uniform vec3 colorPatch2;
      uniform vec3 colorPatch3;
      uniform vec3 sunDirection;
      varying vec3 vWorld;
      varying vec3 vNormal;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.55;
        for (int i = 0; i < 3; i++) {
          value += amplitude * noise(p);
          p = p * 2.07 + vec2(19.7, 7.3);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec3 delta = vWorld - centerPoint;
        vec2 patchUv = vec2(dot(delta, patchRight), dot(delta, patchForward));
        vec2 normalizedPatch = vec2(patchUv.x / ${PATCH_RADIUS_X.toFixed(1)}, patchUv.y / ${PATCH_RADIUS_Z.toFixed(1)});
        float radial = length(normalizedPatch);
        float edgeBreakup = noise(patchUv * 0.18) * 0.2 + noise(patchUv * 0.41 + 8.0) * 0.08;
        float grassMask = 1.0 - smoothstep(0.82 + edgeBreakup, 1.12 + edgeBreakup, radial);

        vec3 grass = colorBase;
        float albedo2 = fbm(patchUv * 0.22);
        float albedo3 = fbm(patchUv * 0.2 + vec2(17.0, 31.0));
        if (albedo2 > 0.537) grass = colorPatch2;
        if (albedo3 > 0.471) grass = colorPatch3;

        float lighting = dot(normalize(vNormal), normalize(sunDirection)) * 0.5 + 0.5;
        lighting = ceil(clamp(lighting, 0.18, 1.0) * 3.0) / 3.0;
        grass *= mix(0.95, 1.06, lighting);

        vec3 color = mix(baseColor, grass, grassMask);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: source.side,
    toneMapped: false,
  })
}

function applyTerrainGrassMaterials(root: THREE.Object3D | null) {
  const materials: THREE.ShaderMaterial[] = []
  if (!root) return materials
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => {
        const grassMaterial = createTerrainGrassMaterial(material)
        materials.push(grassMaterial)
        return grassMaterial
      })
      return
    }
    const grassMaterial = createTerrainGrassMaterial(mesh.material)
    materials.push(grassMaterial)
    mesh.material = grassMaterial
  })
  return materials
}

function createBladeGeometry(count: number, seed: number) {
  const base = new THREE.InstancedBufferGeometry()
  base.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([
      -0.5, 0, 0,
      0.5, 0, 0,
      -0.5, 1, 0,
      0.5, 1, 0,
    ], 3),
  )
  base.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2))
  base.setIndex([0, 1, 2, 2, 1, 3])
  base.instanceCount = count

  const centerNormal = normalFromLatLon(PATCH_CENTER.lat, PATCH_CENTER.lon)
  const { right, forward } = buildSurfaceFrame(centerNormal)
  const random = seededRandom(seed)
  const origins = new Float32Array(count * 3)
  const ups = new Float32Array(count * 3)
  const sizes = new Float32Array(count * 2)
  const seeds = new Float32Array(count)
  const colorSeeds = new Float32Array(count)

  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.399963 + (random() - 0.5) * 0.42
    const radius = Math.sqrt(random())
    const x = Math.cos(angle) * PATCH_RADIUS_X * radius * (0.98 + random() * 0.05)
    const z = Math.sin(angle) * PATCH_RADIUS_Z * radius * (0.98 + random() * 0.05)
    const normal = normalAtPatchOffset(centerNormal, right, forward, x, z)
    const origin = normal.clone().multiplyScalar(terrainRadiusAtNormal(normal) + 0.18)
    const width = 0.17 + random() * 0.06
    const height = 0.26 + random() * 0.12

    origins.set([origin.x, origin.y, origin.z], i * 3)
    ups.set([normal.x, normal.y, normal.z], i * 3)
    sizes.set([width, height], i * 2)
    seeds[i] = random() * 100
    colorSeeds[i] = grassPatchColorIndex(x, z)
  }

  base.setAttribute('instanceOrigin', new THREE.InstancedBufferAttribute(origins, 3))
  base.setAttribute('instanceUp', new THREE.InstancedBufferAttribute(ups, 3))
  base.setAttribute('instanceSize', new THREE.InstancedBufferAttribute(sizes, 2))
  base.setAttribute('instanceSeed', new THREE.InstancedBufferAttribute(seeds, 1))
  base.setAttribute('instanceColorSeed', new THREE.InstancedBufferAttribute(colorSeeds, 1))
  return base
}

function createBladeMaterial(texture: THREE.Texture, accent: boolean) {
  return new THREE.ShaderMaterial({
    name: accent ? 'ST017_spawn_accent_grass_blades' : 'ST017_spawn_grass_blades',
    uniforms: {
      grassMap: { value: texture },
      time: { value: 0 },
      playerPosition: { value: new THREE.Vector3(999, 999, 999) },
      windDirection: { value: new THREE.Vector3(0.7, 0, 0.35).normalize() },
      cameraRight: { value: new THREE.Vector3(1, 0, 0) },
      cameraUp: { value: new THREE.Vector3(0, 1, 0) },
      colorBase: { value: new THREE.Color(0x83aa3a) },
      colorPatch2: { value: new THREE.Color(0x88ad3e) },
      colorPatch3: { value: new THREE.Color(0x7ea538) },
      sunDirection: { value: new THREE.Vector3(0.38, 0.72, 0.42).normalize() },
    },
    vertexShader: `
      attribute vec3 instanceOrigin;
      attribute vec3 instanceUp;
      attribute vec2 instanceSize;
      attribute float instanceSeed;
      attribute float instanceColorSeed;
      uniform float time;
      uniform vec3 playerPosition;
      uniform vec3 windDirection;
      uniform vec3 cameraRight;
      uniform vec3 cameraUp;
      uniform vec3 sunDirection;
      varying vec2 vUv;
      varying float vColorIndex;
      varying float vLighting;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec3 up = normalize(instanceUp);

        vec3 wind = windDirection - up * dot(windDirection, up);
        if (dot(wind, wind) < 0.0001) wind = cross(normalize(cameraRight), up);
        wind = normalize(wind);

        float frameRate = 5.0;
        float steppedTime = floor((time + instanceSeed * 0.071) * frameRate) / frameRate;
        vec2 windUv1 = instanceOrigin.xz * 0.071 + wind.xz * steppedTime * 0.025;
        vec2 windUv2 = instanceOrigin.zx * 0.0568 + vec2(-wind.z, wind.x) * steppedTime * 0.0233;
        float windNoise = clamp(noise(windUv1) * noise(windUv2) + 0.365, 0.0, 1.0);
        windNoise = (windNoise - 0.5) * 2.0;

        float distanceToPlayer = length(playerPosition - instanceOrigin);
        float pushMask = clamp(1.0 - distanceToPlayer / 1.18, 0.0, 1.0);
        vec3 pushDirection = normalize(instanceOrigin - playerPosition + up * 0.001);
        pushDirection = normalize(pushDirection - up * dot(pushDirection, up));

        float heightMask = uv.y * uv.y;
        vec3 bent = instanceOrigin
          + normalize(cameraRight) * (position.x * instanceSize.x)
          + normalize(cameraUp) * (position.y * instanceSize.y)
          + wind * (windNoise * instanceSize.y * 0.5 * heightMask)
          + pushDirection * (pushMask * instanceSize.y * 0.42 * heightMask);

        vUv = uv;
        vColorIndex = instanceColorSeed;
        float lighting = dot(up, normalize(sunDirection)) * 0.5 + 0.5;
        vLighting = ceil(clamp(lighting, 0.18, 1.0) * 3.0) / 3.0;
        gl_Position = projectionMatrix * viewMatrix * vec4(bent, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D grassMap;
      uniform vec3 colorBase;
      uniform vec3 colorPatch2;
      uniform vec3 colorPatch3;
      varying vec2 vUv;
      varying float vColorIndex;
      varying float vLighting;

      void main() {
        vec4 tex = texture2D(grassMap, vUv);
        if (tex.a < 0.5) discard;
        vec3 color = colorBase;
        if (vColorIndex > 0.5) color = colorPatch2;
        if (vColorIndex > 1.5) color = colorPatch3;
        color *= mix(0.95, 1.06, vLighting);
        gl_FragColor = vec4(color * tex.rgb, tex.a);
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  })
}

export async function createStarTripGrassPatch(terrainRoot: THREE.Object3D | null = null): Promise<StarTripGrassPatch> {
  const [grassTexture, accentTexture] = await Promise.all([
    loadPixelTexture(grassLeafUrl),
    loadPixelTexture(accentLeafUrl),
  ])
  const terrainGrassMaterials = applyTerrainGrassMaterials(terrainRoot)

  const root = new THREE.Group()
  root.name = 'star-trip-v0.1.7-spawn-grass-patch'

  const mainMaterial = createBladeMaterial(grassTexture, false)
  const mainBlades = new THREE.Mesh(createBladeGeometry(MAIN_BLADE_COUNT, 17017), mainMaterial)
  mainBlades.name = 'ST017_spawn_grass_instanced_blades'
  mainBlades.frustumCulled = false

  const accentMaterial = createBladeMaterial(accentTexture, true)
  const accentBlades = new THREE.Mesh(createBladeGeometry(ACCENT_BLADE_COUNT, 17137), accentMaterial)
  accentBlades.name = 'ST017_spawn_grass_accent_blades'
  accentBlades.frustumCulled = false

  root.add(mainBlades, accentBlades)

  return {
    root,
    summary: {
      version: 'grass-v0.1.7',
      center: PATCH_CENTER,
      groundRadius: Number(Math.max(PATCH_RADIUS_X, PATCH_RADIUS_Z).toFixed(2)),
      bladeInstances: MAIN_BLADE_COUNT,
      accentInstances: ACCENT_BLADE_COUNT,
      proceduralGround: true,
      source: 'Dylearn Floor.gdshader and Grass.gdshader adapted: terrain uses static three-colour noise patches; grass shape comes from dense grassleaf/accentleaf texture quads with 5fps wind sway',
    },
    update(time: number, camera: THREE.Camera, playerPosition: THREE.Vector3) {
      void terrainGrassMaterials
      const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize()
      const cameraUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize()
      for (const material of [mainMaterial, accentMaterial]) {
        material.uniforms.time.value = time
        material.uniforms.playerPosition.value.copy(playerPosition)
        material.uniforms.cameraRight.value.copy(cameraRight)
        material.uniforms.cameraUp.value.copy(cameraUp)
      }
    },
  }
}

