in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uFear;
uniform float uGlitch;
uniform float uDizzy;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(void) {
  vec2 uv = vTextureCoord;
  float line = floor(uv.y * 95.0);
  float shift = (hash(vec2(line, floor(uTime * 13.0))) - .5) * uGlitch * .055;
  uv.x += shift + sin(uv.y * 13.0 + uTime * 2.4) * .008 * uDizzy;
  uv.y += sin(uv.x * 9.0 + uTime * 1.8) * .005 * uDizzy;
  uv = clamp(uv, .001, .999);
  vec4 base = texture(uTexture, uv);
  float chroma = uGlitch * .006 + uDizzy * .002;
  base.r = texture(uTexture, clamp(uv + vec2(chroma, 0.0), .001, .999)).r;
  base.b = texture(uTexture, clamp(uv - vec2(chroma, 0.0), .001, .999)).b;
  float edge = smoothstep(.18, .78, length((vTextureCoord - .5) * vec2(.95, 1.1)));
  base.rgb *= 1.0 - edge * (.12 + uFear * .42);
  float lamp = exp(-length((vTextureCoord - vec2(.71, .69)) * vec2(1.0, .8)) * 7.0);
  base.rgb += vec3(.027, .013, .002) * lamp * (.5 + .5 * sin(uTime * 2.8) * sin(uTime * 4.3));
  float grain = (hash(vTextureCoord * 2100.0 + fract(uTime)) - .5) * .012;
  base.rgb += grain;
  finalColor = base;
}
