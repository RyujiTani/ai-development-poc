export const toast = {
  success: (message: string) => {
    if (typeof window !== 'undefined') {
      const toastEl = document.createElement('div');
      toastEl.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 text-sm font-medium';
      toastEl.innerText = message;
      document.body.appendChild(toastEl);
      setTimeout(() => {
        toastEl.style.opacity = '0';
        setTimeout(() => toastEl.remove(), 300);
      }, 3000);
    }
  },
  error: (message: string) => {
    if (typeof window !== 'undefined') {
      const toastEl = document.createElement('div');
      toastEl.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 text-sm font-medium';
      toastEl.innerText = message;
      document.body.appendChild(toastEl);
      setTimeout(() => {
        toastEl.style.opacity = '0';
        setTimeout(() => toastEl.remove(), 300);
      }, 3000);
    }
  }
};
"
    },
    {