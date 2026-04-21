import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type VideoFormat = 'landscape' | 'vertical';

type PromoProps = {
  format: VideoFormat;
};

type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  image: string;
};

const slides: Slide[] = [
  {
    eyebrow: 'App mobile Stockman',
    title: 'Votre activité dans la poche',
    body: 'Les indicateurs clés du jour sont visibles dès l\u2019ouverture de l\u2019application.',
    image: 'mobile-dashboard.jpg',
  },
  {
    eyebrow: 'Produits',
    title: 'Tout votre catalogue avec vous',
    body: 'Parcourez les produits, prix et niveaux de stock depuis le terrain.',
    image: 'mobile-products.jpg',
  },
  {
    eyebrow: 'Caisse mobile',
    title: 'Encaissez partout, sans comptoir',
    body: 'La caisse mobile garde les ventes synchronis\u00e9es avec le reste de l\u2019activit\u00e9.',
    image: 'mobile-pos.jpg',
  },
  {
    eyebrow: 'Finance',
    title: 'Suivez dépenses et revenus en mobilité',
    body: 'Les op\u00e9rations financi\u00e8res restent accessibles sans retour au bureau.',
    image: 'mobile-finance.jpg',
  },
  {
    eyebrow: 'Clients',
    title: 'Gardez chaque client en relation',
    body: 'Fiches clients, historique d\u2019achat et contact direct, sur chaque fiche.',
    image: 'mobile-clients.jpg',
  },
  {
    eyebrow: 'Fournisseurs',
    title: 'Commandez et suivez vos fournisseurs',
    body: 'La marketplace fournisseurs et les commandes restent accessibles en mobilit\u00e9.',
    image: 'mobile-suppliers.jpg',
  },
];

const brand = {
  ink: '#10231f',
  green: '#0f6b4f',
  mint: '#d8f2e4',
  cream: '#fff7e8',
  gold: '#f2b84b',
  slate: '#49645d',
};

export const StockmanMobilePromo = ({ format }: PromoProps) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = format === 'vertical';
  const slideDuration = Math.floor((durationInFrames - fps * 4) / slides.length);
  const activeSlide = Math.min(Math.floor(frame / slideDuration), slides.length - 1);
  const finalStartsAt = slideDuration * slides.length;
  const finalProgress = interpolate(frame, [finalStartsAt, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 85% 12%, rgba(242, 184, 75, 0.32), transparent 26%), linear-gradient(135deg, #fff7e8 0%, #eef8f1 48%, #d8f2e4 100%)',
        color: brand.ink,
        fontFamily: '"Aptos", "Segoe UI", sans-serif',
        overflow: 'hidden',
      }}
    >
      <AmbientDecorations width={width} height={height} />
      <LogoMark isVertical={isVertical} />
      <div
        style={{
          position: 'absolute',
          inset: isVertical ? '160px 64px 116px' : '120px 112px 92px',
          display: 'grid',
          gridTemplateColumns: isVertical ? '1fr' : '1.05fr 0.95fr',
          gridTemplateRows: isVertical ? 'auto 1fr' : '1fr',
          gap: isVertical ? 40 : 72,
          alignItems: 'center',
          justifyItems: isVertical ? 'center' : 'stretch',
        }}
      >
        <TextPanel slide={slides[activeSlide]} slideDuration={slideDuration} isVertical={isVertical} />
        <PhoneStage
          slides={slides}
          activeSlide={activeSlide}
          slideDuration={slideDuration}
          isVertical={isVertical}
        />
      </div>
      <ProgressBar frame={frame} durationInFrames={durationInFrames} />
      {frame >= finalStartsAt ? <FinalCard progress={finalProgress} isVertical={isVertical} /> : null}
    </AbsoluteFill>
  );
};

const AmbientDecorations = ({ width, height }: { width: number; height: number }) => {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          width: width * 0.3,
          height: width * 0.3,
          left: -width * 0.08,
          top: -height * 0.14,
          borderRadius: '50%',
          background: 'rgba(15, 107, 79, 0.12)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: width * 0.18,
          height: width * 0.18,
          right: width * 0.04,
          bottom: -height * 0.08,
          borderRadius: 42,
          transform: 'rotate(12deg)',
          background: 'rgba(242, 184, 75, 0.2)',
        }}
      />
    </>
  );
};

const LogoMark = ({ isVertical }: { isVertical: boolean }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: isVertical ? 58 : 50,
        left: isVertical ? 64 : 112,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontSize: isVertical ? 34 : 30,
        fontWeight: 800,
        letterSpacing: '-0.04em',
      }}
    >
      <Img
        src={staticFile('brand/stockman-logo.png')}
        style={{
          width: isVertical ? 78 : 70,
          height: isVertical ? 78 : 70,
          borderRadius: 18,
          objectFit: 'cover',
          boxShadow: '0 16px 34px rgba(15, 53, 43, 0.28)',
        }}
      />
      <span>Stockman</span>
    </div>
  );
};

const TextPanel = ({
  slide,
  slideDuration,
  isVertical,
}: {
  slide: Slide;
  slideDuration: number;
  isVertical: boolean;
}) => {
  const frame = useCurrentFrame() % slideDuration;
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const y = interpolate(reveal, [0, 1], [52, 0]);
  const opacity = interpolate(frame, [0, 14, slideDuration - 14, slideDuration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        maxWidth: isVertical ? 880 : 620,
        textAlign: isVertical ? 'center' : 'left',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: isVertical ? '14px 20px' : '12px 18px',
          borderRadius: 999,
          background: 'rgba(255, 255, 255, 0.72)',
          color: brand.green,
          fontSize: isVertical ? 27 : 22,
          fontWeight: 800,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: brand.gold,
          }}
        />
        {slide.eyebrow}
      </div>
      <h1
        style={{
          margin: isVertical ? '30px 0 22px' : '32px 0 24px',
          fontSize: isVertical ? 66 : 76,
          lineHeight: 0.96,
          letterSpacing: '-0.06em',
          fontWeight: 900,
        }}
      >
        {slide.title}
      </h1>
      <p
        style={{
          margin: 0,
          color: brand.slate,
          fontSize: isVertical ? 32 : 28,
          lineHeight: 1.34,
          fontWeight: 520,
        }}
      >
        {slide.body}
      </p>
    </div>
  );
};

const PhoneStage = ({
  slides,
  activeSlide,
  slideDuration,
  isVertical,
}: {
  slides: Slide[];
  activeSlide: number;
  slideDuration: number;
  isVertical: boolean;
}) => {
  const frame = useCurrentFrame() % slideDuration;
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 20, stiffness: 85 } });
  const scale = interpolate(entrance, [0, 1], [0.9, 1]);
  const rotate = interpolate(entrance, [0, 1], [3.5, -1.5]);
  const opacity = interpolate(frame, [0, 16, slideDuration - 16, slideDuration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const phoneWidth = isVertical ? 560 : 380;
  const phoneHeight = Math.round(phoneWidth * (3120 / 1440));

  return (
    <div
      style={{
        position: 'relative',
        height: isVertical ? 1240 : 860,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: phoneWidth + 160,
          height: phoneHeight + 80,
          borderRadius: 80,
          background: 'rgba(15, 107, 79, 0.14)',
          transform: 'rotate(6deg)',
        }}
      />
      <Sequence from={activeSlide * slideDuration} durationInFrames={slideDuration}>
        <div
          style={{
            opacity,
            transform: `scale(${scale}) rotate(${rotate}deg)`,
            width: phoneWidth,
            height: phoneHeight,
            borderRadius: 64,
            background: '#0a0a0a',
            padding: 14,
            boxShadow: '0 46px 110px rgba(15, 53, 43, 0.32)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 22,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 140,
              height: 32,
              borderRadius: 20,
              background: '#000',
              zIndex: 2,
            }}
          />
          <Img
            src={staticFile(`/screenshots/${slides[activeSlide].image}`)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 52,
              display: 'block',
            }}
          />
        </div>
      </Sequence>
    </div>
  );
};

const ProgressBar = ({ frame, durationInFrames }: { frame: number; durationInFrames: number }) => {
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 10,
        background: 'rgba(15, 107, 79, 0.14)',
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${brand.green}, ${brand.gold})`,
        }}
      />
    </div>
  );
};

const FinalCard = ({ progress, isVertical }: { progress: number; isVertical: boolean }) => {
  const opacity = interpolate(progress, [0, 0.22, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(progress, [0, 0.42, 1], [0.92, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(16, 35, 31, 0.9), rgba(15, 107, 79, 0.88))',
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: 'center',
          color: 'white',
          width: isVertical ? 860 : 1120,
          padding: isVertical ? '82px 60px' : '74px 84px',
          borderRadius: 54,
          background: 'rgba(255, 255, 255, 0.11)',
          border: '1px solid rgba(255, 255, 255, 0.28)',
          boxShadow: '0 42px 120px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Img
          src={staticFile('brand/stockman-logo.png')}
          style={{
            display: 'block',
            margin: '0 auto 24px',
            width: isVertical ? 280 : 240,
            height: isVertical ? 280 : 240,
            borderRadius: 36,
            objectFit: 'cover',
            boxShadow: '0 28px 70px rgba(0, 0, 0, 0.35)',
          }}
        />
        <h2
          style={{
            margin: 0,
            fontSize: isVertical ? 78 : 92,
            lineHeight: 0.92,
            letterSpacing: '-0.07em',
            fontWeight: 950,
          }}
        >
          Stockman Mobile
        </h2>
        <p
          style={{
            margin: '30px auto 0',
            maxWidth: 780,
            color: brand.cream,
            fontSize: isVertical ? 34 : 32,
            lineHeight: 1.35,
            fontWeight: 560,
          }}
        >
          {'L\u2019application mobile pour g\u00e9rer produits, ventes, finances, clients et fournisseurs en mobilit\u00e9.'}
        </p>
      </div>
    </AbsoluteFill>
  );
};
