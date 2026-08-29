import { useEffect } from 'react';

// Safari (principalmente iOS) decide a cor nativa de autofill/campo de
// texto olhando o color-scheme do <html>, não de uma div aninhada — sem
// isso, celular no modo escuro do sistema pinta o texto digitado em
// branco sobre fundo branco nas telas novas (claras) do app.
export function useLightScheme() {
  useEffect(() => {
    const prev = document.documentElement.style.colorScheme;
    document.documentElement.style.colorScheme = 'light';
    return () => { document.documentElement.style.colorScheme = prev; };
  }, []);
}
