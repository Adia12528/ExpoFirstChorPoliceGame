// Mirrors server/server.js DEFAULTS (the server is the one that actually decides).
export const ARREST_RANGE = 12; // m
export const FREE_RANGE = 12; // m
export const LOOT_RANGE = 10; // m
export const WEAK_GPS = 25; // m accuracy

// Set EXPO_PUBLIC_SERVER_URL in .env, or change it inside the app (⚙️ Server on the home screen).
export const DEFAULT_SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'https://chor-police-live.onrender.com';
export const OFFICIAL_RENDER_URL = 'https://chor-police-live.onrender.com';

export interface GuideSection {
  title: string;
  emoji: string;
  points: string[];
}

export const GAME_GUIDE: GuideSection[] = [
  {
    emoji: '🚀',
    title: '1. Khel Shuru Kaise Karein (3 Steps)',
    points: [
      'Sabhi dost ek hi WiFi ya ek phone ke Mobile Hotspot se connect hon.',
      'Ek dost "Naya room banao" dabaye (Host banega) aur baki dost 4-akshar ka Code daal kar "Room mein aao" dabayein.',
      'Sabhi ka GPS green (✓) hone par Host "GAME SHURU KARO" dabayega. Roles (Chor / Police) automatically random milenge!',
    ],
  },
  {
    emoji: '😈',
    title: '2. Chor Ka Role (Goal & Chori)',
    points: [
      '💰 Maal Uthao: Zone mein bikhra maal collect karo. Maal ke 10 meter paas aate hi automatic collect ho jayega. Maal sirf chors ko dikhta hai!',
      '💨 Dhuaan (Smoke Bomb): Jab police paas aaye, ability button dabao! 8 second ke liye police radar aur CCTV se gayab ho jaoge.',
      '🔓 Dost Ko Chhudao: Agar dost jail mein band ho gaya, toh uski jail ke 12m paas jao aur "CHHUDAO" button dabao. Chhoote hi dost 10 second immune rahega.',
      '🏆 Jeet: Saara maal collect karo ya game time khatam hone tak azaad bache raho!',
    ],
  },
  {
    emoji: '👮',
    title: '3. Police Ka Role (Goal & Pakadna)',
    points: [
      '📡 Radar & Heat-Meter: Phone ka meter batata hai ki chor kitne paas hai. Paas aane par phone vibrate karega aur 20m ke andar radar pe blip dikhega.',
      '🚨 Pakdo: Chor ke 12 meter ke andar jao aur "PAKDO" button ko 2 second daba kar rakho (hold karo). Pakda gaya chor wahin freeze ho jayega.',
      '⚡ Radar Boost: Ability button dabane par 8 second ke liye aapka detection range 35 meter tak badh jayega!',
      '📹 CCTV Alert: Har 90 second mein 6 second ke liye sabhi chors radar pe dikhte hain. CCTV aane se 5 second pehle siren bajti hai.',
      '🏆 Jeet: Sabhi chors ko ek saath jail mein daalo ya time over hone tak maal bachao!',
    ],
  },
  {
    emoji: '🧭',
    title: '4. Compass Radar & Signal',
    points: [
      'Compass ON rakhne par phone ghumane ke sath radar real-world direction mein ghoomta hai.',
      'Open ground, park ya campus mein khelein. High accuracy (±5m - ±10m) ke liye phone open aasmaan ke neeche rakhein.',
      'Ghar baithe test karne ke liye Settings mein jakar "🧪 Test mode" ON karein aur D-pad se chalen.',
    ],
  },
];

// Flat list for simple views
export const RULES: string[] = [
  '😈 Chor vs 👮 Police. Roles game shuru hote hi automatically random milte hain.',
  '💰 Chor ka goal: Bikhra maal collect karo (10m ke paas aate hi auto uth jata hai).',
  '🚔 Police ka goal: Saare chors ko 12m ke andar jaakar PAKDO button hold karke jail bhejo.',
  '🔓 Chhudana: Azaad chor jail ke 12m paas aakar CHHUDAO daba kar dost ko chhudaye (10s immunity).',
  '💨 Special Abilities: Chors ko Smoke Bomb (8s stealth) aur Police ko Radar Boost (35m range) milta hai.',
  '📹 CCTV: Har 90 second mein 6s ke liye saare chor police ko dikhte hain (5s pehle siren warning).',
  '⚠️ Zone ke bahar gaye toh police ko location dikh jayegi! Chors ko shuru mein head-start milta hai.',
];
