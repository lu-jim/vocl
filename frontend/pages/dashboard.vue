<script setup lang="ts">
import { Upload, Mic, History, Download } from 'lucide-vue-next';

import ToolCard from '~/components/dashboard/ToolCard.vue';
import { useAuth } from '~/composables/useAuth';
import { getTimeGreeting } from '~/utils/format';

defineOptions({
  name: 'DashboardPage',
});

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

const { user } = useAuth();

const displayName = computed(() => {
  if (!user.value) {
    return 'there';
  }
  const signInDetails = user.value.signInDetails as { loginId?: string } | undefined;
  const name = signInDetails?.loginId || user.value.username || '';
  return name.split('@')[0] || 'there';
});

const greeting = computed(() => getTimeGreeting());

const tools = [
  {
    title: 'Batch Transcription',
    description: 'Upload audio files for transcription processing',
    icon: Upload,
    to: '/transcribe',
  },
  {
    title: 'Live Recording',
    description: 'Record from your microphone with real-time transcription',
    icon: Mic,
    to: '/record',
  },
  {
    title: 'History',
    description: 'View and manage your past transcription jobs',
    icon: History,
    to: '/history',
  },
  {
    title: 'Downloads',
    description: 'Access and download your completed transcripts',
    icon: Download,
    to: '/history',
  },
];
</script>

<template>
  <div data-testid="dashboard-page" class="space-y-8">
    <!-- Header -->
    <div>
      <p class="text-sm text-muted-foreground">My Workspace</p>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ greeting }}, {{ displayName }}
      </h1>
    </div>

    <!-- Tool cards grid -->
    <div class="grid gap-4 sm:grid-cols-2">
      <ToolCard
        v-for="tool in tools"
        :key="tool.to + tool.title"
        :title="tool.title"
        :description="tool.description"
        :icon="tool.icon"
        :to="tool.to"
      />
    </div>

    <!-- Recent activity section -->
    <section>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-medium">Recent Transcriptions</h2>
        <Button variant="ghost" size="sm" as-child>
          <NuxtLink to="/history">View all</NuxtLink>
        </Button>
      </div>

      <Card>
        <CardContent class="py-8 text-center">
          <p class="text-sm text-muted-foreground">
            Your recent transcriptions will appear here.
          </p>
          <div class="mt-4 flex justify-center gap-2">
            <Button variant="outline" as-child>
              <NuxtLink to="/transcribe">
                <Upload class="mr-2 h-4 w-4" />
                Upload audio
              </NuxtLink>
            </Button>
            <Button variant="outline" as-child>
              <NuxtLink to="/record">
                <Mic class="mr-2 h-4 w-4" />
                Start recording
              </NuxtLink>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
