// Bus de eventos simples pra toasts globais — sem precisar de Context/Provider
// em cada página. Qualquer arquivo pode chamar toast.error('mensagem').
let listeners = [];
let nextId = 1;

function emit(type, message) {
  const id = nextId++;
  listeners.forEach(fn => fn({ id, type, message }));
}

export const toast = {
  error: (message) => emit('error', message),
  success: (message) => emit('success', message),
  subscribe: (fn) => {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  },
};
