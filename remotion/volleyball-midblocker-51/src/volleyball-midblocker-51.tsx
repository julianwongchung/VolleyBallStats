import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type VolleyballMidblocker51Props = {
  teamName: string;
  focusPlayer: string;
};

type Point = {
  x: number;
  y: number;
};

type Player = {
  id: string;
  label: string;
  role: string;
  zone: string;
  color: string;
  start: Point;
  serveReceive: Point;
  blockRead: Point;
  closeBlock: Point;
  attack: Point;
};

const court = {
  left: 250,
  top: 192,
  width: 1420,
  height: 716,
  netX: 960,
};

const players: Player[] = [
  {
    id: 'S',
    label: 'S',
    role: 'Setter',
    zone: '1',
    color: '#0f766e',
    start: {x: 1425, y: 760},
    serveReceive: {x: 1245, y: 725},
    blockRead: {x: 1010, y: 360},
    closeBlock: {x: 1085, y: 335},
    attack: {x: 1145, y: 505},
  },
  {
    id: 'OP',
    label: 'OP',
    role: 'Opposite',
    zone: '2',
    color: '#2563eb',
    start: {x: 1435, y: 375},
    serveReceive: {x: 1370, y: 420},
    blockRead: {x: 1375, y: 310},
    closeBlock: {x: 1265, y: 300},
    attack: {x: 1320, y: 395},
  },
  {
    id: 'MB',
    label: 'MB',
    role: 'Middle',
    zone: '3',
    color: '#ef4444',
    start: {x: 1180, y: 360},
    serveReceive: {x: 1130, y: 410},
    blockRead: {x: 975, y: 314},
    closeBlock: {x: 760, y: 310},
    attack: {x: 1012, y: 432},
  },
  {
    id: 'OH1',
    label: 'OH',
    role: 'Outside',
    zone: '4',
    color: '#7c3aed',
    start: {x: 515, y: 365},
    serveReceive: {x: 590, y: 620},
    blockRead: {x: 530, y: 325},
    closeBlock: {x: 660, y: 310},
    attack: {x: 600, y: 392},
  },
  {
    id: 'OH2',
    label: 'OH',
    role: 'Outside',
    zone: '5',
    color: '#7c3aed',
    start: {x: 520, y: 755},
    serveReceive: {x: 640, y: 760},
    blockRead: {x: 675, y: 735},
    closeBlock: {x: 700, y: 700},
    attack: {x: 680, y: 600},
  },
  {
    id: 'L',
    label: 'L',
    role: 'Libero',
    zone: '6',
    color: '#f59e0b',
    start: {x: 960, y: 770},
    serveReceive: {x: 925, y: 770},
    blockRead: {x: 930, y: 750},
    closeBlock: {x: 905, y: 742},
    attack: {x: 900, y: 742},
  },
];

const clampEase = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
  easing: Easing.bezier(0.16, 1, 0.3, 1),
};

const movePoint = (frame: number, fromFrame: number, toFrame: number, from: Point, to: Point) => {
  const progress = interpolate(frame, [fromFrame, toFrame], [0, 1], clampEase);
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
};

const mix = (start: number, end: number, progress: number) => start + (end - start) * progress;

const usePlayerPoint = (player: Player) => {
  const frame = useCurrentFrame();

  if (frame < 250) {
    return player.start;
  }

  if (frame < 470) {
    return movePoint(frame, 250, 430, player.start, player.serveReceive);
  }

  if (frame < 720) {
    return movePoint(frame, 470, 660, player.serveReceive, player.blockRead);
  }

  if (frame < 940) {
    return movePoint(frame, 720, 875, player.blockRead, player.closeBlock);
  }

  if (frame < 1160) {
    return movePoint(frame, 940, 1080, player.closeBlock, player.attack);
  }

  return movePoint(frame, 1160, 1310, player.attack, player.start);
};

const getPhase = (frame: number) => {
  if (frame < 250) {
    return {
      label: 'Rotation 1: MB starts front middle',
      note: 'In a 5-1, one setter runs the offense through every rotation.',
      accent: '#ef4444',
    };
  }

  if (frame < 470) {
    return {
      label: 'Serve receive: MB stays available',
      note: 'The middle holds near zone 3, ready to approach after the pass.',
      accent: '#f59e0b',
    };
  }

  if (frame < 720) {
    return {
      label: 'Read step: eyes on setter and hitter',
      note: 'First movement is small and balanced so the middle can react both ways.',
      accent: '#14b8a6',
    };
  }

  if (frame < 940) {
    return {
      label: 'Close the block',
      note: 'The middle travels fast to seal the gap with the outside blocker.',
      accent: '#2563eb',
    };
  }

  if (frame < 1160) {
    return {
      label: 'Transition to quick attack',
      note: 'Land, turn, and beat the ball to the setter for a first-tempo option.',
      accent: '#7c3aed',
    };
  }

  return {
    label: 'Reset for the next rally',
    note: 'Recover to base, communicate matchups, and prepare for the next read.',
    accent: '#0f766e',
  };
};

const SceneTitle = ({teamName, focusPlayer}: VolleyballMidblocker51Props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const intro = spring({frame, fps, config: {damping: 18, stiffness: 110}});
  const opacity = interpolate(frame, [0, 35, 180, 235], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(intro, [0, 1], [28, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        opacity,
        transform: `translateY(${y}px)`,
        pointerEvents: 'none',
      }}
    >
      <div style={{textAlign: 'center'}}>
        <div
          style={{
            color: '#ef4444',
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          {teamName}
        </div>
        <div
          style={{
            marginTop: 18,
            color: '#f8fafc',
            fontSize: 82,
            fontWeight: 950,
            lineHeight: 1,
          }}
        >
          {focusPlayer}
        </div>
        <div
          style={{
            marginTop: 20,
            color: '#cbd5e1',
            fontSize: 34,
            fontWeight: 800,
          }}
        >
          Position movement in a 5-1 rotation
        </div>
      </div>
    </div>
  );
};

const Court = () => {
  return (
    <div
      style={{
        position: 'absolute',
        left: court.left,
        top: court.top,
        width: court.width,
        height: court.height,
        border: '7px solid #f8fafc',
        background: 'linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #f97316 100%)',
        boxShadow: '0 34px 70px rgba(0, 0, 0, 0.34)',
      }}
    >
      <div style={{position: 'absolute', left: '50%', top: 0, bottom: 0, width: 8, background: '#f8fafc'}} />
      <div style={{position: 'absolute', left: 'calc(50% - 5px)', top: 0, bottom: 0, width: 10, background: '#111827'}} />
      <div style={{position: 'absolute', left: 214, top: 0, bottom: 0, width: 5, background: 'rgba(255,255,255,0.72)'}} />
      <div style={{position: 'absolute', right: 214, top: 0, bottom: 0, width: 5, background: 'rgba(255,255,255,0.72)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: '50%', height: 4, background: 'rgba(255,255,255,0.28)'}} />
      <ZoneLabel zone="4" x={130} y={126} />
      <ZoneLabel zone="3" x={380} y={126} />
      <ZoneLabel zone="2" x={1046} y={126} />
      <ZoneLabel zone="5" x={130} y={504} />
      <ZoneLabel zone="6" x={642} y={504} />
      <ZoneLabel zone="1" x={1046} y={504} />
      <span
        style={{
          position: 'absolute',
          left: '50%',
          top: -42,
          transform: 'translateX(-50%)',
          color: '#e2e8f0',
          fontSize: 20,
          fontWeight: 900,
          textTransform: 'uppercase',
        }}
      >
        Net
      </span>
    </div>
  );
};

const ZoneLabel = ({zone, x, y}: {zone: string; x: number; y: number}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        display: 'grid',
        placeItems: 'center',
        width: 84,
        height: 84,
        border: '3px solid rgba(255,255,255,0.42)',
        borderRadius: 999,
        color: 'rgba(255,255,255,0.72)',
        fontSize: 42,
        fontWeight: 950,
      }}
    >
      {zone}
    </div>
  );
};

const PlayerDot = ({player}: {player: Player}) => {
  const frame = useCurrentFrame();
  const point = usePlayerPoint(player);
  const isMiddle = player.id === 'MB';
  const focusPulse = isMiddle
    ? interpolate(Math.sin(frame / 9), [-1, 1], [0.2, 1])
    : 0;
  const scale = isMiddle
    ? interpolate(frame, [0, 120, 250, 1320], [1, 1.18, 1.12, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: point.x,
        top: point.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        width: isMiddle ? 96 : 78,
        height: isMiddle ? 96 : 78,
        borderRadius: 999,
        background: player.color,
        border: '5px solid #f8fafc',
        boxShadow: isMiddle
          ? `0 0 ${30 + focusPulse * 28}px rgba(239, 68, 68, ${0.36 + focusPulse * 0.28})`
          : '0 14px 24px rgba(15, 23, 42, 0.22)',
        display: 'grid',
        placeItems: 'center',
        zIndex: isMiddle ? 8 : 5,
      }}
    >
      <div style={{textAlign: 'center', color: '#ffffff'}}>
        <div style={{fontSize: isMiddle ? 28 : 22, fontWeight: 950, lineHeight: 1}}>{player.label}</div>
        <div style={{fontSize: 13, fontWeight: 900, opacity: 0.86}}>Z{player.zone}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '100%',
          transform: 'translate(-50%, 8px)',
          padding: '7px 10px',
          borderRadius: 8,
          color: '#0f172a',
          background: '#f8fafc',
          fontSize: 16,
          fontWeight: 900,
          whiteSpace: 'nowrap',
          boxShadow: '0 8px 18px rgba(15, 23, 42, 0.22)',
        }}
      >
        {player.role}
      </div>
    </div>
  );
};

const Arrow = ({
  from,
  to,
  color,
  start,
  end,
  label,
}: {
  from: Point;
  to: Point;
  color: string;
  start: number;
  end: number;
  label: string;
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [start, end], [0, 1], clampEase);
  const opacity = interpolate(frame, [start - 20, start, end + 35, end + 75], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const endPoint = {x: mix(from.x, to.x, progress), y: mix(from.y, to.y, progress)};
  const angle = Math.atan2(to.y - from.y, to.x - from.x);

  return (
    <svg
      width={1920}
      height={1080}
      viewBox="0 0 1920 1080"
      style={{position: 'absolute', inset: 0, opacity, zIndex: 3, overflow: 'visible'}}
    >
      <line
        x1={from.x}
        y1={from.y}
        x2={endPoint.x}
        y2={endPoint.y}
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray="18 18"
      />
      <polygon
        points="0,0 -28,-16 -28,16"
        fill={color}
        transform={`translate(${endPoint.x}, ${endPoint.y}) rotate(${(angle * 180) / Math.PI})`}
      />
      <text
        x={(from.x + to.x) / 2}
        y={(from.y + to.y) / 2 - 28}
        fill="#f8fafc"
        fontSize={25}
        fontWeight={900}
        textAnchor="middle"
        paintOrder="stroke"
        stroke="#0f172a"
        strokeWidth={8}
      >
        {label}
      </text>
    </svg>
  );
};

const InfoPanel = () => {
  const frame = useCurrentFrame();
  const phase = getPhase(frame);
  const appear = interpolate(frame, [180, 240], [0, 1], clampEase);

  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        top: 32,
        width: 1160,
        opacity: appear,
        color: '#f8fafc',
        textShadow: '0 3px 14px rgba(2, 6, 23, 0.72)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '9px 14px',
          borderRadius: 999,
          background: 'rgba(15, 23, 42, 0.78)',
          border: `3px solid ${phase.accent}`,
          fontSize: 18,
          fontWeight: 950,
          textTransform: 'uppercase',
        }}
      >
        <span style={{width: 14, height: 14, borderRadius: 999, background: phase.accent}} />
        5-1 Middle Blocker
      </div>
      <h1
        style={{
          margin: '12px 0 0',
          fontSize: 40,
          lineHeight: 1.05,
          fontWeight: 950,
          letterSpacing: 0,
        }}
      >
        {phase.label}
      </h1>
      <p
        style={{
          margin: '12px 0 0',
          color: '#cbd5e1',
          fontSize: 21,
          lineHeight: 1.25,
          fontWeight: 760,
        }}
      >
        {phase.note}
      </p>
    </div>
  );
};

const Timeline = () => {
  const frame = useCurrentFrame();
  const steps = [
    {label: 'Base', at: 0},
    {label: 'Receive', at: 250},
    {label: 'Read', at: 470},
    {label: 'Close', at: 720},
    {label: 'Attack', at: 940},
    {label: 'Reset', at: 1160},
  ];
  const progress = interpolate(frame, [0, 1350], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 250,
        right: 250,
        bottom: 66,
        height: 68,
        borderRadius: 999,
        background: 'rgba(15, 23, 42, 0.78)',
        border: '2px solid rgba(226, 232, 240, 0.16)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 30px',
        gap: 16,
      }}
    >
      <div style={{position: 'absolute', left: 46, right: 46, top: 26, height: 8, borderRadius: 999, background: '#334155'}} />
      <div
        style={{
          position: 'absolute',
          left: 46,
          top: 26,
          width: `${progress * 100}%`,
          maxWidth: 'calc(100% - 92px)',
          height: 8,
          borderRadius: 999,
          background: 'linear-gradient(90deg, #ef4444, #14b8a6, #7c3aed)',
        }}
      />
      {steps.map((step) => {
        const active = frame >= step.at;
        return (
          <div key={step.label} style={{position: 'relative', flex: 1, display: 'grid', justifyItems: 'center', gap: 12}}>
            <div
              style={{
                width: 25,
                height: 25,
                borderRadius: 999,
                background: active ? '#f8fafc' : '#64748b',
                border: active ? '6px solid #ef4444' : '5px solid #334155',
                zIndex: 1,
              }}
            />
            <div style={{color: active ? '#f8fafc' : '#94a3b8', fontSize: 19, fontWeight: 900}}>{step.label}</div>
          </div>
        );
      })}
    </div>
  );
};

const KeyResponsibilities = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [1020, 1090, 1290, 1340], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const items = ['Own the net middle', 'Read setter shoulder', 'Close blocks both pins', 'Run quick first-tempo attack'];

  return (
    <div
      style={{
        position: 'absolute',
        right: 76,
        top: 78,
        width: 470,
        opacity,
        color: '#f8fafc',
      }}
    >
      <div style={{fontSize: 27, fontWeight: 950, textTransform: 'uppercase', color: '#fca5a5'}}>MB checklist</div>
      <div style={{display: 'grid', gap: 14, marginTop: 18}}>
        {items.map((item, index) => {
          const itemIn = interpolate(frame, [1060 + index * 24, 1094 + index * 24], [0, 1], clampEase);
          return (
            <div
              key={item}
              style={{
                transform: `translateX(${(1 - itemIn) * 26}px)`,
                opacity: itemIn,
                display: 'grid',
                gridTemplateColumns: '42px 1fr',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(15, 23, 42, 0.78)',
                border: '2px solid rgba(248, 250, 252, 0.14)',
                fontSize: 24,
                fontWeight: 850,
              }}
            >
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  background: '#ef4444',
                  fontWeight: 950,
                }}
              >
                {index + 1}
              </span>
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Ball = () => {
  const frame = useCurrentFrame();
  const passProgress = interpolate(frame, [260, 430], [0, 1], clampEase);
  const setProgress = interpolate(frame, [930, 1045], [0, 1], clampEase);
  const attackProgress = interpolate(frame, [1045, 1125], [0, 1], clampEase);

  let x = mix(620, 1140, passProgress);
  let y = mix(790, 405, passProgress) - Math.sin(passProgress * Math.PI) * 145;

  if (frame >= 930) {
    x = mix(1140, 1012, setProgress);
    y = mix(405, 365, setProgress) - Math.sin(setProgress * Math.PI) * 85;
  }

  if (frame >= 1045) {
    x = mix(1012, 790, attackProgress);
    y = mix(365, 295, attackProgress) - Math.sin(attackProgress * Math.PI) * 52;
  }

  const opacity = interpolate(frame, [230, 260, 1180, 1220], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        width: 52,
        height: 52,
        borderRadius: 999,
        opacity,
        background: 'radial-gradient(circle at 35% 32%, #ffffff 0 18%, #fde68a 19% 41%, #2563eb 42% 61%, #ef4444 62% 100%)',
        border: '4px solid #f8fafc',
        boxShadow: '0 12px 22px rgba(0,0,0,0.32)',
        zIndex: 9,
      }}
    />
  );
};

const Background = () => {
  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 18% 22%, rgba(239, 68, 68, 0.22), transparent 32%), linear-gradient(135deg, #020617 0%, #0f172a 46%, #111827 100%)',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    />
  );
};

export const VolleyballMidblocker51 = ({teamName, focusPlayer}: VolleyballMidblocker51Props) => {
  return (
    <AbsoluteFill
      style={{
        fontFamily:
          'Inter, Arial, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <Background />
      <Court />
      <Arrow from={{x: 1130, y: 410}} to={{x: 975, y: 314}} color="#14b8a6" start={470} end={650} label="read step" />
      <Arrow from={{x: 975, y: 314}} to={{x: 760, y: 310}} color="#2563eb" start={720} end={875} label="close block" />
      <Arrow from={{x: 760, y: 310}} to={{x: 1012, y: 432}} color="#7c3aed" start={940} end={1080} label="quick attack" />
      {players.map((player) => (
        <PlayerDot key={player.id} player={player} />
      ))}
      <Ball />
      <InfoPanel />
      <Timeline />
      <KeyResponsibilities />
      <SceneTitle teamName={teamName} focusPlayer={focusPlayer} />
    </AbsoluteFill>
  );
};
