import * as SecureStore from 'expo-secure-store';

// Persisted once the user dismisses the first-launch crisis disclaimer.
export const CRISIS_ACK_KEY = 'crisis_ack';

export interface HelplineNumber {
  label: string;
  tel: string; // digits only, used for `tel:` links
}

export interface Helpline {
  name: string;
  note: string;
  numbers: HelplineNumber[];
}

// India mental-health crisis helplines. Surfaced in the first-launch disclaimer
// and behind the persistent "In crisis?" banner. Keep this list authoritative —
// it is the single source for every crisis surface in the app.
export const HELPLINES: Helpline[] = [
  {
    name: 'iCall',
    note: 'Psychosocial helpline by TISS · Mon–Sat, 10am–8pm',
    numbers: [{ label: '9152987821', tel: '9152987821' }],
  },
  {
    name: 'Vandrevala Foundation',
    note: '24×7 mental health & crisis support',
    numbers: [
      { label: '1860-2662-345', tel: '18602662345' },
      { label: '9999 666 555', tel: '9999666555' },
    ],
  },
  {
    name: 'Tele-MANAS',
    note: 'Govt. of India national mental health helpline · 24×7',
    numbers: [{ label: '14416', tel: '14416' }],
  },
  {
    name: 'AASRA',
    note: '24×7 suicide prevention & emotional support',
    numbers: [{ label: '9820466726', tel: '9820466726' }],
  },
];

export async function hasAckedCrisis(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(CRISIS_ACK_KEY)) === '1';
  } catch {
    // If SecureStore is unavailable, fail open by treating it as un-acked so the
    // disclaimer still shows — never block the safety message on storage errors.
    return false;
  }
}

export async function setCrisisAck(): Promise<void> {
  try {
    await SecureStore.setItemAsync(CRISIS_ACK_KEY, '1');
  } catch {
    // Non-fatal: the disclaimer may show again next launch, which is acceptable.
  }
}
