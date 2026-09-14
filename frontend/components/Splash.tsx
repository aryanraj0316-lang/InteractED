import { View, StyleSheet, Dimensions } from 'react-native';
import { useRef, useEffect } from 'react';
import { Video } from 'expo-av';

const { width, height } = Dimensions.get('window');

type SplashProps = {
  onFinish: () => void;
};

export default function Splash({ onFinish }: SplashProps) {
  const videoRef = useRef<Video>(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Start playing manually
    videoRef.current?.playAsync();
  }, []);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={require('../assets/videos/splash.mp4')}
        style={styles.video}
        resizeMode="contain"
        isLooping={false}
        onPlaybackStatusUpdate={async (status: any) => {
          if (!status.isLoaded) return;

          if (status.didJustFinish && !hasTriggered.current) {
            hasTriggered.current = true;

            await videoRef.current?.pauseAsync();

            setTimeout(() => {
              onFinish();
            }, 1000);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  video: {
    width: width * 0.5,
    height: height * 0.5,
  },
});
