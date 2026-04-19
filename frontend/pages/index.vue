<script setup lang="ts">
import { Upload, Mic, History, ArrowRight } from 'lucide-vue-next';

defineOptions({
  name: 'HomePage',
});

useSeoMeta({
  title: 'Vocali - Audio Transcription Platform',
  description: 'Record speech, upload audio files, and keep all your transcripts in one place.',
});

const features = [
  {
    icon: Upload,
    title: 'Batch Upload',
    description: 'Send audio files for transcription with support for recordings up to 20 MB.',
  },
  {
    icon: Mic,
    title: 'Live Recording',
    description: 'Record directly from your microphone with real-time transcription.',
  },
  {
    icon: History,
    title: 'History',
    description: 'Browse recent transcription jobs and download completed results.',
  },
];
</script>

<template>
  <div class="space-y-16">
    <!-- Hero section -->
    <section class="space-y-6">
      <div class="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">
        <span class="h-2 w-2 rounded-full bg-foreground" />
        Audio transcription platform
      </div>

      <div class="max-w-2xl space-y-4">
        <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn audio into text
        </h1>
        <p class="text-lg text-muted-foreground">
          Record speech, upload audio files, and keep all your transcripts in one place.
          Sign in to manage your recordings and download completed results.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <Button size="lg" as-child>
          <NuxtLink to="/register">
            Get started
            <ArrowRight class="ml-2 h-4 w-4" />
          </NuxtLink>
        </Button>
        <Button variant="outline" size="lg" as-child>
          <NuxtLink to="/login">Sign in</NuxtLink>
        </Button>
      </div>
    </section>

    <!-- Features grid -->
    <section class="space-y-6">
      <h2 class="text-2xl font-semibold tracking-tight">What you can do</h2>

      <div class="grid gap-4 sm:grid-cols-3">
        <Card v-for="feature in features" :key="feature.title">
          <CardHeader>
            <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-border">
              <component :is="feature.icon" class="h-5 w-5" />
            </div>
            <CardTitle class="text-base">{{ feature.title }}</CardTitle>
            <CardDescription>{{ feature.description }}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>

    <!-- Use cases -->
    <section class="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Built for everyday voice workflows</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div>
            <h3 class="text-sm font-medium">Meetings and calls</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Keep a written record of conversations, interviews, and team syncs so they are
              easier to review later.
            </p>
          </div>
          <Separator />
          <div>
            <h3 class="text-sm font-medium">Notes and voice memos</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Turn spoken ideas into text quickly and keep them together with the rest of your
              transcript history.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inside your account</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="space-y-3 text-sm text-muted-foreground">
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
              A secure sign-in experience backed by AWS Cognito
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
              A dashboard for managing your transcription activity
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
              A history page with status tracking for all jobs
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
              Support for file uploads, live capture, and transcript downloads
            </li>
          </ul>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
