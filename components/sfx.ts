import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Fire-and-forget retro sound effects + haptics.
 * Players are created lazily on first use and reused; every call is wrapped
 * so a missing audio device or web autoplay restriction never crashes the app.
 */

const sources = {
  coin: require('@/assets/sfx-coin.wav'),
  click: require('@/assets/sfx-click.wav'),
  fanfare: require('@/assets/sfx-fanfare.wav'),
} as const;

const players: Partial<Record<keyof typeof sources, AudioPlayer>> = {};
let audioModeSet = false;

function play(name: keyof typeof sources) {
  try {
    if (!audioModeSet) {
      audioModeSet = true;
      // Let effects play even when the phone's ringer is on silent.
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    }
    let player = players[name];
    if (!player) {
      player = createAudioPlayer(sources[name]);
      players[name] = player;
    }
    player.seekTo(0);
    player.play();
  } catch {
    // Sound is decoration; never let it break anything.
  }
}

export const playCoin = () => play('coin');
export const playClick = () => play('click');
export const playFanfare = () => play('fanfare');

export function tapHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function successHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
