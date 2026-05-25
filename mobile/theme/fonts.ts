import {
  useFonts,
  Fraunces_300Light_Italic,
  Fraunces_400Regular,
  Fraunces_500Medium,
} from '@expo-google-fonts/fraunces';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';

export function useAppFonts() {
  return useFonts({
    Fraunces_400Regular,
    Fraunces_300Light_Italic,
    Fraunces_500Medium,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    InstrumentSerif_400Regular_Italic,
  });
}

export const fontFamilies = {
  fraunces: 'Fraunces_400Regular',
  frauncesItalic: 'Fraunces_300Light_Italic',
  frauncesMedium: 'Fraunces_500Medium',
  dmSans: 'DMSans_400Regular',
  dmSansMedium: 'DMSans_500Medium',
  dmSansBold: 'DMSans_700Bold',
  instrumentSerifItalic: 'InstrumentSerif_400Regular_Italic',
} as const;
