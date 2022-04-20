varying vec2 vUv;
varying float vColorRandoms;

attribute float randoms;
attribute float colorRandoms;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.);

  gl_PointSize = (60. * randoms) * (1. / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;

  vUv = mvPosition.xy;
  vColorRandoms = colorRandoms;
}
