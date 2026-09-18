"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { RouteGuard } from "@/components/RouteGuard";
import { AppHeader } from "@/components/AppHeader";
import { api, ApiError } from "@/lib/api";
import { playError, vibrate, HAPTIC, useReducedMotion } from "@/components/fx";
import { ScannerFrame, type FrameColor } from "@/components/porteria/ScannerFrame";
import { SendingOverlay } from "@/components/porteria/SendingOverlay";

const SCANNER_ID = "qr-lookup-scanner-region";
const RESULT_MS = 2200;

type Phase = { kind: "idle" } | { kind: "sending" } | { kind: "found"; name: string } | { kind: "not_found" };

function ScannerBody() {
  const reducedMotion = useReducedMotion();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [frameColor, setFrameColor] = useState<FrameColor>("neutral");
  const [cameraError, setCameraError] = useState<string | null>(null);

  function releaseLock() {
    processingRef.current = false;
    setPhase({ kind: "idle" });
    setFrameColor("neutral");
  }

  async function handleDecoded(qrToken: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    setPhase({ kind: "sending" });

    try {
      // Solo lectura: no crea asistencia ni toca ningún registro.
      const result = await api.lookupQr(qrToken);
      setFrameColor("g");
      setPhase({ kind: "found", name: result.name });
    } catch (err) {
      setFrameColor("r");
      if (!(err instanceof ApiError && err.status === 404)) playError();
      vibrate(HAPTIC.fail);
      setPhase({ kind: "not_found" });
    }

    setTimeout(releaseLock, RESULT_MS);
  }

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;
    let unmounted = false;

    function stopIfRunning() {
      if (
        scanner.getState() === Html5QrcodeScannerState.SCANNING ||
        scanner.getState() === Html5QrcodeScannerState.PAUSED
      ) {
        scanner.stop().catch(() => {});
      }
    }

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleDecoded(decodedText),
        () => {
          /* ignorar errores de frame sin QR */
        }
      )
      .then(() => {
        if (unmounted) stopIfRunning();
      })
      .catch(() => {
        if (!unmounted) setCameraError("No se pudo acceder a la cámara. Revisa permisos del navegador.");
      });

    return () => {
      unmounted = true;
      stopIfRunning();
    };
  }, []);

  const busy = phase.kind !== "idle";

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <div className="mx-auto w-full max-w-sm">
        <ScannerFrame scannerId={SCANNER_ID} color={frameColor} scanning={!busy} />

        {cameraError && (
          <p className={`mt-4 rounded-2xl border-2 border-rojo bg-[#ffe3e3] px-4 py-3 text-center text-sm font-bold text-rojo-oscuro ${reducedMotion ? "" : "animate-shake-hard"}`}>
            {cameraError}
          </p>
        )}

        {!busy && !cameraError && (
          <p className="mt-4 text-center text-sm font-bold text-foreground-muted">
            Apunta la cámara al sticker QR para ver de quién es
          </p>
        )}

        {phase.kind === "found" && (
          <div className="mt-4 rounded-2xl border-2 border-verde bg-[#e3fbd4] px-4 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-verde-oscuro">Este QR es de</p>
            <p className="mt-1 text-2xl font-black text-foreground">{phase.name}</p>
          </div>
        )}

        {phase.kind === "not_found" && (
          <div className={`mt-4 rounded-2xl border-2 border-rojo bg-[#ffe3e3] px-4 py-4 text-center text-sm font-bold text-rojo-oscuro ${reducedMotion ? "" : "animate-shake-hard"}`}>
            Ese QR no corresponde a ningún estudiante activo
          </div>
        )}
      </div>

      {phase.kind === "sending" && <SendingOverlay />}
    </main>
  );
}

export default function ValidarQrPage() {
  return (
    <RouteGuard allow={["coordinacion", "profesor"]}>
      <AppHeader title="Validar sticker QR" />
      <ScannerBody />
    </RouteGuard>
  );
}
