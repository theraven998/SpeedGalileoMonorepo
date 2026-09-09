"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { RouteGuard } from "@/components/RouteGuard";
import { AppHeader } from "@/components/AppHeader";
import { api, ApiError } from "@/lib/api";

const SCANNER_ID = "qr-scanner-region";
const STATUS_LABEL: Record<string, string> = {
  temprano: "Temprano",
  a_tiempo: "A tiempo",
  tarde: "Tarde",
};
/** verde = 3 pts (acierto), amarillo = 2 pts (casi casi), rojo = 0 pts (portería cerrada) — misma escala del sistema. */
const STATUS_TILE: Record<string, string> = {
  temprano: "score-tile--g",
  a_tiempo: "score-tile--y",
  tarde: "score-tile--r",
};

interface LastScan {
  name: string;
  status: string;
  points: number;
  time: string;
}

function ScannerBody() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const [lastScan, setLastScan] = useState<LastScan | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  async function handleDecoded(qrToken: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    setMessage(null);

    try {
      const result = await api.scanQr(qrToken);
      setLastScan({
        name: result.student.name,
        status: result.status,
        points: result.points,
        time: new Date(result.scannedAt).toLocaleTimeString("es-CO"),
      });
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Error al registrar");
    } finally {
      setTimeout(() => {
        processingRef.current = false;
      }, 1500);
    }
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
        // El efecto ya se desmontó (ej. Strict Mode en dev) antes de que la cámara terminara de iniciar.
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

  return (
    <main className="flex flex-1 flex-col px-4 py-5">
      <div className="mx-auto w-full max-w-sm">
        <div
          id={SCANNER_ID}
          className="mx-auto overflow-hidden rounded-3xl border-2 border-border bg-black"
        />

        {cameraError && (
          <p className="animate-shake mt-4 rounded-2xl border-2 border-rojo bg-[#ffe3e3] px-4 py-3 text-center text-sm font-bold text-rojo-oscuro">
            {cameraError}
          </p>
        )}
        {message && (
          <p className="animate-shake mt-4 rounded-2xl border-2 border-rojo bg-[#ffe3e3] px-4 py-3 text-center text-sm font-bold text-rojo-oscuro">
            {message}
          </p>
        )}

        {lastScan && (
          <div key={lastScan.time} className={`score-tile animate-pop mt-6 ${STATUS_TILE[lastScan.status]}`}>
            {lastScan.status !== "tarde" && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src="/personajes/galileo-t.png"
                alt=""
                className="animate-bounce-sm mx-auto -mt-3 h-24 w-auto max-w-none"
              />
            )}
            <p className="mt-2 text-xl font-black">{lastScan.name}</p>
            <p className="mt-1 text-sm font-extrabold uppercase tracking-widest opacity-90">
              {STATUS_LABEL[lastScan.status]} · {lastScan.points} pts
            </p>
            <p className="mt-1 text-xs font-bold opacity-80">{lastScan.time}</p>
          </div>
        )}

        {!lastScan && !cameraError && (
          <p className="mt-6 text-center text-sm font-bold text-foreground-muted">
            Apunta la cámara al código QR del estudiante
          </p>
        )}
      </div>
    </main>
  );
}

export default function PorteriaPage() {
  return (
    <RouteGuard allow={["profesor"]}>
      <AppHeader title="Escáner de portería" />
      <ScannerBody />
    </RouteGuard>
  );
}
