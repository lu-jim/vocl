<script setup lang="ts">
import { cva } from 'class-variance-authority';
import { cn } from '~/lib/utils';

const props = defineProps<{
  variant?: 'error' | 'success' | 'warning' | 'info';
  class?: string;
}>();

const alertVariants = cva(
  'rounded-lg border p-4 text-sm',
  {
    variants: {
      variant: {
        error: 'border-red-200 bg-red-50 text-red-800',
        success: 'border-green-200 bg-green-50 text-green-800',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
        info: 'border-blue-200 bg-blue-50 text-blue-800',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);
</script>

<template>
  <div :class="cn(alertVariants({ variant }), props.class)">
    <slot />
  </div>
</template>
