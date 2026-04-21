import { Composition } from 'remotion';
import { StockmanWebAppPromo } from './StockmanWebAppPromo';
import { StockmanMobilePromo } from './StockmanMobilePromo';

const fps = 30;
const webappDurationInFrames = fps * 60;
const mobileDurationInFrames = fps * 30;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="stockman-webapp-promo"
        component={StockmanWebAppPromo}
        durationInFrames={webappDurationInFrames}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{ format: 'landscape' }}
      />
      <Composition
        id="stockman-webapp-promo-vertical"
        component={StockmanWebAppPromo}
        durationInFrames={webappDurationInFrames}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{ format: 'vertical' }}
      />
      <Composition
        id="stockman-mobile-promo"
        component={StockmanMobilePromo}
        durationInFrames={mobileDurationInFrames}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{ format: 'landscape' }}
      />
      <Composition
        id="stockman-mobile-promo-vertical"
        component={StockmanMobilePromo}
        durationInFrames={mobileDurationInFrames}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{ format: 'vertical' }}
      />
    </>
  );
};
