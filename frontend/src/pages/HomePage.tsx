import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DiscoveredLessonServer,
  defaultServerBase,
  fetchServerSession,
  hasStoredServerBase,
  lanUrls,
  resetServerBase,
  serverBase,
  setServerBase,
} from "../lib/api";
import { PresenceCounts, subscribeToPresence } from "../lib/sessionSync";
import type { Session } from "../types/session";
import {
  AcademicCapIcon,
  UserCircleIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  LinkIcon,
  ServerStackIcon,
} from "@heroicons/react/24/outline";

const cards: {
  to: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  {
    to: "/teacher",
    title: "Преподаватель",
    description: "Запуск сессии, задание, работа с ответами студентов.",
    icon: AcademicCapIcon,
    accent:
      "border-emerald-400/35 bg-emerald-950/25 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-900/30",
  },
  {
    to: "/student",
    title: "Студент",
    description: "Скачать материалы и отправить выполненное задание.",
    icon: UserCircleIcon,
    accent:
      "border-sky-400/35 bg-sky-950/25 text-sky-200 hover:border-sky-300/50 hover:bg-sky-900/30",
  },
  {
    to: "/ord",
    title: "Проектор",
    description: "Экран задания: НОН, ИТК, интернет-среда.",
    icon: GlobeAltIcon,
    accent:
      "border-cyan-400/35 bg-cyan-950/30 text-cyan-100 hover:border-cyan-300/50 hover:bg-cyan-900/35",
  },
];

export const HomePage: React.FC = () => {
  const [serverInput, setServerInput] = useState(serverBase);
  const [discoveredServers, setDiscoveredServers] = useState<
    DiscoveredLessonServer[]
  >([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [presence, setPresence] = useState<PresenceCounts>({
    teachers: 0,
    students: 0,
    projectors: 0,
    dashboards: 0,
    total: 0,
  });
  const isDesktop = Boolean(window.lessonSystem?.isDesktop);
  const isUsingLocalDesktopServer = isDesktop && serverBase === defaultServerBase;
  const shareBase =
    isUsingLocalDesktopServer && lanUrls.length > 0 ? lanUrls[0] : serverBase;

  const roleLinks = useMemo(
    () => [
      { title: "Преподаватель", url: `${shareBase}/teacher` },
      { title: "Проектор", url: `${shareBase}/ord` },
      { title: "Студент", url: `${shareBase}/student` },
    ],
    [shareBase],
  );

  const handleServerSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setServerBase(serverInput);
    window.location.reload();
  };

  const handleResetServer = () => {
    resetServerBase();
    window.location.reload();
  };

  useEffect(() => {
    if (!window.lessonSystem?.getDiscoveredServers) return;

    const applyServers = (servers: DiscoveredLessonServer[]) => {
      setDiscoveredServers(servers);
    };

    window.lessonSystem.getDiscoveredServers().then(applyServers).catch(() => {
      setDiscoveredServers([]);
    });

    return window.lessonSystem.onDiscoveredServersChanged?.(applyServers);
  }, []);

  useEffect(() => {
    if (!isDesktop || hasStoredServerBase()) return;
    let cancelled = false;

    const connectToActiveServer = async () => {
      const advertisedActiveServer = discoveredServers.find(
        (server) => server.hasSession,
      );
      if (advertisedActiveServer) {
        setServerBase(advertisedActiveServer.url);
        window.location.reload();
        return;
      }

      for (const server of discoveredServers) {
        const session = await fetchServerSession<Session>(server.url);
        if (cancelled) return;
        if (session) {
          setServerBase(server.url);
          window.location.reload();
          return;
        }
      }
    };

    if (discoveredServers.length > 0) {
      void connectToActiveServer();
    }

    return () => {
      cancelled = true;
    };
  }, [discoveredServers, isDesktop]);

  useEffect(() => {
    return subscribeToPresence(
      "dashboard",
      setPresence,
      setIsRealtimeConnected,
    );
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(16,185,129,0.12),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(56,189,248,0.08),transparent_45%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-14 sm:max-w-xl">
        <header className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            lesson-system
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Учебная система
          </h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            Выберите раздел для перехода.
          </p>
        </header>

        <nav className="flex flex-col gap-4" aria-label="Основная навигация">
          {cards.map(({ to, title, description, icon: Icon, accent }) => (
            <Link
              key={to}
              to={to}
              className={`group flex items-start gap-4 rounded-2xl border px-5 py-5 shadow-lg shadow-black/20 backdrop-blur-sm transition ${accent}`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-current">
                <Icon className="h-7 w-7 opacity-90" aria-hidden />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-lg font-semibold text-white">
                  {title}
                </span>
                <span className="mt-1 block text-sm leading-snug text-slate-300/90 group-hover:text-slate-200">
                  {description}
                </span>
              </span>
            </Link>
          ))}
        </nav>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-emerald-200">
              <ServerStackIcon className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">
                Сеть занятия
              </h2>
              <p className="truncate text-xs text-slate-400">{serverBase}</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 px-3 py-3 text-center">
              <div className="text-2xl font-bold text-emerald-100">
                {presence.students}
              </div>
              <div className="mt-1 text-[0.68rem] font-medium uppercase tracking-wide text-emerald-300/75">
                студентов
              </div>
            </div>
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-950/20 px-3 py-3 text-center">
              <div className="text-2xl font-bold text-cyan-100">
                {presence.projectors}
              </div>
              <div className="mt-1 text-[0.68rem] font-medium uppercase tracking-wide text-cyan-300/75">
                проекторов
              </div>
            </div>
            <div className="rounded-xl border border-slate-400/20 bg-slate-900/45 px-3 py-3 text-center">
              <div className="text-2xl font-bold text-slate-100">
                {presence.teachers}
              </div>
              <div className="mt-1 text-[0.68rem] font-medium uppercase tracking-wide text-slate-300/75">
                преп.
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
            <span
              className={`h-2 w-2 rounded-full ${
                isRealtimeConnected ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {isRealtimeConnected
              ? "Синхронизация активна"
              : "Переподключение к серверу занятия..."}
          </div>

          <form onSubmit={handleServerSubmit} className="flex flex-col gap-3">
            <label className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
              Сервер преподавателя
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={serverInput}
                onChange={(e) => setServerInput(e.target.value)}
                placeholder="192.168.1.10:3000"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-500/10"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500"
              >
                <LinkIcon className="h-4 w-4" />
                Подключить
              </button>
              <button
                type="button"
                onClick={handleResetServer}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Локально
              </button>
            </div>
          </form>

          <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
              Ссылки для других устройств
            </p>
            {roleLinks.map((item) => (
              <div
                key={item.title}
                className="flex min-w-0 flex-col gap-1 text-sm sm:flex-row sm:items-center"
              >
                <span className="w-28 shrink-0 font-medium text-slate-300">
                  {item.title}
                </span>
                <span className="truncate font-mono text-xs text-emerald-200">
                  {item.url}
                </span>
              </div>
            ))}
          </div>

          {isUsingLocalDesktopServer && lanUrls.length > 1 && (
            <div className="mt-3 text-xs leading-relaxed text-slate-400">
              Другие адреса этого компьютера: {lanUrls.slice(1).join(", ")}
            </div>
          )}

          {isDesktop && discoveredServers.length > 0 && (
            <div className="mt-4 space-y-2 rounded-xl border border-emerald-400/15 bg-emerald-950/10 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-300/70">
                Найдено в сети
              </p>
              {discoveredServers.map((server) => (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => {
                    setServerBase(server.url);
                    window.location.reload();
                  }}
                  className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/[0.07]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-100">
                      {server.name}
                      {server.hasSession ? " · активная сессия" : ""}
                    </span>
                    <span className="block truncate font-mono text-emerald-200/85">
                      {server.url}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-emerald-200">
                    выбрать
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
