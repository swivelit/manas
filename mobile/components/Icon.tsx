import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// SVG paths taken from the manas_design.html icon definitions
const paths: Record<string, React.ReactNode> = {
  brain: <><Path d="M9 2a5 5 0 00-5 5v1a4 4 0 00-2 7 4 4 0 003 5 4 4 0 005 2 4 4 0 005-4V7a5 5 0 00-5-5z"/><Path d="M15 2a5 5 0 015 5v1a4 4 0 012 7 4 4 0 01-3 5 4 4 0 01-5 2"/></>,
  cloud: <Path d="M4 14a4 4 0 014-7 5 5 0 019-1 4 4 0 014 7 4 4 0 01-3 7H7a4 4 0 01-3-6z"/>,
  photo: <><Rect x="4" y="4" width="16" height="16" rx="2"/><Circle cx="9" cy="9" r="1.5"/><Path d="M4 17l5-5 5 5"/></>,
  'heart-crack': <><Path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z"/><Path d="M8 11l2 2 3-4 2 3"/></>,
  gauge: <><Circle cx="12" cy="12" r="8"/><Path d="M12 4v4M12 12l3 2"/></>,
  stomach: <><Path d="M5 12a7 7 0 0114 0v3a3 3 0 01-3 3H8a3 3 0 01-3-3z"/><Path d="M3 16q3 1 6 0t6 0t6 0"/></>,
  moon: <Path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>,
  heartbeat: <Path d="M3 12h3l3-8 5 16 3-8h4"/>,
  'cloud-rain': <><Path d="M4 14a4 4 0 014-7 5 5 0 019-1 4 4 0 014 7H4z"/><Path d="M7 18l1 3M12 18l1 3M16 18l1 3"/></>,
  warning: <><Path d="M12 3l10 18H2z"/><Path d="M12 10v5M12 18v.5"/></>,
  flame: <Path d="M8 3c0 4 4 5 4 9s-4 5-4 9c4 0 8-4 8-9s-4-9-8-9z"/>,
  person: <><Circle cx="12" cy="8" r="3.5"/><Path d="M5 21c0-4 3-7 7-7s7 3 7 7"/></>,
  shield: <Path d="M12 2l8 4v6c0 5-4 9-8 10C8 21 4 17 4 12V6l8-4z"/>,
  chain: <><Circle cx="7" cy="12" r="3"/><Circle cx="17" cy="12" r="3"/><Path d="M10 12h4"/></>,
  'face-hidden': <><Circle cx="12" cy="12" r="9"/><Path d="M8 15s1-2 4-2 4 2 4 2M9 9h.01M15 9h.01"/></>,
  crown: <><Path d="M5 15l7-10 7 10z"/><Circle cx="12" cy="18" r="2"/></>,
  lightbulb: <><Circle cx="12" cy="12" r="3"/><Path d="M12 5V3M12 21v-2M5 12H3M21 12h-2M6 6l-1-1M18 6l1-1M6 18l-1 1M18 18l1 1"/></>,
  'speech-bubbles': <Path d="M3 7a3 3 0 013-3h6a3 3 0 013 3v5a3 3 0 01-3 3H8l-4 3v-3a3 3 0 01-1-2.5z"/>,
  share: <><Circle cx="6" cy="12" r="2"/><Circle cx="18" cy="6" r="2"/><Circle cx="18" cy="18" r="2"/><Path d="M8 12l8-6M8 12l8 6"/></>,
  puzzle: <><Rect x="3" y="3" width="8" height="8" rx="1"/><Rect x="13" y="13" width="8" height="8" rx="1"/><Rect x="13" y="3" width="8" height="8" rx="1"/></>,
  tree: <><Path d="M12 2l6 10H6z"/><Path d="M12 12v10M8 22h8"/></>,
  clock: <><Circle cx="12" cy="12" r="9"/><Path d="M12 6v6l4 2"/></>,
  group: <><Circle cx="9" cy="8" r="3"/><Circle cx="17" cy="8" r="3"/><Path d="M2 21c0-4 3-7 7-7M16 14c4 0 6 3 6 7"/><Path d="M7 21c0-3 2-5.5 5-6"/></>,
  handshake: <><Path d="M4 13l4-4 4 4 4-4 4 4"/><Path d="M4 13v5h16v-5"/></>,
  briefcase: <><Rect x="3" y="7" width="18" height="13" rx="2"/><Path d="M8 7V5a2 2 0 014 0v2"/><Path d="M3 13h18"/></>,
  home: <><Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><Path d="M9 22V12h6v10"/></>,
  heart: <Path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z"/>,
  star: <Path d="M12 2l2.4 7.4H22l-6.2 4.5L18.2 22 12 17.5 5.8 22l2.4-8.1L2 9.4h7.6z"/>,
  thumbs_up: <><Path d="M7 10v11H4a2 2 0 01-2-2v-7a2 2 0 012-2h3z"/><Path d="M7 10l4-8a3 3 0 013 3v5h5a2 2 0 011.9 2.6l-2 7A2 2 0 0117 21H7"/></>,
  play: <Path d="M8 5v14l11-7z"/>,
  user: <><Circle cx="12" cy="8" r="4"/><Path d="M4 20c0-4 4-8 8-8s8 4 8 8"/></>,
  bell: <><Path d="M6 10a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><Path d="M10.3 21a1.94 1.94 0 003.4 0"/></>,
  chevron_right: <Path d="M9 6l6 6-6 6"/>,
  settings: <><Circle cx="12" cy="12" r="3"/><Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  filter: <><Path d="M4 6h16M7 12h10M10 18h4"/></>,
  search: <><Circle cx="11" cy="11" r="8"/><Path d="M21 21l-4.35-4.35"/></>,
  lock: <><Rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><Path d="M7 11V7a5 5 0 0110 0v4"/></>,
  check: <Path d="M20 6L9 17l-5-5"/>,
  video: <><Rect x="2" y="7" width="15" height="10" rx="2"/><Path d="M17 9l5-3v10l-5-3"/></>,
  mic: <><Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><Path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></>,
  chat: <><Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
};

export function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  const content = paths[name] ?? <Circle cx="12" cy="12" r="4" />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {content}
    </Svg>
  );
}
