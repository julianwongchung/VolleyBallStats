import {Composition} from 'remotion';
import {VolleyballMidblocker51} from './volleyball-midblocker-51';

export const RemotionRoot = () => {
  return (
    <Composition
      id="VolleyballMidblocker51"
      component={VolleyballMidblocker51}
      durationInFrames={1350}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        teamName: '5-1 System',
        focusPlayer: 'Middle Blocker',
      }}
    />
  );
};
