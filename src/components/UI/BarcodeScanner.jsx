import { useState, useEffect, useRef } from 'react';
import { X, Camera, Loader, AlertCircle } from 'lucide-react';

const BARCODE_SUPPORT = typeof window !== 'undefined' && 'BarcodeDetector' in window;

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const runningRef = useRef(false);
  const [phase, setPhase] = useState('starting');
  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (BARCODE_SUPPORT) {
      startCamera();
    } else {
      setPhase('error');
      setErrorMsg('Scanner não suportado neste browser. Digite o código abaixo.');
    }
    return cleanup;
  }, []);

  function cleanup() {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        startScan();
      }
    } catch (e) {
      setPhase('error');
      setErrorMsg(
        e.name === 'NotAllowedError'
          ? 'Acesso à câmera negado. Permita nas configurações do browser.'
          : 'Câmera não disponível neste dispositivo.'
      );
    }
  }

  async function startScan() {
    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
    });
    runningRef.current = true;
    setPhase('scanning');

    async function tick() {
      if (!runningRef.current) return;
      const vid = videoRef.current;
      if (vid && vid.readyState >= 2) {
        try {
          const codes = await detector.detect(vid);
          if (codes.length > 0) {
            runningRef.current = false;
            cleanup();
            fetchProduct(codes[0].rawValue);
            return;
          }
        } catch {}
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  async function fetchProduct(code) {
    setPhase('fetching');
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${code}?fields=product_name,nutriments,brands`,
        { signal: AbortSignal.timeout(10000) }
      );
      const json = await res.json();
      if (!json.product?.product_name) {
        setPhase('error');
        setErrorMsg(`Código ${code} não encontrado. Tente outro produto ou digite manualmente.`);
        return;
      }
      const p = json.product;
      const n = p.nutriments || {};
      onResult({
        name:      p.product_name,
        category:  p.brands ? `${p.brands} · escaneado` : 'Escaneado',
        kcal:      Math.round(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0),
        protein_g: parseFloat((n.proteins_100g || 0).toFixed(1)),
        carbs_g:   parseFloat((n.carbohydrates_100g || 0).toFixed(1)),
        fat_g:     parseFloat((n.fat_100g || 0).toFixed(1)),
        fiber_g:   parseFloat((n.fiber_100g || 0).toFixed(1)),
      });
    } catch {
      setPhase('error');
      setErrorMsg('Erro ao buscar produto. Verifique a conexão e tente novamente.');
    }
  }

  async function handleManual(e) {
    e.preventDefault();
    const code = manualCode.replace(/\D/g, '');
    if (!code) return;
    cleanup();
    await fetchProduct(code);
  }

  function retry() {
    setPhase('starting');
    setErrorMsg('');
    setManualCode('');
    startCamera();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(0,0,0,0.9)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Camera size={18} color="white" />
          <span style={{ color: 'white', fontSize: 15, fontWeight: 700 }}>Código de barras</span>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', lineHeight: 1 }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <video
          ref={videoRef} playsInline muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: phase === 'scanning' || phase === 'starting' ? 'block' : 'none' }}
        />

        {phase === 'scanning' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
            <div style={{ position: 'relative', width: '78%', maxWidth: 300, aspectRatio: '3/1.5', zIndex: 1 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 22, height: 22, borderTop: '3px solid white', borderLeft: '3px solid white', borderRadius: '3px 0 0 0' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: 22, height: 22, borderTop: '3px solid white', borderRight: '3px solid white', borderRadius: '0 3px 0 0' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: 22, height: 22, borderBottom: '3px solid white', borderLeft: '3px solid white', borderRadius: '0 0 0 3px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderBottom: '3px solid white', borderRight: '3px solid white', borderRadius: '0 0 3px 0' }} />
              <div style={{ position: 'absolute', left: 4, right: 4, height: 2, background: 'rgba(99,102,241,0.9)', borderRadius: 1, animation: 'scanBounce 1.8s ease-in-out infinite', boxShadow: '0 0 8px rgba(99,102,241,0.8)' }} />
            </div>
            <p style={{ position: 'relative', zIndex: 1, marginTop: 20, color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
              Aponte para o código de barras
            </p>
          </div>
        )}

        {phase === 'fetching' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <Loader size={40} color="white" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, margin: 0 }}>Buscando produto...</p>
          </div>
        )}

        {(phase === 'starting') && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader size={28} color="rgba(255,255,255,0.6)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {phase === 'error' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 0', gap: 16 }}>
            <AlertCircle size={42} color="#F59E0B" />
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center', lineHeight: 1.6, margin: 0 }}>{errorMsg}</p>
            {BARCODE_SUPPORT && (
              <button onClick={retry} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Tentar novamente
              </button>
            )}
          </div>
        )}
      </div>

      {(phase === 'scanning' || phase === 'error') && (
        <div style={{ padding: '14px 20px', background: 'rgba(0,0,0,0.9)', flexShrink: 0 }}>
          <form onSubmit={handleManual} style={{ display: 'flex', gap: 8 }}>
            <input
              value={manualCode} onChange={e => setManualCode(e.target.value)}
              placeholder="Ou digite o código de barras..."
              inputMode="numeric"
              style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 14, outline: 'none' }}
            />
            <button type="submit" disabled={!manualCode.trim()}
              style={{ padding: '11px 18px', borderRadius: 10, background: manualCode.trim() ? '#6366F1' : 'rgba(255,255,255,0.08)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: manualCode.trim() ? 'pointer' : 'not-allowed' }}>
              OK
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes scanBounce { 0% { top: 5%; } 50% { top: 85%; } 100% { top: 5%; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
