<script setup lang="ts">
defineOptions({
  name: 'HomePage',
});
</script>

<template>
  <main class="min-h-dvh bg-slate-950 text-slate-100">
    <div class="mx-auto flex min-h-dvh max-w-6xl flex-col px-6 py-10 lg:px-8">
      <header class="flex flex-col gap-6 border-b border-slate-800 pb-8">
        <div
          class="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300"
        >
          <span class="h-2 w-2 rounded-full bg-cyan-400" />
          Voice transcription
        </div>

        <div class="max-w-3xl space-y-4">
          <h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Vocali</h1>
          <p class="text-lg text-slate-300">
            Record speech, upload audio files, and keep all your transcripts in one place.
          </p>
          <p class="text-sm leading-6 text-slate-400">
            Sign in to manage your recordings, review past transcriptions, and download completed
            results whenever you need them.
          </p>
        </div>
      </header>

      <section class="grid gap-6 py-8 lg:grid-cols-[1.3fr_0.7fr]">
        <article
          class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20"
        >
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-white">Turn audio into searchable text</h2>
              <p class="mt-1 text-sm text-slate-400">
                Vocali helps you capture spoken content and organize it as text you can revisit,
                manage, and download.
              </p>
            </div>
            <span
              class="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cyan-300"
            >
              Ready to use
            </span>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Upload</h3>
              <ul class="mt-3 space-y-2 text-sm text-slate-400">
                <li>• Send audio files for transcription</li>
                <li>• Support for recordings up to 20 MB</li>
                <li>• Keep track of processing status</li>
                <li>• Prepare transcripts for download and review</li>
              </ul>
            </div>

            <div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Workspace
              </h3>
              <ul class="mt-3 space-y-2 text-sm text-slate-400">
                <li>• Create an account and sign in securely</li>
                <li>• Access a personal dashboard and history view</li>
                <li>• Browse recent transcription jobs</li>
                <li>• Keep recordings and transcripts organized</li>
              </ul>
            </div>
          </div>
        </article>

        <aside
          class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20"
        >
          <h2 class="text-lg font-semibold text-white">What you can do</h2>
          <ul class="mt-4 space-y-3 text-sm text-slate-300">
            <li class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              Create an account and manage your session securely
            </li>
            <li class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              Access a private dashboard for your recordings and transcripts
            </li>
            <li class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              Review a dedicated history view for past transcription jobs
            </li>
            <li class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              Prepare for file uploads, live recording, and transcript downloads
            </li>
          </ul>
        </aside>
      </section>

      <section class="grid gap-6 pb-8 lg:grid-cols-2">
        <article class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 class="text-lg font-semibold text-white">Built for everyday voice workflows</h2>
          <div class="mt-4 space-y-4">
            <div>
              <h3 class="text-sm font-medium text-cyan-300">Meetings and calls</h3>
              <p class="mt-1 text-sm text-slate-400">
                Keep a written record of conversations, interviews, and team syncs so they are
                easier to review later.
              </p>
            </div>
            <div>
              <h3 class="text-sm font-medium text-cyan-300">Notes and voice memos</h3>
              <p class="mt-1 text-sm text-slate-400">
                Turn spoken ideas into text quickly and keep them together with the rest of your
                transcript history.
              </p>
            </div>
          </div>
        </article>

        <article class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 class="text-lg font-semibold text-white">Inside your account</h2>
          <ul class="mt-4 space-y-3 text-sm text-slate-400">
            <li>• A secure sign-in experience backed by Cognito</li>
            <li>• A dashboard for managing your transcription activity</li>
            <li>• A history page with room for pagination and status tracking</li>
            <li>• A foundation for uploads, live capture, and transcript downloads</li>
          </ul>
        </article>
      </section>

      <footer class="mt-auto border-t border-slate-800 pt-6 text-sm text-slate-500">
        Capture speech, organize recordings, and keep your transcripts within reach.
      </footer>
    </div>
  </main>
</template>
