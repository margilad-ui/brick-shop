import { useEffect, useRef, useState } from 'react'
import { SB } from '../lib/supabase'

/* Joey assets. Small cut-outs ship with the app; hi-res stills and the green-screen clips live in Supabase Storage. */
const base = import.meta.env.BASE_URL
const STORE = SB.url + '/storage/v1/object/public/bs-assets/joey/'
export const JOEY = {
  sit: base + 'joey/sit.webp', side: base + 'joey/side.webp', head: base + 'joey/head.webp', fetch: base + 'joey/fetch.webp', oops: base + 'joey/oops.webp',
  nap: base + 'joey/nap.webp', peek: base + 'joey/peek.webp', happy: base + 'joey/happy.webp', curious: base + 'joey/curious.webp', guilty: base + 'joey/guilty.webp', sleepy: base + 'joey/sleepy.webp',
  wave: STORE + 'keyed/wave.png', run: STORE + 'keyed/run.png', wait: STORE + 'keyed/wait.png', detective: STORE + 'keyed/detective.png', present: STORE + 'keyed/present.png',
}
export const CLIP = { run: STORE + 'video/run.mp4', greet: STORE + 'video/greet.mp4', peek: STORE + 'video/peek.mp4', nap: STORE + 'video/nap.mp4',
  runLR: STORE + 'video/run-lr.mp4', look: STORE + 'video/look.mp4', steal: STORE + 'video/steal.mp4', jump: STORE + 'video/jump.mp4', tumble: STORE + 'video/tumble.mp4', sniff: STORE + 'video/sniff.mp4',
  // wide clips: Joey small in a full-width frame, so he enters and leaves at the real screen edges
  wRun: STORE + 'video/wide-run2.mp4', wRunLR: STORE + 'video/wide-run-lr.mp4', wLook: STORE + 'video/wide-look.mp4', wFetch: STORE + 'video/wide-fetch.mp4', wJump: STORE + 'video/wide-jump.mp4' }

export function reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches }

const VS = `attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.0,1.0); }`
const FS = `precision mediump float; varying vec2 v; uniform sampler2D t; uniform float lo; uniform float hi;
void main(){ vec4 c = texture2D(t, v); float m = max(c.r, c.b); float d = c.g - m;
  float a = 1.0 - smoothstep(lo, hi, d);
  float g = d > 0.0 ? min(c.g, m + 0.02) : c.g; /* spill suppression */
  gl_FragColor = vec4(c.r * a, g * a, c.b * a, a); }`

/* <Clip>: plays a green-screen mp4 through a WebGL chroma key onto a transparent canvas.
   Falls back to the still image when WebGL or autoplay is unavailable or the user prefers reduced motion. */
export function Clip({ src, poster, className = '', loop = true, playing = true, onEnded, onStart, lo = 0.09, hi = 0.42, style, rate = 1 }:
  { src: string; poster?: string; className?: string; loop?: boolean; playing?: boolean; onEnded?: () => void; onStart?: () => void; lo?: number; hi?: number; style?: React.CSSProperties; rate?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [fallback, setFallback] = useState(() => reducedMotion())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (fallback) return
    const canvas = canvasRef.current!; const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true })
    if (!gl) { setFallback(true); return }
    const video = document.createElement('video')
    video.src = src; video.muted = true; video.loop = loop; video.playsInline = true; video.crossOrigin = 'anonymous'; video.preload = 'auto'; video.playbackRate = rate
    videoRef.current = video
    const prog = gl.createProgram()!
    const mk = (type: number, s: string) => { const sh = gl.createShader(type)!; gl.shaderSource(sh, s); gl.compileShader(sh); gl.attachShader(prog, sh) }
    mk(gl.VERTEX_SHADER, VS); mk(gl.FRAGMENT_SHADER, FS); gl.linkProgram(prog); gl.useProgram(prog)
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.uniform1f(gl.getUniformLocation(prog, 'lo'), lo); gl.uniform1f(gl.getUniformLocation(prog, 'hi'), hi)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
    let raf = 0; let alive = true
    // the keyed output is rendered at half the clip size: plenty for the screen, a quarter of the pixels to push
    const scale = 0.5
    const vfc = 'requestVideoFrameCallback' in video
    const draw = () => {
      if (!alive) return
      if (video.readyState >= 2) {
        const w = Math.round(video.videoWidth * scale), h = Math.round(video.videoHeight * scale)
        if (canvas.width !== w) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h) }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        if (!video.dataset.ready) { video.dataset.ready = '1'; setReady(true); onStart && onStart() }
      }
      if (vfc) (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => number }).requestVideoFrameCallback(draw)
      else raf = requestAnimationFrame(draw)
    }
    video.addEventListener('ended', () => onEnded && onEnded())
    video.addEventListener('error', () => setFallback(true))
    const start = () => video.play().then(() => { if (!video.dataset.drawing) { video.dataset.drawing = '1'; draw() } }).catch(() => setFallback(true))
    video.addEventListener('bs-start', start)
    if (playing) start(); else video.load()
    return () => { alive = false; cancelAnimationFrame(raf); video.pause(); video.src = ''; videoRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, fallback])

  useEffect(() => { const v = videoRef.current; if (!v) return; if (playing) { if (!v.dataset.drawing) v.dispatchEvent(new Event('bs-start')); else v.play().catch(() => { }) } else v.pause() }, [playing])

  if (fallback) return <span className={'clip fallback ' + className} style={style}>{poster && <img src={poster} alt="" className="clip-poster" />}</span>
  return <span className={'clip ' + className} style={style}>
    {!ready && poster && <img src={poster} alt="" className="clip-poster" />}
    <canvas ref={canvasRef} aria-hidden="true" style={{ opacity: ready ? 1 : 0 }} />
  </span>
}
