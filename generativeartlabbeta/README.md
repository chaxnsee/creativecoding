# P5 Sketch Lab — Vercel-ready

Deploy the complete current sketch lab: 20 method buttons, method layering and morphing, optional microphone/file audio reactivity, two-hand tracking, English/မြန်မာ controls, PNG/video download and settings JSON.

This is a plain HTML/JavaScript static project. No application install or build step, API keys, backend or database is needed. p5.js 1.11.11 and the Burmese font are bundled. Hand tracking downloads MediaPipe/model files when started, so it needs internet access.

## Deploy from your computer

1. Unzip `p5-sketch-lab-vercel.zip`.
2. Open a terminal inside the extracted `p5-sketch-lab-vercel` folder, where `vercel.json` is located.
3. With Node.js/npm available, run:

```sh
npx vercel --prod
```

Follow the Vercel sign-in/project prompts. Use this folder as the project root and accept the settings from `vercel.json`. The command creates a real production deployment under your Vercel account and prints its URL. This package itself is ready to deploy and has not already been published.

## Deploy with GitHub and Vercel

1. Put the contents of this folder into a GitHub repository. `vercel.json` should be at the repository root, alongside `public/`.
2. In Vercel, select Add New → Project and import that repository.
3. The included configuration specifies:

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Root Directory | Folder containing `vercel.json` (repository root if uploaded as described) |
| Build Command | Empty / skipped |
| Install Command | Empty / skipped |
| Output Directory | `public` |
| Environment Variables | None |

4. Select Deploy. If you import a repository with this project nested in another folder, set Root Directory to `p5-sketch-lab-vercel` instead.

## Local preview

From this project's root, if Python 3 is installed:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory public
```

Open `http://localhost:8000`. Stop the preview with Ctrl+C.

## Camera, microphone and downloads

On the deployed HTTPS site, camera and microphone still require browser permission and only start when their buttons are used. The permissions header allows them on this site's own origin. Hand tracking needs access to jsDelivr and Google's MediaPipe model host; no restrictive content policy is added that would block these downloads.

Audio-file input and the rest of the art lab do not require camera/microphone permission. Audio/video data is processed in the browser. Recordings and PNGs download to the visitor's computer; they are not uploaded to Vercel. Settings are saved/downloaded locally. No server storage is included.

The artwork is 1000×1000. Recordable formats/codecs depend on the browser. Optional audio recording requires enabling a source and checking Include Audio in Video. Hand tracking and audio require their explicit Start controls; importing settings does not start either.

## Editing

- `public/index.html` is the page entry point and bootstrap.
- `public/sketch.js` contains the complete editable artwork, interface, translations, remix and audio logic. The font is embedded there.
- `public/vendor/p5.min.js` is the pinned p5 runtime.
- `public/vendor/LICENSE-*.txt` contains the runtime and font licenses.
- `docs/SKETCH-LAB.md` explains all methods, controls and saved settings.
- `vercel.json` selects static hosting from `public/` and the device-permission/cache headers.

Deploy the full folder, including `public/vendor/`, rather than only `index.html`. No rewrite to `index.html` is needed: this lab has one page and its asset paths resolve directly.

## မြန်မာဘာသာဖြင့် ဖြန့်ချိရန်

ZIP ဖိုင်ကို ဖြည်ပြီး `vercel.json` ရှိသော `p5-sketch-lab-vercel` ဖိုင်တွဲအတွင်းမှ `npx vercel --prod` ကို သုံးနိုင်သည်။ Vercel အကောင့်ဝင်ရန် ပြသသောအဆင့်များကို လိုက်နာပါ။

GitHub မှတစ်ဆင့်လည်း ဖြန့်ချိနိုင်သည်။ ဖိုင်တွဲအတွင်းရှိ ဖိုင်များကို repository တစ်ခုထဲ ထည့်ပြီး Vercel တွင် import လုပ်ပါ။ Framework ကို **Other**၊ Output Directory ကို **public** အဖြစ် သုံးပါ။ Build နှင့် Install Command ကို ဗလာထားပါ။ API key မလိုအပ်ပါ။

ကင်မရာနှင့် မိုက်ခရိုဖုန်းကို သက်ဆိုင်ရာ Start ခလုတ်နှိပ်မှသာ အသုံးပြုမည်။ ဘရောက်ဇာ၏ အသုံးပြုခွင့် လိုအပ်သည်။ အသံနှင့် ဗီဒီယိုကို သင့်စက်အတွင်း၌သာ တွက်ချက်ပြီး Vercel သို့ မတင်ပါ။

## Official references

- https://vercel.com/docs/builds/configure-a-build#skip-build-step
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/cli/deploy
