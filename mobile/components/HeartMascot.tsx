import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { colors } from '../theme/colors';

export type HeartMascotFacing = 'left' | 'right';

interface HeartMascotProps {
  facing: HeartMascotFacing;
  size: number;
}

interface HeartMascotShadowProps {
  size: number;
}

export function HeartMascotShadow({ size }: HeartMascotShadowProps) {
  return (
    <Svg width={size} height={Math.round(size * 0.22)} viewBox="0 0 128 28">
      <Ellipse cx="64" cy="14" rx="42" ry="9" fill={colors.ink} opacity={0.18} />
      <Ellipse cx="64" cy="13" rx="28" ry="5" fill={colors.blueDeep} opacity={0.12} />
    </Svg>
  );
}

export function HeartMascot({ facing, size }: HeartMascotProps) {
  const flipTransform = facing === 'left' ? 'translate(128 0) scale(-1 1)' : undefined;

  return (
    <Svg width={size} height={size} viewBox="0 0 128 148" accessibilityRole="image">
      <Defs>
        <LinearGradient id="heartBody" x1="8" y1="48" x2="120" y2="88" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={colors.blue} />
          <Stop offset="52%" stopColor={colors.purple} />
          <Stop offset="100%" stopColor={colors.pink} />
        </LinearGradient>
        <LinearGradient id="leftLimb" x1="8" y1="42" x2="58" y2="102" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={colors.blueSoft} />
          <Stop offset="24%" stopColor={colors.blue} />
          <Stop offset="100%" stopColor={colors.blueDeep} />
        </LinearGradient>
        <LinearGradient id="rightLimb" x1="88" y1="72" x2="124" y2="124" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={colors.pinkSoft} />
          <Stop offset="32%" stopColor={colors.pink} />
          <Stop offset="100%" stopColor={colors.purple} />
        </LinearGradient>
        <LinearGradient id="gloss" x1="27" y1="26" x2="77" y2="87" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={colors.paper} stopOpacity={0.84} />
          <Stop offset="100%" stopColor={colors.paper} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      <G transform={flipTransform}>
        <Path
          d="M30 82 C15 72 10 55 17 42 C22 33 33 35 37 45"
          fill="none"
          stroke="url(#leftLimb)"
          strokeWidth={12}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M20 40 C14 36 9 35 6 39 C3 43 7 49 15 51"
          fill="none"
          stroke="url(#leftLimb)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <Path
          d="M21 35 C17 26 19 21 24 20 C29 20 32 26 32 36"
          fill="none"
          stroke="url(#leftLimb)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <Path
          d="M33 36 C35 26 40 22 45 25 C50 28 49 35 43 43"
          fill="none"
          stroke="url(#leftLimb)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <Circle cx="24" cy="52" r="10" fill={colors.blue} opacity={0.96} />
        <Path
          d="M98 82 C111 93 112 111 101 120"
          fill="none"
          stroke="url(#rightLimb)"
          strokeWidth={12}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M97 119 C105 113 113 116 115 123 C117 131 110 136 101 132 C96 137 89 136 87 130 C85 124 90 121 97 119Z"
          fill="url(#rightLimb)"
        />

        <Path
          d="M53 118 C51 128 50 137 49 143"
          fill="none"
          stroke="url(#leftLimb)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <Ellipse cx="44" cy="140" rx="18" ry="8" fill={colors.blue} />
        <Path
          d="M79 118 C81 128 82 137 83 143"
          fill="none"
          stroke="url(#rightLimb)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <Ellipse cx="89" cy="140" rx="18" ry="8" fill={colors.pink} />

        <Path
          d="M64 124 C58 118 35 104 24 82 C12 59 20 28 43 27 C55 27 61 36 64 45 C68 36 76 27 90 27 C111 28 119 59 108 82 C97 104 70 118 64 124Z"
          fill="url(#heartBody)"
        />
        <Path
          d="M64 124 C58 118 35 104 24 82 C12 59 20 28 43 27 C55 27 61 36 64 45 C68 36 76 27 90 27 C111 28 119 59 108 82 C97 104 70 118 64 124Z"
          fill="none"
          stroke={colors.ink}
          strokeOpacity={0.14}
          strokeWidth={2}
        />
        <Path
          d="M25 70 C22 55 28 38 44 36"
          fill="none"
          stroke={colors.paper}
          strokeOpacity={0.22}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <Path
          d="M73 43 C80 34 91 32 101 38 C111 45 113 63 105 78"
          fill="none"
          stroke={colors.paper}
          strokeOpacity={0.22}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <Path
          d="M31 40 C40 30 53 32 58 35 C46 40 39 50 31 63 C28 55 27 47 31 40Z"
          fill="url(#gloss)"
          opacity={0.92}
        />
        <Ellipse cx="72" cy="66" rx="7" ry="4" fill={colors.paper} opacity={0.62} transform="rotate(25 72 66)" />
        <Ellipse cx="48" cy="44" rx="4" ry="3" fill={colors.paper} opacity={0.9} transform="rotate(-25 48 44)" />
        <Ellipse cx="87" cy="41" rx="6" ry="3" fill={colors.paper} opacity={0.75} transform="rotate(-17 87 41)" />

        <Path d="M44 54 C48 47 58 47 61 54" fill="none" stroke={colors.ink} strokeWidth={5} strokeLinecap="round" />
        <Path d="M81 54 C85 47 95 47 99 54" fill="none" stroke={colors.ink} strokeWidth={5} strokeLinecap="round" />

        <Ellipse cx="52" cy="75" rx="12" ry="17" fill={colors.paper} stroke={colors.ink} strokeOpacity={0.2} strokeWidth={2} />
        <Ellipse cx="88" cy="75" rx="12" ry="17" fill={colors.paper} stroke={colors.ink} strokeOpacity={0.2} strokeWidth={2} />
        <Circle cx="55" cy="78" r="8" fill={colors.blueDeep} />
        <Circle cx="91" cy="78" r="8" fill={colors.ink} />
        <Circle cx="55" cy="78" r="4" fill="#080A1E" />
        <Circle cx="91" cy="78" r="4" fill="#080A1E" />
        <Circle cx="51" cy="70" r="3" fill={colors.paper} />
        <Circle cx="87" cy="70" r="3" fill={colors.paper} />
        <Circle cx="60" cy="84" r="2" fill={colors.pink} opacity={0.7} />
        <Circle cx="96" cy="84" r="2" fill={colors.purple} opacity={0.6} />

        <Path
          d="M47 91 C56 106 76 107 85 91 C83 112 50 113 47 91Z"
          fill={colors.ink}
        />
        <Path
          d="M56 99 C63 104 74 104 80 99"
          fill="none"
          stroke={colors.paper}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <Path
          d="M61 111 C67 105 76 107 79 113 C74 118 66 118 61 111Z"
          fill={colors.pink}
          opacity={0.86}
        />
        <Path
          d="M49 90 C58 99 75 100 84 90"
          fill="none"
          stroke={colors.paper}
          strokeOpacity={0.28}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}
