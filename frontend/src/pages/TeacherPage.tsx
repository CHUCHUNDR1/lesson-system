import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { io, Socket } from "socket.io-client";
import type { Session } from "../types/session";
import {
  AcademicCapIcon,
  PlusCircleIcon,
  CloudArrowUpIcon,
  ArchiveBoxArrowDownIcon,
  UserGroupIcon,
  DocumentTextIcon,
  LinkIcon,
  ArrowDownTrayIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface Submission {
  id: string;
  sessionId: string;
  studentName: string;
  group: string;
  originalFilename: string;
  storedPath: string;
  uploadedAt: string;
}

const socketBase =
  import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, "") ||
  window.location.origin;

export const TeacherPage: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [title, setTitle] = useState("Lesson");
  const [assignmentName, setAssignmentName] = useState<string | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Session | null>("/session")
      .then((res) => {
        setSession(res.data || null);
        if (res.data?.assignmentFileName) {
          setAssignmentName(res.data.assignmentFileName);
        }
        if (res.data?.assignmentText != null) {
          setAssignmentDraft(res.data.assignmentText);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session) return;

    const socket: Socket = io(socketBase + "/teacher", {
      transports: ["websocket"],
    });

    socket.on("submissionCreated", (sub: Submission) => {
      setSubmissions((prev) => [...prev, sub]);
    });

    return () => {
      socket.disconnect();
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    api
      .get<Submission[]>("/teacher/submissions")
      .then((res) => setSubmissions(res.data || []))
      .catch(() => undefined);
  }, [session]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post<Session>("/teacher/session", { title });
      setSession(res.data);
      setAssignmentDraft(res.data.assignmentText ?? "");
    } catch (err: any) {
      setError(err?.message || "Ошибка создания сессии");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAssignment = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<{ ok: boolean; fileName: string }>(
        "/teacher/assignment",
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setAssignmentName(res.data.fileName);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки файла");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAssignmentText = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post<Session>("/teacher/assignment-text", {
        text: assignmentDraft,
      });
      setSession(res.data);
      setAssignmentDraft(res.data.assignmentText ?? "");
    } catch (err: any) {
      setError(err?.message || "Ошибка сохранения текста");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = () => {
    window.location.href =
      api.defaults.baseURL!.replace(/\/api$/, "") + "/api/teacher/download-all";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-5xl bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10 transition-all duration-300 hover:shadow-emerald-500/10">
        {/* Заголовок */}
        <div className="flex items-center gap-3 mb-8">
          <AcademicCapIcon className="w-8 h-8 text-emerald-500" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Панель преподавателя
          </h1>
        </div>

        {/* Сообщения об ошибках */}
        {error && (
          <div className="flex items-center gap-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-4 rounded-xl mb-6">
            <XCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Создание сессии (если сессия ещё не создана) */}
        {!session && (
          <form
            onSubmit={handleCreateSession}
            className="flex flex-col sm:flex-row gap-4 items-start sm:items-end mb-8"
          >
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Название занятия
              </label>
              <input
                type="text"
                className="w-full sm:w-80 px-5 py-3 bg-white/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введите название"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircleIcon className="w-5 h-5 transition-transform group-hover:rotate-90" />
              <span>Создать сессию</span>
            </button>
          </form>
        )}

        {/* Активная сессия */}
        {session && (
          <div className="mb-8 space-y-6">
            {/* Бейдж с информацией о сессии */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-sm font-medium px-4 py-2 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>
                  Сессия: <strong>{session.title}</strong>
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-2 rounded-full">
                <LinkIcon className="w-4 h-4" />
                <span>
                  Код: <strong>{session.joinCode}</strong>
                </span>
              </div>
            </div>

            {/* Подсказка для студентов */}
            <div className="text-sm text-slate-600 bg-slate-50/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200">
              <UserGroupIcon className="w-5 h-5 inline-block mr-2 text-slate-500" />
              Студенты: откройте страницу студента и введите код{" "}
              <code className="bg-slate-200 px-2 py-1 rounded-md text-emerald-700 font-mono">
                {session.joinCode}
              </code>
            </div>

            <form onSubmit={handleSaveAssignmentText} className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Текст задания для экрана ОРД
              </label>
              <textarea
                value={assignmentDraft}
                onChange={(e) => setAssignmentDraft(e.target.value)}
                disabled={loading}
                rows={6}
                placeholder="Введите формулировку задания — она отобразится на странице в стиле оперативно-розыскной деятельности (/ord)…"
                className="w-full resize-y rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-slate-900 disabled:opacity-50"
                >
                  Сохранить текст
                </button>
                <Link
                  to="/ord"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-emerald-700 underline-offset-4 hover:text-emerald-800 hover:underline"
                >
                  Открыть экран задания (ОРД)
                </Link>
              </div>
            </form>

            {/* Загрузка файла задания */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <DocumentTextIcon className="w-5 h-5 text-emerald-600" />
                <span>Файл задания:</span>
                {assignmentName ? (
                  <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                    {assignmentName}
                  </span>
                ) : (
                  <span className="text-slate-400">не загружен</span>
                )}
              </div>
              <label className="group relative cursor-pointer">
                <input
                  type="file"
                  onChange={handleUploadAssignment}
                  disabled={loading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 font-medium py-2 px-4 rounded-xl transition-all duration-200 shadow-sm">
                  <CloudArrowUpIcon className="w-5 h-5" />
                  <span>
                    {loading ? "Загрузка..." : "Загрузить новое задание"}
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Разделитель */}
        <hr className="my-8 border-t border-slate-200/60" />

        {/* Заголовок таблицы и кнопка скачивания архива */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <ArchiveBoxArrowDownIcon className="w-6 h-6 text-emerald-600" />
            Сдачи студентов
          </h2>
          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={!submissions.length}
            className="group inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 px-5 rounded-xl shadow-lg shadow-slate-800/30 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArchiveBoxArrowDownIcon className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
            <span>Скачать все (zip)</span>
          </button>
        </div>

        {/* Таблица сдач */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/50 backdrop-blur-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-slate-600">
                  Время
                </th>
                <th className="px-5 py-3 text-left font-medium text-slate-600">
                  Группа
                </th>
                <th className="px-5 py-3 text-left font-medium text-slate-600">
                  Студент
                </th>
                <th className="px-5 py-3 text-left font-medium text-slate-600">
                  Файл
                </th>
                <th className="px-5 py-3 text-right font-medium text-slate-600">
                  Действие
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, index) => (
                <tr
                  key={sub.id}
                  className="border-t border-slate-100 transition-colors hover:bg-emerald-50/50"
                >
                  <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                    {new Date(sub.uploadedAt).toLocaleTimeString()}
                  </td>
                  <td className="px-5 py-3 text-slate-700">{sub.group}</td>
                  <td className="px-5 py-3 text-slate-700 font-medium">
                    {sub.studentName}
                  </td>
                  <td className="px-5 py-3 text-slate-700 max-w-[200px] truncate">
                    {sub.originalFilename}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <a
                      href={
                        api.defaults.baseURL!.replace(/\/api$/, "") +
                        "/api/teacher/submissions/" +
                        sub.id +
                        "/download"
                      }
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                      title="Скачать"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span className="text-xs">скачать</span>
                    </a>
                  </td>
                </tr>
              ))}
              {!submissions.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-slate-400"
                  >
                    <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Пока нет сдач.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Подвал */}
        <div className="mt-8 text-center text-sm text-slate-500">
          Практическое занятие · ОРД
        </div>
      </div>
    </div>
  );
};
