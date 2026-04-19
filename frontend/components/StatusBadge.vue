<script setup lang="ts">
import { cva } from 'class-variance-authority';
import type { TranscriptionStatus } from '~/types/api';
import { cn } from '~/lib/utils';

const props = defineProps<{
  status: TranscriptionStatus | string;
  class?: string;
}>();

const badgeVariants = cva(
  'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        completed: 'bg-green-100 text-green-800 border-green-200',
        uploaded: 'bg-blue-100 text-blue-800 border-blue-200',
        processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        failed: 'bg-red-100 text-red-800 border-red-200',
      },
    },
    defaultVariants: {
      status: 'uploaded',
    },
  }
);

const statusLabels: Record<string, string> = {
  completed: 'Completed',
  uploaded: 'Uploaded',
  processing: 'Processing',
  failed: 'Failed',
};

const normalizedStatus = computed(() => {
  const s = props.status as TranscriptionStatus;
  return ['completed', 'uploaded', 'processing', 'failed'].includes(s) ? s : 'uploaded';
});

const label = computed(() => statusLabels[props.status] ?? props.status);
</script>

<template>
  <span :class="cn(badgeVariants({ status: normalizedStatus }), props.class)">
    {{ label }}
  </span>
</template>
