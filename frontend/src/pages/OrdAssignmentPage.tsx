import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadCurrentSession, subscribeToSessionChanges } from "../lib/sessionSync";
import type { Session } from "../types/session";
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  DocumentMagnifyingGlassIcon,
  LockClosedIcon,
  ChatBubbleLeftRightIcon,
  ShoppingBagIcon,
  GlobeAltIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  FingerPrintIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

export const OrdAssignmentPage: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadCurrentSession()
      .then((currentSession) => setSession(currentSession))
      .catch(() => setLoadError("Не удалось подключиться к серверу занятия."));

    return subscribeToSessionChanges("projector", (nextSession) => {
      setSession(nextSession);
      setLoadError("");
    });
  }, []);

  const text = session?.assignmentText?.trim() ?? "";
  const hasText = text.length > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_65%_at_50%_-18%,rgba(6,182,212,0.16),transparent_48%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_95%_55%,rgba(139,92,246,0.11),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_5%_80%,rgba(20,184,166,0.07),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -36deg,
            transparent,
            transparent 14px,
            rgba(34,211,238,0.12) 14px,
            rgba(34,211,238,0.12) 15px
          )`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(45,212,191,0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45,212,191,0.35) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.028]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148,163,184,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "112px 112px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-28 -top-28 h-[460px] w-[460px] rounded-full bg-cyan-500/11 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-44 -right-28 h-[520px] w-[520px] rounded-full bg-teal-600/9 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[22%] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-violet-600/7 blur-[88px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/25 to-transparent"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 animate-ord-pulse-glow bg-[radial-gradient(circle_at_22%_78%,rgba(45,212,191,0.08),transparent_40%)]"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent shadow-[0_0_26px_rgba(34,211,238,0.3)] animate-ord-scan"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <MagnifyingGlassIcon className="absolute left-[5%] top-[16%] h-16 w-16 text-cyan-400/20 animate-ord-float drop-shadow-[0_0_20px_rgba(34,211,238,0.15)]" />
        <GlobeAltIcon className="absolute right-[9%] top-[11%] h-[4.5rem] w-[4.5rem] text-teal-400/16 animate-ord-float-slow" />
        <DocumentMagnifyingGlassIcon className="absolute left-[11%] bottom-[20%] h-14 w-14 text-cyan-300/18 animate-ord-drift" />
        <ShieldCheckIcon className="absolute right-[16%] bottom-[14%] h-[4.5rem] w-[4.5rem] text-emerald-400/14 animate-ord-float" />
        <ChatBubbleLeftRightIcon className="absolute left-[40%] top-[7%] h-11 w-11 text-cyan-500/14 animate-ord-float-slow" />
        <LockClosedIcon className="absolute right-[36%] bottom-[9%] h-12 w-12 text-slate-500/16 animate-ord-drift" />
        <ShoppingBagIcon className="absolute left-[26%] top-[34%] h-10 w-10 text-teal-400/16 animate-ord-float-slow" />
        <CpuChipIcon className="absolute right-[22%] top-[39%] h-12 w-12 text-cyan-400/14 animate-ord-float" />
        <CurrencyDollarIcon className="absolute left-[12%] bottom-[36%] h-12 w-12 text-violet-400/12 animate-ord-drift" />
        <FingerPrintIcon className="absolute right-[42%] top-[28%] h-14 w-14 text-amber-500/12 animate-ord-float-slow" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-6 flex justify-start">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-slate-950/70 px-4 py-2 text-sm font-medium text-cyan-100 shadow-[0_0_28px_-14px_rgba(34,211,238,0.8)] backdrop-blur-md transition hover:border-cyan-300/45 hover:bg-slate-900/80"
          >
            <HomeIcon className="h-4 w-4" />
            Главная
          </Link>
        </div>
        <div
          className="pointer-events-none absolute left-1/2 top-[44%] -z-10 h-[min(78vh,900px)] w-[min(100%,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] bg-slate-950/55 backdrop-blur-md ring-1 ring-slate-500/10 sm:w-[min(100%,40rem)] sm:backdrop-blur-xl"
          aria-hidden
        />
        <div className="relative z-10 flex flex-1 flex-col">
          <div className="relative mb-8">
            <span
              className="pointer-events-none absolute -left-2 -top-2 h-5 w-5 border-l-2 border-t-2 border-cyan-500/45 sm:-left-3 sm:-top-3"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute -right-2 -top-2 h-5 w-5 border-r-2 border-t-2 border-cyan-500/45 sm:-right-3 sm:-top-3"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute -bottom-2 -left-2 h-5 w-5 border-b-2 border-l-2 border-cyan-500/35 sm:-bottom-3 sm:-left-3"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute -bottom-2 -right-2 h-5 w-5 border-b-2 border-r-2 border-cyan-500/35 sm:-bottom-3 sm:-right-3"
              aria-hidden
            />

            <header className="px-1 text-center sm:px-2">
              <div className="relative mx-auto mb-7 max-w-2xl overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/55 via-slate-950/70 to-slate-950/90 px-5 py-5 shadow-[0_0_48px_-12px_rgba(245,158,11,0.22)] sm:px-7 sm:py-6">
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400/80 via-amber-500/50 to-amber-600/30"
                  aria-hidden
                />
                <h2 className="mt-2 text-balance text-xl font-bold tracking-tight text-amber-50 sm:text-xl sm:leading-tight">
                  Оперативно-розыскная деятельность
                </h2>
              </div>

              <p className="mb-3 text-xs font-medium uppercase tracking-[0.32em] text-slate-500">
                тематика занятия
              </p>
              <h1 className="text-balance text-lg font-bold tracking-tight text-cyan-50 sm:text-lg md:text-xl md:leading-snug">
                Незаконный оборот наркотических средств в
                информационно-телекоммуникационных сетях
              </h1>
            </header>
          </div>

          <div className="flex-1">
            {loadError && (
              <div className="rounded-2xl border border-red-500/35 bg-red-950/35 px-5 py-4 text-center text-sm text-red-200">
                {loadError}
              </div>
            )}

            {!loadError && !session && (
              <div className="rounded-2xl border border-slate-600/45 bg-slate-900/55 px-6 py-10 text-center text-slate-400 backdrop-blur-sm">
                Сессия ещё не запущена преподавателем.
              </div>
            )}

            {!loadError && session && !hasText && (
              <div className="rounded-2xl border border-cyan-500/22 bg-slate-900/60 px-6 py-10 text-center text-slate-400 backdrop-blur-md">
                Текст задания пока не опубликован. Преподаватель может ввести
                его в панели управления.
              </div>
            )}

            {!loadError && session && hasText && (
              <article className="rounded-2xl border border-cyan-500/28 bg-slate-950/82 px-6 py-8 shadow-[0_0_52px_-16px_rgba(34,211,238,0.2)] backdrop-blur-md sm:px-10 sm:py-10">
                <div className="mb-4 flex items-center gap-2 border-b border-cyan-500/15 pb-4">
                  <DocumentMagnifyingGlassIcon className="h-6 w-6 shrink-0 text-cyan-400/95" />
                  <span className="text-lg font-medium uppercase tracking-wide text-cyan-100/95">
                    Задание
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-lg leading-relaxed text-slate-200 sm:text-xl">
                  {text}
                </div>
              </article>
            )}
          </div>

          <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <Link
              to="/"
              className="rounded-lg px-2 py-1 text-slate-400 underline-offset-4 transition hover:text-slate-200 hover:underline"
            >
              Главная
            </Link>
            <Link
              to="/teacher"
              className="rounded-lg px-2 py-1 text-cyan-500/90 underline-offset-4 transition hover:text-cyan-300 hover:underline"
            >
              Панель преподавателя
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
};
