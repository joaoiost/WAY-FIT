import { useEffect, useRef, useState, useCallback } from 'react';

// Busca dados "presos" a um id (ex: aluno selecionado) sem race condition:
// se o id mudar no meio de uma busca em andamento, o resultado antigo é
// descartado ao chegar. Substitui o padrão `loadedForRef` que estava
// duplicado em AlunoDetalhe, AvaliacaoFisica e NutricaoPlanoAluno.
export function useScopedLoader(scopeId, loader) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(scopeId != null);
  const [error, setError] = useState(null);
  const scopeRef = useRef(scopeId);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(() => {
    scopeRef.current = scopeId;
    if (scopeId == null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const requested = scopeId;
    setLoading(true);
    setError(null);
    Promise.resolve(loaderRef.current(requested))
      .then((result) => {
        if (scopeRef.current !== requested) return;
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (scopeRef.current !== requested) return;
        setError(err);
        setLoading(false);
      });
  }, [scopeId]);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, setData, reload: run };
}
