import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
// import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import * as dat from 'dat.gui'

// import dna from './dna.glb?url'
import fragmentShader from './shader/fragment.frag?raw'
import vertexShader from './shader/vertex.vert?raw'

import './style.css'

const CustomPass = {
  uniforms: {
    tDiffuse: { value: null },
    distro: { value: 0.5 },
    time: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);

      vUv = uv;
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;

    varying vec2 vUv;

    vec2 barrelDistortion(vec2 coord, float amt) {
      vec2 cc = coord - 0.5;
      float dist = dot(cc, cc);
      return coord + cc * dist * amt;
    }

    float sat( float t )
    {
      return clamp( t, 0.0, 1.0 );
    }

    float linterp( float t ) {
      return sat( 1.0 - abs( 2.0*t - 1.0 ) );
    }

    float remap( float t, float a, float b ) {
      return sat( (t - a) / (b - a) );
    }

    vec4 spectrum_offset( float t ) {
      vec4 ret;
      float lo = step(t,0.5);
      float hi = 1.0-lo;
      float w = linterp( remap( t, 1.0/6.0, 5.0/6.0 ) );
      ret = vec4(lo,1.0,hi, 1.) * vec4(1.0-w, w, 1.0-w, 1.);

      return pow( ret, vec4(1.0/2.2) );
    }

    const float max_distort = 1.2;
    const int num_iter = 12;
    const float reci_num_iter_f = 1.0 / float(num_iter);

    void main()
    {
      // vec2 uv=(gl_FragCoord.xy/resolution.xy*.5)+.25;
      vec2 uv = (vUv - .5) * .6 + .5;

      vec4 sumcol = vec4(0.0);
      vec4 sumw = vec4(0.0);
      for ( int i=0; i<num_iter;++i )
      {
        float t = float(i) * reci_num_iter_f;
        vec4 w = spectrum_offset( t );
        sumw += w;
        sumcol += w * texture2D( tDiffuse, barrelDistortion(uv, .6 * max_distort*t ) );
      }

      gl_FragColor = sumcol / sumw;
    }
  `,
}

class Sketch {
  constructor(el) {
    this.domElement = el

    this.windowSize = new THREE.Vector2(
      this.domElement.offsetWidth,
      this.domElement.offsetHeight
    )
    this.gui = new dat.GUI()

    // this.gltfLoader = new GLTFLoader()
    // this.dracoLoader = new DRACOLoader()
    // this.dracoLoader.setDecoderPath('/draco/')
    // this.dracoLoader.preload()
    // this.gltfLoader.setDRACOLoader(this.dracoLoader)

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.windowSize.x / this.windowSize.y,
      0.1,
      100
    )
    this.camera.position.z = 5
    this.scene.add(this.camera)

    this.clock = new THREE.Clock()

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.domElement.append(this.renderer.domElement)

    this.composer = new EffectComposer(this.renderer)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true

    this.addObject()
    this.initGUI()
    this.addEventListener()
    this.effects()
    this.resize()
    this.render()
    // this.gltfLoader.load(dna, gltf => {
    // this.geometry = gltf.scene.children[0].geometry
    // this.geometry.center()
    // })
  }

  initGUI() {
    this.settings = {
      progress: 0,
    }

    this.gui.add(this.settings, 'progress', 0, 1, 0.01)
  }

  effects() {
    this.renderScene = new RenderPass(this.scene, this.camera)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.windowSize.x, this.windowSize.y),
      1.4,
      0.87,
      0.01
    )
    this.customPass = new ShaderPass(CustomPass)

    this.composer.addPass(this.renderScene)
    this.composer.addPass(this.bloomPass)
    this.composer.addPass(this.customPass)
  }

  addObject() {
    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColor1: { value: new THREE.Color(0x612574) },
        uColor2: { value: new THREE.Color(0x293583) },
        uColor3: { value: new THREE.Color(0x612574) },
      },
      fragmentShader,
      vertexShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.mesh = new THREE.Points(this.geometry, this.material)
    this.number = 90000

    const randoms = new Float32Array(this.number / 3)
    const animationRandoms = new Float32Array(this.number / 3)
    const colorRandoms = new Float32Array(this.number / 3)
    const positions = new Float32Array(this.number)

    for (let i = 0; i < this.number / 3; i++) {
      randoms.set([Math.random()], i)
      colorRandoms.set([Math.random()], i)
      animationRandoms.set([Math.random()], i)

      const theta = 0.01 * Math.PI * 2 * Math.floor(i / 100)
      const radius = 0.03 * ((i % 100) - 50)

      const x = Math.cos(theta) * radius
      const y = 0.1 * Math.floor(i / 100) - 2
      const z = Math.sin(theta) * radius

      positions.set([x, y, z], i * 3)
    }

    this.geometry.setAttribute('randoms', new THREE.BufferAttribute(randoms, 1))
    this.geometry.setAttribute(
      'offset',
      new THREE.BufferAttribute(animationRandoms, 1)
    )
    this.geometry.setAttribute(
      'colorRandoms',
      new THREE.BufferAttribute(colorRandoms, 1)
    )
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    )

    this.scene.add(this.mesh)
  }

  resize() {
    this.windowSize.set(
      this.domElement.offsetWidth,
      this.domElement.offsetHeight
    )

    this.bloomPass.resolution.set(this.windowSize.x, this.windowSize.y)

    this.camera.aspect = this.windowSize.x / this.windowSize.y
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(this.windowSize.x, this.windowSize.y)
    this.composer.setSize(this.windowSize.x, this.windowSize.y)
    this.composer.setPixelRatio(Math.min(2, window.devicePixelRatio))
  }

  addEventListener() {
    window.addEventListener('resize', this.resize.bind(this))
  }

  render() {
    const elapsedTime = this.clock.getElapsedTime()

    this.material.uniforms.uTime.value = elapsedTime
    this.material.uniforms.uProgress.value = this.settings.progress
    this.customPass.material.uniforms.time.value = elapsedTime

    this.mesh.rotation.y += 0.005

    this.controls.update()

    this.composer.render()

    window.requestAnimationFrame(this.render.bind(this))
  }
}

new Sketch(document.getElementById('app'))
