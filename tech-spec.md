tl;dr

single‑page next.js (or astro/sveltekit, w/e you vibe with) → very thin api route/edge‑function that orchestrates five cloud calls + one ffmpeg step → cheap kv/queue to track jobs → static storage for outputs. nothing else.

⸻

1. user flow (happy path)
	1.	user pastes youtube link + picks a character (you’ve pre‑trained LoRA+RVC for each) + optional prompt tweak.
	2.	frontend hits POST /covers → returns job_id.
	3.	browser opens SSE/WebSocket GET /covers/:id/stream, progress bars light up.
	4.	when done, backend emits URL to final mp4 sitting in R2/S3. user gets inline player + download.

⸻

2. pipeline choreography (per job)

step	service	rough latency	notes
0	yt‑dl in serverless tmp	~5‑20 s	cut to ≤4 min wav/mp3, resample 48 kHz
1	voice_full → zsxkib/realistic‑voice‑cloning	30‑120 s	full mix parameters
2	voice_isolated → same model, different params	30‑120 s	instrumental vol ‑∞, gives dry AI vox
3	still → black‑forest‑labs/flux‑pro‑finetuned	5‑25 s	prompt = "close‑up portrait of <TOK>, [user prompt]", guidance~3
4	vid → zsxkib/sonic	40‑180 s	feed isolated vox + still
5	ffmpeg concat in serverless tmp	2‑10 s	ffmpeg -i vid.mp4 -i voice_full.mp3 -map 0:v -map 1:a -c copy out.mp4
6	upload out.mp4 to bucket, update DB		

All heavy ML lives on Replicate; edge function only downloads/uploads and polls /predictions/:id.

⸻

3. minimal infra

┌────────────┐    http/json   ┌─────────────┐  sdk    ┌────────────┐
│  Next.js   ├───────────────▶│  Edge func  ├────────▶│ Replicate  │
│  frontend  │  (covers api)  │  (Vercel)   │         │  models    │
└────────────┘◀──────sse──────└─────┬───────┘         └────┬───────┘
                    kv/queue (Upstash)◀────┘                │
                                         signed url upload │
                                         ┌─────────────────▼──────┐
                                         │  R2 / S3 object store  │
                                         └────────────────────────┘

	•	Edge/Serverless: Vercel/Cloudflare Workers/Deno Deploy—pick one. Needs fetch, ffmpeg binary (you can bundle wasm‑ffmpeg or call an external tiny lambda).
	•	Queue/KV: Upstash Redis (free tier) to persist {job_id → status, progress, output_url}.
	•	Storage: Cloudflare R2 (cheap, S3 API). publicRead bucket so files stream from CDN.
	•	Auth: magic‑link via Clerk/Auth0 if you care, or anonymous + rate‑limit per IP.

No k8s, no database migrations—weekend‑friendly.

⸻

4. key code sketches

create cover (edge function)

export const POST = async (req) => {
  const {youtube, character, prompt} = await req.json();
  const jobId = crypto.randomUUID();
  await kv.hset(jobId, {status:'queued', progress:0});
  queue.push(jobId);               // redis stream / durable object
  return Response.json({jobId});
};

worker loop (can run in the same edge env or separate cron)

while (job = queue.pop()) {
  try {
    audio = await downloadYouTube(youtube);
    [fullMix, isoVox] = await Promise.all([
      predictRVC(audio, character, paramsFull),
      predictRVC(audio, character, paramsIso),
    ]);
    still = await predictFlux(promptWithToken);
    vid   = await predictSonic(still, isoVox);
    final = await stitch(vid, fullMix);    // ffmpeg
    url   = await upload(final);
    await kv.hset(job, {status:'done', url});
  } catch(e) {
    await kv.hset(job, {status:'error', error:e.message});
  }
}

progress push (SSE)

frontend subscribes to /covers/:id/stream; backend does kv.pubsub.publish(jobId, payload) every time progress field mutated.

⸻

5. deployment checklist

what	how
Replicate API key	env var REPLICATE_API_TOKEN in edge settings
yt‑dl	call https://ytdl-worker.vercel.app/?url=... or bundle yt-dlp binary (10 MB)
ffmpeg	tiny ffmpeg-static npm, wasm‑ffmpeg, or call ffmpeg.cloudrun.app/merge
R2 creds	env vars; pre‑signed PUT when uploading
CORS	open on /covers/* + storage bucket
rate limits	Upstash rate‑limit middleware (5 jobs / user / day)
CI	GitHub Actions → Vercel Preview


⸻

6. corners / gotchas
	•	runtime limits: Vercel edge limits cold runtime to ~30 s; long jobs must be in background worker (Vercel cron/function with maxDuration). or use tiny Fly.io machine.
	•	Replicate timeouts: default 15 min ⇒ cap song length & diffusion steps.
	•	storage egress: Replicate delivery URLs expire; download immediately or proxy through your bucket.
	•	copyright: streaming whole YouTube audio might be sus—warn users, maybe demand they upload local file instead.
	•	character IP: Only use voices you have rights to. (squidward ≠ safe).

⸻

7. mvp punch‑list
	•	create replicate finetunes for you, squidward, maybe k‑pop idol.
	•	scaffold next.js app w/ tailwind; single page w/ form + progress.
	•	write /api/covers route + kv + background worker.
	•	wire replicate SDK calls & polling.
	•	ffmpeg stitch via wasm.
	•	upload to R2, serve via <video controls src>.

ship it monday. ez clap 💫
