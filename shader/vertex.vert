uniform float uProgress;

varying vec2 vUv;
varying float vColorRandoms;

attribute float randoms;
attribute float colorRandoms;
attribute float offset;

void main() {
  vec3 newPosition = position;
  newPosition.y += clamp(0., 1., (uProgress - offset * .5) / .5);
  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.);

  gl_PointSize = (60. * randoms) * (1. / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;

  vUv = mvPosition.xy;
  vColorRandoms = colorRandoms;
}
