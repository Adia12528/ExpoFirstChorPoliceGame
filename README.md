﻿# ðŸš” Chor-Police LIVE

[![Download APK](https://img.shields.io/badge/Download_APK-v1.1.0-brightgreen?style=for-the-badge&logo=android)](https://github.com/Adia12528/ExpoFirstChorPoliceGame/releases/download/v1.1.0/chor-police.apk)

> 📲 **Direct Download:** [Click here to download chor-police.apk](https://github.com/Adia12528/ExpoFirstChorPoliceGame/releases/download/v1.1.0/chor-police.apk)

Real duniya mein dosto ke saath khelne wala GPS game. Phone ka radar batata hai ki chor/police kitne paas hai â€” 12 meter ke andar aate hi pakad sakte ho.

Do folders hain:

| Folder | Kya hai |
|---|---|
| `server/` | Socket.io realtime server (Node, in-memory, live LAN dashboard + QR code) |
| `app/` | Expo (React Native) app â€” Android + iPhone |
| `dist/` | Ready-to-install Android APK (`chor-police.apk` / `app-release.apk`) |

---

## ðŸ“± Android APK (Direct Play)

Aapko code compile karne ki zaroorat nahi hai â€” **Release APK tayyar hai!**

1. `dist/chor-police.apk` (76MB standalone APK) apne ya dosto ke Android phone pe bhejo aur install karo.
2. **Ya phir Server Dashboard se download karo:** Laptop pe server start karo (`npm start`), phone ke browser mein `http://<laptop-ip>:3000` kholo aur **ðŸ“² Download Android APK** pe tap karo!

---

## âœ¨ Naye Features (LAN & Multiplayer Upgrade)

1. **ðŸ” Auto-Detect LAN Server:** App ke settings mein **"Auto-Detect"** dabao â€” server khud dhoondh lega, IP type karne ki jhanjhat nahi!
2. **ðŸ“² Web Dashboard + QR Code:** Server start karte hi browser aur terminal pe QR code dikhta hai.
3. **ðŸ“‹ QR Code Lobby & One-Tap Share:** Lobby mein QR code display hota hai jise dost scan kar sakte hain, ya WhatsApp/Telegram pe invite bhejo.
4. **ðŸ§­ Compass Radar:** Phone ghumane par radar real-world direction ke sath rotate hota hai (expo-sensors magnetometer).
5. **ðŸ”Š Retro Sound Effects (SFX):** Siren, loot pickup, jail break, CCTV warning, aur ability sounds (procedural audio, lightweight).
6. **âš¡ Tactical Abilities:**
   - ðŸ’¨ **Dhuaan (Smoke Bomb)** (Chors): 8 second ke liye police ke radar aur CCTV se gayab!
   - ðŸ“¡ **Radar Boost** (Police): 8 second ke liye radar range 35 meter tak badh jati hai.
   - 45 second ka cooldown dono ke liye.

---

## ðŸŽ® Game kaise kaam karta hai

**Teams:** ðŸ˜ˆ Chor vs ðŸ‘® Police (roles random milte hain).

- **Chor ka goal:** zone mein bikhra ðŸ’° maal collect karo. Maal ke 10m paas jao, apne aap uth jata hai. Maal sirf chors ko dikhta hai.
- **Police ka goal:** saare chors ek saath jail mein daalo, ya time khatam hone tak maal bachao.
- **Pakadna:** chor ke 12m ke andar **PAKDO** button 2 second daba ke rakho. Pakda gaya chor wahin jail mein ruk jata hai.
- **Chhudana:** azaad chor jail ke 12m andar **CHHUDAO** daba ke dost ko chhuda sakta hai. Chhuda hua chor 10 second immune rehta hai.
- **Hot-cold meter + heartbeat:** jitna paas, utna phone zor se thumakta hai (haptics). Police ko chor 20m ke andar radar pe blip ban ke dikhta hai, chor ko police 25m ke andar.
- **ðŸ“¹ CCTV:** har 90 second mein 6 second ke liye saare chor police ko dikh jaate hain. 5 second pehle warning aati hai.
- **Zone:** host ki location center banti hai (radius settable). Zone se bahar gaye to police ko dikh jaoge.
- **Head-start:** shuru mein chors ko chhupne ka time milta hai, police ka radar band rehta hai.
- **Privacy / cheating:** server hi decide karta hai ki kaun kisko dekh sakta hai. Phone ko sirf wahi data milta hai jo uske role ko dikhna chahiye (absolute coordinates nahi, sirf relative offsets).

---

## ðŸš€ Chalane ke steps

### 1. Server chalao (laptop pe)

```bash
cd server
npm install
npm start          # http://localhost:3000
```

Test karne ke liye: `npm test` (34 checks, bots ke saath poora game simulate karta hai).

### 2. App chalao

```bash
cd app
npm install
npx expo start
```

Phone mein **Expo Go** kholo aur QR scan karo. Expo Go ka version project ke SDK (58) ko support karna chahiye; nahi to `npx expo run:android` / `eas build --profile development` se dev build banao.

### 3. App ko server dikhao

Dono options mein se ek:

- `app/.env.example` ko `app/.env` bana ke `EXPO_PUBLIC_SERVER_URL=http://<laptop-ka-WiFi-IP>:3000` daalo, ya
- App ke home screen pe **âš™ï¸ Server aur test mode** kholo aur wahan URL daalo.

Phone aur laptop **same WiFi** pe hone chahiye. Laptop ka IP: Windows `ipconfig`, Mac/Linux `ifconfig` / `ip a`.

### 4. Ghar baithe test (fake GPS)

Home screen pe âš™ï¸ â†’ **ðŸ§ª Test mode** ON karo. Asli GPS ki jagah screen ke D-pad se chalte ho. Do phone (ya ek phone + ek emulator) pe test mode ON karke room banao/join karo.

### 5. Dosto ke saath bahar khelne ke liye server deploy karo

Laptop WiFi se bahar kaam nahi karega, to server ko Render pe daalo (aapne private-chat app mein bhi aisa hi kiya tha):

1. `server/` folder ko GitHub repo mein push karo.
2. Render â†’ New â†’ **Web Service** â†’ repo chuno.
3. Build command: `npm install`, Start command: `npm start`. `PORT` Render khud deta hai.
4. Milne wala `https://xxxx.onrender.com` app ke âš™ï¸ Server URL mein daalo.

Free plan pe server idle hone par so jata hai â€” game se pehle URL browser mein ek baar khol ke jaga do. Server restart hone par chalte rooms khatam ho jaate hain (data memory mein hai).

---

## ðŸ“ Bahar khelte waqt tips

- **Khule maidan / park / campus** best hai. Building ke andar ya ghane ped ke neeche GPS 20-30m bhatak sakta hai.
- Lobby mein sabka `GPS âœ“ Â±5m` jaisa chip green hona chahiye. Accuracy 25m se kharab ho to app warning deta hai, aur pakadna/maal uthana kaam nahi karta.
- App **foreground** mein hona chahiye, screen on rakhna (app khud screen ko sone se rokta hai). Background mein GPS bharosemand nahi.
- Pehle chhote zone (100â€“150m) aur 3-4 players se try karo.

---

## ðŸ”§ Game tweak karna

Saare numbers `server/server.js` ke `DEFAULTS` mein hain (arrest range, sense range, CCTV timing, immunity...). Display ke liye same values `app/src/constants.ts` mein mirror hain â€” dono jagah badalna.

Lobby mein host ye settings badal sakta hai: zone radius, game time, chors ki ginti, maal ki ginti, head-start.

## ðŸ—‚ï¸ Code ka naksha

```
server/server.js         game logic (rooms, roles, arrest/free, loot, CCTV, per-role views)
server/test/sim.js       bots wala end-to-end test
app/App.tsx              screen routing + GPS stream (1 fix/sec)
app/src/screens/         Home, Lobby, Game (radar + buttons), Result
app/src/components/      Radar (SVG), HeatMeter, HoldButton
app/src/useGps.ts        expo-location + fake GPS mode
app/src/useGame.ts       socket state, reconnect
```

## ðŸ’¡ Aage ke ideas

- Chor ke liye smoke bomb (10 second radar se gayab), police ke liye radar pulse.
- BLE se indoor proximity (dev build chahiye).
- Leaderboard aur multiple rounds mein points.


---

## 🔄 Auto-Update System

App khud se check karta hai ki server pe naya version hai ya nahi — koi App Store nahi chahiye!

### Kaise kaam karta hai

1. App start hote hi connected server ka `/api/version` endpoint hit karta hai
2. Agar server pe naya version hai → **"Naya Update Available!"** dialog dikhta hai
3. "Abhi Update Karein" dabao → APK seedha server se download hoti hai (progress bar ke saath)
4. Download ke baad Android ka package installer khulta hai → Install karo ✅

### Update push karne ke steps (aapke liye — developer)

Jab koi naya feature/fix aaye:

```
1. app/src/updater.ts mein CURRENT_VERSION badlo  (e.g. '1.0.1')
2. server/package.json mein "version" badlo        (same value)
3. Naya APK build karo:
     cd C:\cp\app\android
     .\gradlew.bat assembleRelease --max-workers=2
4. APK copy karo:
     Copy-Item app-release.apk "...\server\chor-police.apk"
5. Server start karo — dosto ke phones pe update prompt aayega!
6. GitHub pe push karo:
     git add .; git commit -m "v1.0.1 - new feature"; git push
```

> **Note:** Agar Render pe deploy kiya hai to GitHub push ke baad Render auto-deploy karta hai. Purane version wale phones ko next app open pe update prompt milega.

---

## 🌐 Render.com pe Deploy kaise karein

Friends ke saath bahar (alag WiFi pe) khelne ke liye server internet pe hona chahiye. Render free mein deta hai:

### Steps

1. **GitHub pe code push karo** (already done ✅)
2. **Render.com** pe account banao: [render.com](https://render.com)
3. **New → Web Service** → apna GitHub repo select karo
4. Settings:
   | Field | Value |
   |---|---|
   | Root Directory | `server` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Environment Variables | (koi nahi chahiye — PORT Render khud deta hai) |
5. **Deploy** karo → milega kuch aisa: `https://chor-police-xxxx.onrender.com`

### App mein Render URL connect karna

App ke Home screen pe:
1. **"🌐 Render/Internet Server Connect"** section mein URL daalo
   - Example: `chor-police-xxxx.onrender.com` ya poora `https://...`
2. **"Connect & Test"** dabao — app verify karega ki server chal raha hai
3. ✅ Connected! Ab dost duniya mein kahin se bhi join kar sakte hain

> ⚠️ **Free tier note:** Render free server 15 min inactivity ke baad so jaata hai. Game se pehle URL browser mein ek baar kholo taki server jag jaye (30-45 sec lag sakta hai). Server restart hone par chalte rooms khatam ho jaate hain.

---

## 🎮 App mein kaise khelen — Guide

App ke andar **"📖 Game Guide"** button hai (Home aur Lobby dono mein) — wahan sab detail mein likha hai. Summary:

### Setup
1. Sabke phones pe APK install karo (`dist/chor-police.apk`)
2. Ek laptop pe server chalao ya Render URL use karo
3. App kholo → Server URL daalo → **"🔍 Wi-Fi Auto-Detect"** try karo (same WiFi pe)
4. Naam daalo → **Room Banao** (host) ya **Room Join Karo** (code se)
5. Lobby mein saare players ka GPS ✅ hone ka wait karo
6. Host **"Khel Shuru Karo"** dabaye

### Chor hoke khelna (😈)
- 🗺️ Radar pe **loot (💰)** dhoondo — 10m ke andar jao, apne aap uth jaata hai
- Police 20m ke andar aaye to radar pe blip dikhega — bhaago!
- Dost jail mein pakda gaya? Uske 12m ke andar jao → **"🔓 CHHUDAO"** dabo
- **💨 Dhuaan (Smoke Bomb):** Ability button dabao — 8 sec ke liye police ke radar se gayab!

### Police hoke khelna (👮)
- Chors radar pe tab dikhte hain jab 20m ke andar ho
- **"🔒 PAKDO"** button 2 second dabo ke rakho (chor ke 12m ke andar)
- **📡 Radar Boost:** Ability button dabao — 8 sec ke liye radar range 35m!
- Har 90 sec mein CCTV aata hai — 5 sec warning milti hai, phir 6 sec saare chor dikh jaate hain

---

## 💡 Aage ke ideas

- Chor ke liye smoke bomb (10 second radar se gayab), police ke liye radar pulse. ✅ **Ho gaya!**
- BLE se indoor proximity (dev build chahiye).
- Leaderboard aur multiple rounds mein points.
- Push notifications jab dost server se connect ho.

