/* Proper 2x4 bricks, drawn in isometric SVG: top face with eight studs, lit front, shaded side.
   A few of them float slowly around the hero. No canvas, no per-frame work. */
const SHADE: Record<string, [string, string, string]> = {
  red: ['#E8564C', '#D3382F', '#A52A23'], blue: ['#3F8BE0', '#1F6FC9', '#17549A'], green: ['#3DB477', '#1E9A5B', '#167546'],
  yellow: ['#FFD04A', '#F5B81C', '#C48F0E'], white: ['#FFFFFF', '#F0ECE4', '#CFC8BB'],
}
export function Brick2x4({ color = 'red', size = 120, className = '', style }: { color?: keyof typeof SHADE; size?: number; className?: string; style?: React.CSSProperties }) {
  const [top, front, side] = SHADE[color]
  // isometric geometry in a 200x140 box: top parallelogram, front (right) and side (left) faces
  const studs: React.ReactNode[] = []
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const x = 40 + c * 30 + r * 18, y = 36 + c * 12 - r * 14
    studs.push(<g key={`${r}${c}`}><ellipse cx={x} cy={y + 6} rx="10" ry="5" fill={side} /><rect x={x - 10} y={y} width="20" height="6" fill={front} /><ellipse cx={x} cy={y} rx="10" ry="5" fill={top} /></g>)
  }
  return <svg viewBox="0 0 200 140" width={size} height={size * 0.7} className={'s-brick3d ' + className} style={style} aria-hidden="true">
    <polygon points="20,50 140,10 180,30 60,70" fill={top} />
    <polygon points="20,50 60,70 60,120 20,100" fill={side} />
    <polygon points="60,70 180,30 180,80 60,120" fill={front} />
    {studs}
  </svg>
}

/* the floating set for the hero */
const FLOATERS: { color: keyof typeof SHADE; size: number; cls: string }[] = [
  { color: 'red', size: 150, cls: 'f1' }, { color: 'blue', size: 110, cls: 'f2' }, { color: 'green', size: 90, cls: 'f3' },
  { color: 'white', size: 120, cls: 'f4' }, { color: 'red', size: 80, cls: 'f5' }, { color: 'blue', size: 140, cls: 'f6' },
]
export function FloatingBricks() {
  return <div className="s-floaters" aria-hidden="true">{FLOATERS.map(f => <Brick2x4 key={f.cls} color={f.color} size={f.size} className={f.cls} />)}</div>
}
