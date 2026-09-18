"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { RouteGuard } from "@/components/RouteGuard";
import { AppHeader } from "@/components/AppHeader";
import { api, ApiError, type AttendanceStatus, type ScanConflictBody } from "@/lib/api";
import { OutcomeOverlay, playError, vibrate, HAPTIC, useReducedMotion } from "@/components/fx";
import { ScannerFrame, type FrameColor } from "@/components/porteria/ScannerFrame";
import { SendingOverlay } from "@/components/porteria/SendingOverlay";
import { SessionScoreboard, type ScanHistoryItem } from "@/components/porteria/SessionScoreboard";
import { ClockBanner } from "@/components/porteria/ClockBanner";
import { formatBogotaTime } from "@/components/porteria/bogotaTime";
import type { ScanConfigResponse } from "@/lib/contracts";

const SCANNER_ID = "qr-scanner-region";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  temprano: "Temprano",
  a_tiempo: "A tiempo",
  tarde: "Tarde",
};

const STATUS_FRAME_COLOR: Record<AttendanceStatus, FrameColor> = {
  temprano: "g",
  a_tiempo: "y",
  tarde: "r",
};

type Phase =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "result"; status: AttendanceStatus; name: string; points: number; minutesLate: number }
  | { kind: "duplicado"; label: string; points: number }
  | { kind: "error"; message: string };

const EMPTY_STATS: Record<AttendanceStatus, number> = { temprano: 0, a_tiempo: 0, tarde: 0 };

function ScannerBody() {
  const reducedMotion = useReducedMotion();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const comboRef = useRef(0);
  // Ref además del estado: handleDecoded queda capturado una sola vez por el efecto de la cámara.
  const practiceRef = useRef(false);

  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [frameColor, setFrameColor] = useState<FrameColor>("neutral");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [stats, setStats] = useState<Record<AttendanceStatus, number>>(EMPTY_STATS);
  const [combo, setCombo] = useState(0);
  const [comboBreakSignal, setComboBreakSignal] = useState(0);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [practice, setPractice] = useState(false);
  const [scanConfig, setScanConfig] = useState<ScanConfigResponse | null>(null);

  useEffect(() => {
    api.scanConfig().then(setScanConfig).catch(() => {});
  }, []);

  /** Cambiar de modo reinicia el marcador para no mezclar prácticas con registros reales. */
  function togglePractice() {
    const next = !practiceRef.current;
    practiceRef.current = next;
    setPractice(next);
    setStats(EMPTY_STATS);
    setHistory([]);
    setCombo(0);
  }

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  /** Vuelve el marco a su color neutro un instante después de mostrar el resultado. */
  useEffect(() => {
    if (frameColor === "neutral") return;
    const t = setTimeout(() => setFrameColor("neutral"), 2600);
    return () => clearTimeout(t);
  }, [frameColor]);

  function releaseLock() {
    processingRef.current = false;
    setPhase({ kind: "idle" });
  }

  async function handleDecoded(qrToken: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    setPhase({ kind: "sending" });

    try {
      const result = practiceRef.current ? await api.practiceScanQr(qrToken) : await api.scanQr(qrToken);

      setFrameColor(STATUS_FRAME_COLOR[result.status]);
      setStats((s) => ({ ...s, [result.status]: s[result.status] + 1 }));
      setHistory((h) =>
        [{ id: `${result.scannedAt}-${result.student.id}`, name: result.student.name, status: result.status }, ...h].slice(0, 5)
      );

      if (result.status === "tarde") {
        if (comboRef.current >= 2) setComboBreakSignal((n) => n + 1);
        setCombo(0);
      } else {
        setCombo((c) => c + 1);
      }

      setPhase({
        kind: "result",
        status: result.status,
        name: practiceRef.current ? `PRÁCTICA · ${result.student.name}` : result.student.name,
        points: result.points,
        minutesLate: result.minutesLate,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.body) {
        const { existing } = err.body as ScanConflictBody;
        setFrameColor(STATUS_FRAME_COLOR[existing.status]);
        setPhase({
          kind: "duplicado",
          label: `Ya registrado: ${STATUS_LABEL[existing.status]} a las ${formatBogotaTime(existing.scannedAt)}`,
          points: existing.points,
        });
      } else {
        setFrameColor("r");
        playError();
        vibrate(HAPTIC.fail);
        setPhase({ kind: "error", message: err instanceof ApiError ? err.message : "Error al registrar" });
      }
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

  useEffect(() => {
    if (phase.kind !== "error") return;
    const t = setTimeout(releaseLock, 2800);
    return () => clearTimeout(t);
  }, [phase]);

  const busy = phase.kind !== "idle";

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <div className="mx-auto flex w-full max-w-sm items-center justify-between gap-3">
        <ClockBanner config={scanConfig} practice={practice} />
      </div>

      <div className="mx-auto w-full max-w-sm">
        <button
          type="button"
          onClick={togglePractice}
          aria-pressed={practice}
          className={`w-full rounded-2xl border-2 px-4 py-3 text-center text-sm font-black ${
            practice
              ? "border-amarillo bg-[#fff3d1] text-amarillo-oscuro"
              : "border-border bg-surface text-foreground-muted"
          }`}
        >
          {practice ? "MODO PRÁCTICA: no se guarda nada · tocar para salir" : "Activar modo práctica (capacitación)"}
        </button>
      </div>

      <div className="mx-auto w-full max-w-sm">
        <ScannerFrame scannerId={SCANNER_ID} color={frameColor} scanning={!busy} />

        {cameraError && (
          <p className="animate-shake-hard mt-4 rounded-2xl border-2 border-rojo bg-[#ffe3e3] px-4 py-3 text-center text-sm font-bold text-rojo-oscuro">
            {cameraError}
          </p>
        )}

        {phase.kind === "error" && (
          <button
            type="button"
            onClick={releaseLock}
            className={`mt-4 w-full rounded-2xl border-2 border-rojo bg-[#ffe3e3] px-4 py-3 text-center text-sm font-bold text-rojo-oscuro ${
              reducedMotion ? "" : "animate-shake-hard"
            }`}
          >
            {phase.message}
          </button>
        )}

        {!busy && !cameraError && (
          <p className="mt-4 text-center text-sm font-bold text-foreground-muted">
            Apunta la cámara al código QR del estudiante
          </p>
        )}
      </div>

      <div className="mx-auto w-full max-w-sm">
        <SessionScoreboard stats={stats} combo={combo} comboBreakSignal={comboBreakSignal} history={history} />
      </div>

      {phase.kind === "sending" && <SendingOverlay />}

      {phase.kind === "result" && (
        <OutcomeOverlay
          status={phase.status}
          name={phase.name}
          points={phase.points}
          minutesLate={phase.minutesLate}
          autoCloseMs={2200}
          onDone={releaseLock}
        />
      )}

      {phase.kind === "duplicado" && (
        <OutcomeOverlay status="duplicado" name={phase.label} points={phase.points} autoCloseMs={2200} onDone={releaseLock} />
      )}
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
