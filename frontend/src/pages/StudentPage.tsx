import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DiscoveredLessonServer,
  backendUrl,
  fetchServerSession,
  serverBase,
  setServerBase,
} from "../lib/api";
import { loadCurrentSession, subscribeToSessionChanges } from "../lib/sessionSync";
import type { Session } from "../types/session";
// Для иконок используем Heroicons (установите @heroicons/react)
import {
  DocumentArrowDownIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  AcademicCapIcon,
  HomeIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";

const joinCodeStorageKey = "lesson-system.join-code";

function normalizeJoinCode(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function readStoredJoinCode(): string {
  try {
    return normalizeJoinCode(localStorage.getItem(joinCodeStorageKey) || "");
  } catch {
    return "";
  }
}

function storeJoinCode(value: string): void {
  try {
    localStorage.setItem(joinCodeStorageKey, normalizeJoinCode(value));
  } catch {
    // localStorage can be unavailable in restrictive browser contexts.
  }
}

export const StudentPage: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [joinCode, setJoinCode] = useState(readStoredJoinCode);
  const [joinedCode, setJoinedCode] = useState(readStoredJoinCode);
  const [studentName, setStudentName] = useState("");
  const [group, setGroup] = useState("");
  const [joining, setJoining] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isJoined = Boolean(session && joinedCode === session.joinCode);

  useEffect(() => {
    loadCurrentSession()
      .then((currentSession) => setSession(currentSession))
      .catch(() => {
        setError("Не удалось подключиться к серверу занятия.");
      });

    return subscribeToSessionChanges("student", (nextSession) => {
      setSession(nextSession);
      setError("");
    });
  }, []);

  const handleDownloadAssignment = () => {
    if (!isJoined) {
      setError("Введите код занятия перед скачиванием задания.");
      return;
    }
    window.location.href = backendUrl("/api/assignment");
  };

  const findSessionInDiscoveredServers = async (
    code: string,
  ): Promise<{ server: DiscoveredLessonServer; session: Session } | null> => {
    const servers = await window.lessonSystem?.getDiscoveredServers?.();
    if (!servers?.length) return null;

    for (const server of servers) {
      const foundSession = await fetchServerSession<Session>(server.url);
      if (foundSession?.joinCode === code) {
        return { server, session: foundSession };
      }
    }

    return null;
  };

  const handleJoinSession: React.FormEventHandler<HTMLFormElement> = async (
    e,
  ) => {
    e.preventDefault();
    const code = normalizeJoinCode(joinCode);
    setError("");
    setSuccess("");

    if (!code) {
      setError("Введите код занятия.");
      return;
    }

    setJoining(true);
    try {
      const currentSession = await loadCurrentSession().catch(() => null);
      if (currentSession?.joinCode === code) {
        storeJoinCode(code);
        setJoinedCode(code);
        setJoinCode(code);
        setSession(currentSession);
        setSuccess("Код принят. Можно сдавать работу.");
        return;
      }

      const discoveredMatch = await findSessionInDiscoveredServers(code);
      if (discoveredMatch) {
        storeJoinCode(code);
        setServerBase(discoveredMatch.server.url);
        window.location.reload();
        return;
      }

      setError(
        `Сессия с кодом ${code} не найдена на текущем сервере (${serverBase}). Если преподаватель на другом компьютере, выберите его сервер на главной странице или проверьте, что оба компьютера в одной сети.`,
      );
    } finally {
      setJoining(false);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!isJoined) {
      setError("Введите код занятия перед отправкой решения.");
      return;
    }
    const fileInput = (e.currentTarget.elements.namedItem("file") ??
      null) as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Выберите файл с решением.");
      return;
    }
    if (!studentName || !group) {
      setError("Укажите ФИО и группу.");
      return;
    }
    setSending(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("studentName", studentName);
      form.append("group", group);
      const res = await fetch(backendUrl("/api/submit"), {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      await res.json();
      setSuccess("Файл отправлен преподавателю.");
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      setError(err?.message || "Ошибка отправки файла");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-xl bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10 transition-all duration-300 hover:shadow-emerald-500/10">
        {/* Заголовок с иконкой */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AcademicCapIcon className="h-8 w-8 text-emerald-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Лаборатория ОРД
            </h1>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/75 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
          >
            <HomeIcon className="h-4 w-4" />
            Главная
          </Link>
        </div>

        {/* Статус сессии */}
        {session && isJoined ? (
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>
              Занятие: <strong>{session.title}</strong>
            </span>
          </div>
        ) : session ? (
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <KeyIcon className="h-4 w-4" />
            Введите код занятия
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-slate-400"></span>
            </span>
            Ожидание запуска сессии преподавателем…
          </div>
        )}

        {/* Сообщения об ошибках и успехе */}
        {error && (
          <div className="flex items-center gap-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-4 rounded-xl mb-6">
            <XCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-4 rounded-xl mb-6">
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}

        {!isJoined && (
          <form
            onSubmit={handleJoinSession}
            className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-4"
          >
            <label className="mb-2 block text-sm font-medium text-amber-900">
              Код занятия
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(normalizeJoinCode(e.target.value))}
                placeholder="8SW8VU"
                className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white/85 px-4 py-3 font-mono text-lg font-semibold uppercase tracking-wider text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
              />
              <button
                type="submit"
                disabled={joining}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-amber-700/20 transition hover:bg-amber-700 disabled:opacity-50"
              >
                <KeyIcon className="h-5 w-5" />
                {joining ? "Проверка..." : "Войти"}
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-amber-800/80">
              Код показывает преподаватель. Если сервер преподавателя найден в
              локальной сети, приложение подключится к нему автоматически после
              ввода правильного кода.
            </p>
          </form>
        )}

        {/* Кнопка скачивания задания */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={handleDownloadAssignment}
            disabled={!isJoined || !session?.assignmentFileName}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-lg shadow-emerald-600/30 transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 sm:w-auto"
          >
            <DocumentArrowDownIcon className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
            <span>Скачать файл задания</span>
          </button>
          {isJoined && !session?.assignmentFileName && (
            <span className="text-sm text-slate-500">
              Преподаватель ещё не загрузил файл задания.
            </span>
          )}
        </div>

        {/* Форма отправки */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ФИО
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-5 py-3 bg-white/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
              placeholder="Иванов Иван Иванович"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Группа
            </label>
            <input
              type="text"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-full px-5 py-3 bg-white/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
              placeholder="П-31"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Файл с решением
            </label>
            <div className="relative">
              <input
                type="file"
                name="file"
                className="w-full px-5 py-3 bg-white/70 border border-slate-200 rounded-xl text-slate-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 transition-all duration-200 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending || !isJoined}
            className="group w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Отправка...</span>
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                <span>Отправить преподавателю</span>
              </>
            )}
          </button>
        </form>

        {/* Подпись */}
        <div className="mt-8 text-center text-sm text-slate-500">
          Практическое занятие · ОРД
        </div>
      </div>
    </div>
  );
};
