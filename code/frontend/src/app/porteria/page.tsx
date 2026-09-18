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
import type { ScanConfigResponse, DocumentLookupResponse } from "@/lib/contracts";
import type { ScanResponse } from "@/lib/api";

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

  // Panel "sin QR": busca por documento, muestra al estudiante y pide confirmación antes de registrar.
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [docValue, setDocValue] = useState("");
  const [docLookup, setDocLookup] = useState<DocumentLookupResponse | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

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

  /** Núcleo compartido: escaneo por QR y registro por documento terminan en el mismo overlay/historial. */
  async function runScan(fetcher: () => Promise<ScanResponse>, source: "qr" | "documento") {
    if (processingRef.current) return;
    processingRef.current = true;
    setPhase({ kind: "sending" });

    try {
      const result = await fetcher();

      setFrameColor(STATUS_FRAME_COLOR[result.status]);
      setStats((s) => ({ ...s, [result.status]: s[result.status] + 1 }));
      setHistory((h) =>
        [
          { id: `${result.scannedAt}-${result.student.id}`, name: result.student.name, status: result.status, source },
          ...h,
        ].slice(0, 5)
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

  function handleDecoded(qrToken: string) {
    void runScan(() => (practiceRef.current ? api.practiceScanQr(qrToken) : api.scanQr(qrToken)), "qr");
  }

  function openDocPanel() {
    setShowDocPanel(true);
    setDocValue("");
    setDocLookup(null);
    setDocError(null);
  }

  function closeDocPanel() {
    setShowDocPanel(false);
    setDocValue("");
    setDocLookup(null);
    setDocError(null);
    setDocLoading(false);
  }

  async function handleSearchDocument() {
    const trimmed = docValue.trim();
    if (!trimmed || docLoading) return;

    setDocLoading(true);
    setDocError(null);
    setDocLookup(null);

    try {
      const result = await api.lookupDocument(trimmed);
      setDocLookup(result);
    } catch (err) {
      setDocError(err instanceof ApiError ? err.message : "Error al buscar el documento");
    } finally {
      setDocLoading(false);
    }
  }

  async function handleConfirmDocument() {
    if (!docLookup || processingRef.current) return;
    const document = docValue.trim();
    const wasPractice = practiceRef.current;
    closeDocPanel();
    await runScan(() => (wasPractice ? api.practiceScanDocument(document) : api.scanDocument(document)), "documento");
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

  // Mientras el panel de documento está abierto, pausar la cámara: evita decodificar un QR de fondo.
  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (showDocPanel) {
        if (scanner.getState() === Html5QrcodeScannerState.SCANNING) scanner.pause(true);
      } else if (scanner.getState() === Html5QrcodeScannerState.PAUSED) {
        scanner.resume();
      }
    } catch {
      /* cámara todavía no lista o ya detenida: ignorar */
    }
  }, [showDocPanel]);

  useEffect(() => {
    if (!showDocPanel) return;
    docInputRef.current?.focus();
  }, [showDocPanel]);

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
        <button
          type="button"
          onClick={openDocPanel}
          disabled={busy}
          className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-center text-sm font-black text-accent disabled:opacity-60"
        >
          ¿Sin QR? Ingresar documento
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

      {showDocPanel && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Registrar ingreso por documento"
          className="fixed inset-0 z-[950] flex items-center justify-center bg-black/40 px-4"
          onClick={closeDocPanel}
        >
          <div
            className="card-hard w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-black text-foreground">Registrar sin QR</h2>
            <p className="mt-1 text-sm font-bold text-foreground-muted">
              Escribe el número de documento del estudiante.
            </p>

            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (docLookup) {
                  void handleConfirmDocument();
                } else {
                  void handleSearchDocument();
                }
              }}
            >
              <input
                ref={docInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Número de documento"
                value={docValue}
                disabled={docLoading}
                onChange={(e) => {
                  setDocValue(e.target.value);
                  setDocLookup(null);
                  setDocError(null);
                }}
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-center text-lg font-black tracking-wide text-foreground focus:border-accent focus:outline-none"
              />

              {docError && (
                <p className="rounded-2xl border-2 border-rojo bg-[#ffe3e3] px-4 py-2 text-center text-sm font-bold text-rojo-oscuro">
                  {docError}
                </p>
              )}

              {docLookup && (
                <div className="rounded-2xl border-2 border-border bg-background-alt px-4 py-3 text-center">
                  <p className="text-base font-black text-foreground">{docLookup.student.name}</p>
                  <p className="text-sm font-bold text-foreground-muted">{docLookup.course.name}</p>
                  {docLookup.alreadyToday && (
                    <p className="mt-2 text-xs font-black uppercase tracking-wide text-amarillo-oscuro">
                      Ya tiene registro hoy
                    </p>
                  )}
                </div>
              )}

              {!docLookup ? (
                <button
                  type="submit"
                  disabled={!docValue.trim() || docLoading}
                  className="w-full rounded-2xl border-2 border-border bg-accent px-4 py-3 text-center text-sm font-black text-white disabled:opacity-60"
                >
                  {docLoading ? "Buscando…" : "Buscar"}
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full rounded-2xl border-2 border-border bg-primary px-4 py-3 text-center text-sm font-black text-white"
                >
                  {practice ? "Registrar ingreso (práctica)" : "Registrar ingreso"}
                </button>
              )}

              <button
                type="button"
                onClick={closeDocPanel}
                className="w-full rounded-2xl border-2 border-border bg-surface px-4 py-3 text-center text-sm font-black text-foreground-muted"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

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
