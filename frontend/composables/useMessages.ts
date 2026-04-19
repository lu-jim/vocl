type MessageType = 'error' | 'success' | 'warning';

type Message = {
  type: MessageType;
  text: string;
};

export const useMessages = () => {
  const messages = ref<Message[]>([]);

  const errorMessage = computed(() => 
    messages.value.find(m => m.type === 'error')?.text ?? ''
  );

  const successMessage = computed(() => 
    messages.value.find(m => m.type === 'success')?.text ?? ''
  );

  const warningMessage = computed(() => 
    messages.value.find(m => m.type === 'warning')?.text ?? ''
  );

  const setError = (text: string) => {
    clearMessages();
    if (text) {
      messages.value.push({ type: 'error', text });
    }
  };

  const setSuccess = (text: string) => {
    clearMessages();
    if (text) {
      messages.value.push({ type: 'success', text });
    }
  };

  const setWarning = (text: string) => {
    clearMessages();
    if (text) {
      messages.value.push({ type: 'warning', text });
    }
  };

  const clearMessages = () => {
    messages.value = [];
  };

  const clearError = () => {
    messages.value = messages.value.filter(m => m.type !== 'error');
  };

  const clearSuccess = () => {
    messages.value = messages.value.filter(m => m.type !== 'success');
  };

  return {
    messages,
    errorMessage,
    successMessage,
    warningMessage,
    setError,
    setSuccess,
    setWarning,
    clearMessages,
    clearError,
    clearSuccess,
  };
};
