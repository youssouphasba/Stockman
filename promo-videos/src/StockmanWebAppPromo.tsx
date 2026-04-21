import {
  AbsoluteFill,
  Img,
  interpolate,
  OffthreadVideo,
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
  video?: { src: string; startSec: number };
};

const slides: Slide[] = [
  {
    eyebrow: 'Vue direction',
    title: 'Tous vos indicateurs, en un coup d\u2019\u0153il',
    body: 'CA, marge brute, panier moyen, stock valoris\u00e9, ruptures, sant\u00e9 business : le tableau de bord consolide la boutique en une seule vue.',
    image: 'web-01-dashboard.png',
    video: { src: 'raw-01.mp4', startSec: 0 },
  },
  {
    eyebrow: 'Caisse POS',
    title: 'Une caisse fluide, connect\u00e9e au stock',
    body: 'Recherchez ou scannez, ajoutez au panier, encaissez en cash, mobile ou e-carte. Chaque vente met \u00e0 jour le stock en temps r\u00e9el.',
    image: 'web-03-pos.png',
    video: { src: 'raw-02.mp4', startSec: 6 },
  },
  {
    eyebrow: 'Finance & rentabilit\u00e9',
    title: 'Votre P&L, lisible sans tableur',
    body: '\u00c9volution financi\u00e8re sur 30 jours, marge brute 61,7 %, marge nette 28,7 %, top produits performants : vos r\u00e9sultats parlent.',
    image: 'web-05-finance-pnl.png',
    video: { src: 'raw-03.mp4', startSec: 9 },
  },
  {
    eyebrow: 'Grand Livre comptable',
    title: 'Toute la compta sur un seul \u00e9cran',
    body: 'Entr\u00e9es, sorties, solde net, filtres Ventes, D\u00e9penses, Pertes, Achats : exportez en Excel trois feuilles ou en PDF \u00e0 la demande.',
    image: 'web-04-finance-ia.png',
    video: { src: 'raw-04.mp4', startSec: 10 },
  },
  {
    eyebrow: 'Diagnostic IA',
    title: 'L\u2019IA lit votre P&L \u00e0 votre place',
    body: 'Diagnostic rapide, leviers de croissance chiffr\u00e9s, axes prioritaires : Stockman transforme vos donn\u00e9es en d\u00e9cisions concr\u00e8tes.',
    image: 'web-04-finance-ia.png',
    video: { src: 'raw-04.mp4', startSec: 19 },
  },
  {
    eyebrow: 'Fiche produit',
    title: 'Chaque r\u00e9f\u00e9rence a son historique',
    body: 'Tendance, courbe des mouvements sur 30 jours, sorties POS, entr\u00e9es, ajustements : l\u2019historique complet d\u2019un produit est \u00e0 un clic.',
    image: 'web-07-inventaire.png',
    video: { src: 'raw-05.mp4', startSec: 9 },
  },
  {
    eyebrow: 'Stock & inventaire',
    title: 'Le cockpit de votre stock',
    body: '944 produits actifs, stock valoris\u00e9, rotation, surstocks, dormants, p\u00e9remption proche, doublons d\u00e9tect\u00e9s : le pilotage reste serr\u00e9.',
    image: 'web-06-stock.png',
    video: { src: 'raw-06.mp4', startSec: 0 },
  },
  {
    eyebrow: 'Mouvements de stock',
    title: 'Entr\u00e9es et sorties, toutes trac\u00e9es',
    body: 'Mouvements, entr\u00e9es, sorties, ajustements sur 30 jours, avec date, produit, auteur et raison : plus aucun \u00e9cart inexpliqu\u00e9.',
    image: 'web-06-stock.png',
    video: { src: 'raw-06.mp4', startSec: 10 },
  },
  {
    eyebrow: 'Analyse ABC',
    title: 'Vos produits class\u00e9s par impact',
    body: 'Classes A, B, C, r\u00e9partition par r\u00e9f\u00e9rences et par chiffre d\u2019affaires : concentrez vos efforts sur les produits qui p\u00e8sent.',
    image: 'web-09-abc.png',
    video: { src: 'raw-06.mp4', startSec: 18 },
  },
  {
    eyebrow: 'CRM & Fid\u00e9lit\u00e9',
    title: 'Une client\u00e8le segment\u00e9e, \u00e0 activer',
    body: 'VIP, actifs, inactifs, \u00e0 risque, anniversaires, taux de r\u00e9achat, encours clients : identifiez qui rappeler, qui relancer, qui fid\u00e9liser.',
    image: 'web-10-crm.png',
    video: { src: 'raw-07.mp4', startSec: 12 },
  },
  {
    eyebrow: 'Gestion d\u2019\u00e9quipe',
    title: 'Des permissions pens\u00e9es par m\u00e9tier',
    body: 'Caissier, Stock, Comptable, Manager, CRM : chaque employ\u00e9 n\u2019acc\u00e8de qu\u2019\u00e0 ce dont il a besoin, module par module.',
    image: 'web-10-crm.png',
    video: { src: 'raw-08.mp4', startSec: 8 },
  },
  {
    eyebrow: 'Pilotage achats',
    title: 'Vos r\u00e9appros pilot\u00e9s par l\u2019IA',
    body: 'Analyse de stock intelligente, suggestions automatiques, alertes critiques, bons de commande : toute la cha\u00eene d\u2019achat en un seul endroit.',
    image: 'web-12-pilotage.png',
    video: { src: 'raw-09.mp4', startSec: 4 },
  },
  {
    eyebrow: 'Marketplace fournisseurs',
    title: 'Trouvez de nouveaux partenaires',
    body: 'Marketplace int\u00e9gr\u00e9e avec filtres produit, pays et prix, notes, catalogues, commande directe et canal WhatsApp fournisseur.',
    image: 'web-13-marketplace.png',
    video: { src: 'raw-09.mp4', startSec: 11 },
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

export const StockmanWebAppPromo = ({ format }: PromoProps) => {
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
          'radial-gradient(circle at 15% 15%, rgba(242, 184, 75, 0.34), transparent 24%), linear-gradient(135deg, #fff7e8 0%, #eef8f1 48%, #d8f2e4 100%)',
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
          inset: isVertical ? '160px 36px 60px' : '130px 56px 40px',
          display: 'grid',
          gridTemplateColumns: isVertical ? '1fr' : '0.45fr 1.55fr',
          gap: isVertical ? 36 : 52,
          alignItems: 'center',
        }}
      >
        <TextPanel slide={slides[activeSlide]} slideDuration={slideDuration} isVertical={isVertical} />
        <ScreenshotStage
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
          width: width * 0.32,
          height: width * 0.32,
          right: -width * 0.08,
          top: -height * 0.16,
          borderRadius: '50%',
          background: 'rgba(15, 107, 79, 0.12)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: width * 0.18,
          height: width * 0.18,
          left: width * 0.04,
          bottom: -height * 0.08,
          borderRadius: 42,
          transform: 'rotate(-14deg)',
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
        maxWidth: isVertical ? 1000 : 520,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: isVertical ? '12px 18px' : '10px 16px',
          borderRadius: 999,
          background: 'rgba(255, 255, 255, 0.72)',
          color: brand.green,
          fontSize: isVertical ? 26 : 20,
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
          margin: isVertical ? '24px 0 18px' : '22px 0 18px',
          fontSize: isVertical ? 68 : 56,
          lineHeight: 0.98,
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
          fontSize: isVertical ? 30 : 22,
          lineHeight: 1.36,
          fontWeight: 520,
        }}
      >
        {slide.body}
      </p>
    </div>
  );
};

const ScreenshotStage = ({
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
  const scale = interpolate(entrance, [0, 1], [0.88, 1]);
  const rotate = interpolate(entrance, [0, 1], [2.5, -1.5]);
  const opacity = interpolate(frame, [0, 16, slideDuration - 16, slideDuration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const slide = slides[activeSlide];
  const videoStartFrame = slide.video ? Math.round(slide.video.startSec * fps) : 0;

  return (
    <div
      style={{
        position: 'relative',
        height: isVertical ? 620 : 900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: isVertical ? 1000 : 1380,
          height: isVertical ? 560 : 830,
          borderRadius: 46,
          background: 'rgba(15, 107, 79, 0.14)',
          transform: 'rotate(4deg)',
        }}
      />
      <Sequence from={activeSlide * slideDuration} durationInFrames={slideDuration}>
        <div
          style={{
            opacity,
            transform: `scale(${scale}) rotate(${rotate}deg)`,
            width: isVertical ? 1000 : 1440,
            borderRadius: 32,
            padding: isVertical ? 12 : 14,
            background: 'rgba(255, 255, 255, 0.85)',
            boxShadow: '0 40px 100px rgba(15, 53, 43, 0.3)',
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            {slide.video ? (
              <OffthreadVideo
                src={staticFile(`recordings/${slide.video.src}`)}
                startFrom={videoStartFrame}
                muted
                style={{
                  width: '100%',
                  display: 'block',
                  borderRadius: 22,
                }}
              />
            ) : (
              <Img
                src={staticFile(`screenshots/${slide.image}`)}
                style={{
                  width: '100%',
                  display: 'block',
                  borderRadius: 22,
                }}
              />
            )}
          </div>
        </div>
      </Sequence>
    </div>
  );
};

const DashboardAnnotations = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cursorStart = 16;
  const cursorEnd = cursorStart + Math.round(fps * 0.9);
  const cursorEase = spring({
    frame: frame - cursorStart,
    fps,
    config: { damping: 22, stiffness: 90 },
  });
  const cursorX = interpolate(cursorEase, [0, 1], [92, 12]);
  const cursorY = interpolate(cursorEase, [0, 1], [78, 52]);
  const cursorOpacity = interpolate(frame, [cursorStart - 4, cursorStart + 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ripple = Math.max(0, frame - cursorEnd);
  const rippleScale = interpolate(ripple, [0, 18], [0.4, 2.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rippleOpacity = interpolate(ripple, [0, 6, 18], [0, 0.7, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const counterStart = cursorEnd + 2;
  const counterEnd = counterStart + Math.round(fps * 1.4);
  const counterProgress = interpolate(frame, [counterStart, counterEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const eased = 1 - Math.pow(1 - counterProgress, 3);
  const counterValue = Math.floor(eased * 23600);
  const counterOpacity = interpolate(
    frame,
    [counterStart - 4, counterStart + 6, counterEnd + 40, counterEnd + 50],
    [0, 1, 1, 0.92],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const counterScale = interpolate(
    frame,
    [counterStart - 4, counterStart + 10],
    [0.8, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const calloutStart = counterEnd - Math.round(fps * 0.5);
  const calloutSpring = spring({
    frame: frame - calloutStart,
    fps,
    config: { damping: 16, stiffness: 110 },
  });
  const calloutOpacity = interpolate(frame, [calloutStart, calloutStart + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const calloutScale = interpolate(calloutSpring, [0, 1], [0.7, 1]);

  const highlightStart = cursorEnd;
  const highlightPulse = (Math.sin(((frame - highlightStart) / fps) * Math.PI * 2) + 1) / 2;
  const highlightOpacity =
    frame < highlightStart
      ? 0
      : interpolate(highlightPulse, [0, 1], [0.4, 0.85]);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: '2.5%',
          top: '40%',
          width: '17%',
          height: '15%',
          borderRadius: 14,
          border: `4px solid ${brand.green}`,
          boxShadow: `0 0 0 6px rgba(15, 107, 79, 0.18)`,
          opacity: highlightOpacity,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '18.5%',
          top: '44%',
          transform: `translateY(-50%) scale(${counterScale})`,
          transformOrigin: 'left center',
          padding: '10px 16px',
          background: 'white',
          borderRadius: 12,
          border: `3px solid ${brand.green}`,
          opacity: counterOpacity,
          fontSize: 22,
          fontWeight: 900,
          color: brand.ink,
          boxShadow: '0 14px 32px rgba(15, 53, 43, 0.28)',
          fontFamily: '"Aptos", "Segoe UI", sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {counterValue.toLocaleString('fr-FR')} F CFA
      </div>
      <div
        style={{
          position: 'absolute',
          left: '3%',
          top: '22%',
          transform: `scale(${calloutScale})`,
          transformOrigin: 'left bottom',
          padding: '10px 18px',
          background: brand.green,
          color: 'white',
          borderRadius: 14,
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          opacity: calloutOpacity,
          boxShadow: '0 18px 40px rgba(15, 107, 79, 0.4)',
          fontFamily: '"Aptos", "Segoe UI", sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        Ventes du jour en direct
        <div
          style={{
            position: 'absolute',
            left: 22,
            bottom: -8,
            width: 16,
            height: 16,
            background: brand.green,
            transform: 'rotate(45deg)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: `${cursorX}%`,
          top: `${cursorY}%`,
          width: 42,
          height: 42,
          borderRadius: '50%',
          border: `3px solid ${brand.green}`,
          background: 'rgba(15, 107, 79, 0.2)',
          transform: `translate(-50%, -50%) scale(${rippleScale})`,
          opacity: rippleOpacity,
          pointerEvents: 'none',
        }}
      />
      <svg
        viewBox="0 0 24 24"
        style={{
          position: 'absolute',
          left: `${cursorX}%`,
          top: `${cursorY}%`,
          width: 34,
          height: 34,
          transform: 'translate(-12%, -10%)',
          opacity: cursorOpacity,
          filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))',
          pointerEvents: 'none',
        }}
      >
        <path
          d="M3 2 L20 11 L12 12.8 L14.5 21 L10.8 22.2 L8.2 14 L3 15 Z"
          fill="white"
          stroke="#10231f"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </>
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
          Stockman Enterprise
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
          Une web app complète pour gérer les ventes, les stocks, les finances, les clients et les équipes.
        </p>
      </div>
    </AbsoluteFill>
  );
};
