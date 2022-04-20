uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uTime;

varying vec2 vUv;
varying float vColorRandoms;

void main() {
  float dist = smoothstep(0.5, 0.7, 1. - length(gl_PointCoord - .5));

  if (dist < 0.3) {
    discard;
  }

  vec3 color = uColor1;
  if (vColorRandoms > 0.33 && vColorRandoms < 0.66) {
    color = uColor2;
  }
  if (vColorRandoms > 0.66) {
    color = uColor3;
  }

  float gradient = smoothstep(-3., 0., vUv.y);

  gl_FragColor = vec4(color, dist * .2 * gradient);
  // gl_FragColor = vec4(vec2(gradient), 1., 1.);
}
