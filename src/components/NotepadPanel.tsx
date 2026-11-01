'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Pin,
  Trash2,
  Eye,
  Edit2,
  Download,
  Bold,
  Code2,
  ListChecks,
  Heading2,
  Terminal,
  CheckSquare,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  RotateCcw,
  Sparkles,
  Folder,
  FolderOpen,
  ChevronRight,
  FolderPlus,
  X,
} from 'lucide-react';
import { useFlowState } from '@/context/FlowStateContext';
import { NoteTag } from '@/types';
import { CustomSelect, CustomDatePicker } from '@/components/ui/CustomControls';

const NOTE_TAG_OPTIONS = [
  { value: 'DevLog', label: 'DevLog', dotColor: 'bg-sky-400' },
  { value: 'Work', label: 'Work', dotColor: 'bg-emerald-400' },
  { value: 'Ideas', label: 'Ideas', dotColor: 'bg-amber-400' },
  { value: 'Personal', label: 'Personal', dotColor: 'bg-violet-400' },
  { value: 'Journal', label: 'Journal', dotColor: 'bg-rose-400' },
];

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*.*?\*\*|\*[^*]+\*|`[^`]+`)/g);
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={i} className="font-bold text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={i} className="italic text-sky-200">
          {token.slice(1, -1)}
        </em>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-mono"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return token;
  });
}

export default function NotepadPanel() {
  const {
    notes,
    todayIso,
    selectedDate,
    activeNoteId,
    setActiveNoteId,
    addNote,
    updateNote,
    deleteNote,
    saveNoteSnapshot,
    restoreNoteSnapshot,
    generateDailyStandup,
    folders,
    addFolder,
    theme,
  } = useFlowState();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<
    Record<string, boolean>
  >({});
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleFolderCollapse = (folderName: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    addFolder(newFolderName.trim());
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (
          selectedFolderFilter !== 'all' &&
          (n.folder || 'General') !== selectedFolderFilter
        ) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            (n.targetDate && n.targetDate.includes(q)) ||
            (n.folder && n.folder.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [notes, selectedFolderFilter, searchQuery]);

  const activeNote = useMemo(
    () =>
      notes.find((n) => n.id === activeNoteId) || filteredNotes[0] || null,
    [notes, activeNoteId, filteredNotes]
  );

  const notesByFolder = useMemo(() => {
    const map: Record<string, typeof notes> = {};
    folders.forEach((f) => {
      map[f] = [];
    });
    filteredNotes.forEach((n) => {
      const f = n.folder || 'General';
      if (!map[f]) map[f] = [];
      map[f].push(n);
    });
    return map;
  }, [folders, filteredNotes]);

  const folderOptions = useMemo(
    () =>
      folders.map((f) => ({
        value: f,
        label: `📁 ${f}`,
      })),
    [folders]
  );

  const handleCreateNoteInFolder = (folderName?: string) => {
    const id = addNote({
      targetDate: selectedDate,
      tag: 'DevLog',
      folder: folderName || (selectedFolderFilter !== 'all' ? selectedFolderFilter : 'General'),
    });
    setActiveNoteId(id);
    setIsPreview(false);
  };

  const insertSyntax = (snippet: string) => {
    if (!activeNote) return;
    const textarea = textareaRef.current;
    if (textarea && document.activeElement === textarea) {
      const start = textarea.selectionStart ?? activeNote.content.length;
      const end = textarea.selectionEnd ?? activeNote.content.length;
      const before = activeNote.content.slice(0, start);
      const after = activeNote.content.slice(end);
      const newContent = `${before}${snippet}${after}`;
      updateNote(activeNote.id, { content: newContent });
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const nextPos = start + snippet.length;
          textareaRef.current.setSelectionRange(nextPos, nextPos);
          textareaRef.current.focus();
        }
      });
    } else {
      updateNote(activeNote.id, {
        content: `${activeNote.content}\n${snippet}`,
      });
    }
  };

  const toggleMarkdownTaskLine = (lineIndex: number) => {
    if (!activeNote) return;
    const lines = activeNote.content.split('\n');
    const current = lines[lineIndex];
    if (current.startsWith('- [ ] ')) {
      lines[lineIndex] = current.replace('- [ ] ', '- [x] ');
    } else if (current.startsWith('- [x] ')) {
      lines[lineIndex] = current.replace('- [x] ', '- [ ] ');
    }
    updateNote(activeNote.id, { content: lines.join('\n') });
  };

  const downloadMarkdown = () => {
    if (!activeNote) return;
    const blob = new Blob([activeNote.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${
      activeNote.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'note'
    }.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const taskStats = useMemo(() => {
    if (!activeNote) return { done: 0, total: 0 };
    const lines = activeNote.content.split('\n');
    const done = lines.filter((l) => l.startsWith('- [x] ')).length;
    const pending = lines.filter((l) => l.startsWith('- [ ] ')).length;
    return { done, total: done + pending };
  }, [activeNote]);

  const wordCount = activeNote
    ? activeNote.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <section className="flex flex-col h-full bg-[#0a0f1a]/90 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
      <div className="flex-1 flex min-h-0">
        {sidebarOpen && (
          <div className="w-64 sm:w-72 border-r border-slate-800/80 flex flex-col min-h-0 bg-slate-950/50 shrink-0">
            <div className="p-3.5 border-b border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Terminal className={`w-3.5 h-3.5 ${theme.accentText} shrink-0`} />
                  <h2 className="text-xs font-mono font-bold text-slate-100 truncate">
                    Hierarchical Notes
                  </h2>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder((prev) => !prev)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    title="Add folder"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateNoteInFolder()}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold ${theme.accentBg} text-slate-950 transition-all`}
                  >
                    <Plus className="w-3 h-3 stroke-2" />
                    <span>New</span>
                  </button>
                </div>
              </div>

              {isCreatingFolder && (
                <form
                  onSubmit={handleCreateFolderSubmit}
                  className="flex items-center gap-1 pt-1"
                >
                  <input
                    type="text"
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name..."
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-sky-400 rounded-lg px-2 py-1 text-xs font-mono text-slate-200 outline-none"
                  />
                  <button
                    type="submit"
                    className={`px-2 py-1 rounded-lg text-xs font-semibold ${theme.accentBg} text-slate-950`}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="p-1 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </form>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="grep notes & folders..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-400 rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-mono text-slate-200 outline-none"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedFolderFilter('all')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono whitespace-nowrap transition-colors ${
                    selectedFolderFilter === 'all'
                      ? `${theme.badge} font-semibold`
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                  }`}
                >
                  All ({notes.length})
                </button>
                {folders.map((folderName) => {
                  const count = notes.filter(
                    (n) => (n.folder || 'General') === folderName
                  ).length;
                  return (
                    <button
                      key={folderName}
                      type="button"
                      onClick={() => setSelectedFolderFilter(folderName)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono whitespace-nowrap transition-colors ${
                        selectedFolderFilter === folderName
                          ? `${theme.badge} font-semibold`
                          : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                      }`}
                    >
                      {folderName} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {folders.map((folderName) => {
                const folderNotes = notesByFolder[folderName] || [];
                const isCollapsed = collapsedFolders[folderName];

                if (
                  selectedFolderFilter !== 'all' &&
                  selectedFolderFilter !== folderName
                ) {
                  return null;
                }

                return (
                  <div
                    key={folderName}
                    className="rounded-xl border border-slate-800/60 bg-slate-900/20 overflow-hidden"
                  >
                    <div
                      onClick={() => toggleFolderCollapse(folderName)}
                      className="flex items-center justify-between p-2 cursor-pointer hover:bg-slate-800/50 transition-colors select-none group"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ChevronRight
                          className={`w-3 h-3 text-slate-500 transition-transform ${
                            !isCollapsed ? 'rotate-90' : ''
                          }`}
                        />
                        {!isCollapsed ? (
                          <FolderOpen
                            className={`w-3.5 h-3.5 ${theme.accentText} shrink-0`}
                          />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="text-xs font-mono font-semibold text-slate-200 truncate">
                          {folderName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded-md">
                          {folderNotes.length}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateNoteInFolder(folderName);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-sky-300 text-slate-400 transition-opacity"
                          title="Add note to this folder"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="p-1 space-y-1 bg-slate-950/40">
                        {folderNotes.length === 0 ? (
                          <div className="py-2 px-3 text-[11px] font-mono text-slate-500">
                            ~ Empty folder
                          </div>
                        ) : (
                          folderNotes.map((note) => {
                            const isSelected = activeNote?.id === note.id;
                            return (
                              <div
                                key={note.id}
                                onClick={() => setActiveNoteId(note.id)}
                                className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                  isSelected
                                    ? `${theme.accentBgSubtle} ${theme.accentBorder}`
                                    : 'bg-slate-900/40 border-slate-800/70 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <h3 className="text-xs font-mono font-semibold text-slate-100 truncate">
                                    {note.title || 'untitled.md'}
                                  </h3>
                                  {note.pinned && (
                                    <Pin
                                      className={`w-3 h-3 ${theme.accentText} fill-current shrink-0 mt-0.5`}
                                    />
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-mono">
                                  {note.content.replace(/[#*`-]/g, '').trim() ||
                                    'Empty buffer...'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                    {note.tag}
                                  </span>
                                  {note.targetDate && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
                                      {note.targetDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#070b13]">
          {activeNote ? (
            <>
              <div className="p-3 border-b border-slate-800/80 space-y-2.5 bg-slate-950/60">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSidebarOpen((prev) => !prev)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 transition-colors"
                      title="Toggle Explorer Sidebar"
                    >
                      {sidebarOpen ? (
                        <PanelLeftClose className="w-3.5 h-3.5" />
                      ) : (
                        <PanelLeftOpen className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <input
                      type="text"
                      value={activeNote.title}
                      onChange={(e) =>
                        updateNote(activeNote.id, { title: e.target.value })
                      }
                      placeholder="note-title.md"
                      className="bg-transparent text-sm sm:text-base font-mono font-bold text-slate-100 outline-none w-full truncate focus:text-sky-300"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        generateDailyStandup();
                        setIsPreview(false);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold bg-linear-to-r ${theme.gradient} text-slate-950 shadow-sm transition-all hover:opacity-90`}
                      title="Generate Daily Standup Note"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">+Standup</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => saveNoteSnapshot(activeNote.id)}
                      className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-slate-900 hover:bg-slate-800 ${theme.accentText} border border-slate-800 transition-colors`}
                      title="Save Version Snapshot"
                    >
                      <span>+Snap</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowHistory((prev) => !prev)}
                      className={`p-1.5 rounded-xl border transition-colors ${
                        showHistory
                          ? `${theme.accentBgSubtle} ${theme.accentBorder} ${theme.accentText}`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                      title="Version History"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPreview(!isPreview)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium border transition-colors ${
                        isPreview
                          ? `${theme.accentBg} text-slate-950 border-transparent font-semibold`
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {isPreview ? (
                        <>
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateNote(activeNote.id, {
                          pinned: !activeNote.pinned,
                        })
                      }
                      className={`p-1.5 rounded-xl border transition-colors ${
                        activeNote.pinned
                          ? `${theme.accentBgSubtle} ${theme.accentBorder} ${theme.accentText}`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={downloadMarkdown}
                      className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteNote(activeNote.id)}
                      className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {showHistory && (
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-mono font-semibold ${theme.accentText}`}
                      >
                        Version Snapshots ({(activeNote.versions || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={() => saveNoteSnapshot(activeNote.id)}
                        className={`text-[11px] font-mono ${theme.accentText} hover:underline`}
                      >
                        + Create Checkpoint
                      </button>
                    </div>
                    {(activeNote.versions || []).length === 0 ? (
                      <p className="text-[11px] font-mono text-slate-500">
                        No snapshots yet. Click +Snap before major edits.
                      </p>
                    ) : (
                      <div className="max-h-28 overflow-y-auto space-y-1">
                        {(activeNote.versions || []).map((ver) => (
                          <div
                            key={ver.id}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono"
                          >
                            <span className="text-slate-300 truncate">
                              {new Date(ver.savedAt).toLocaleString()} (
                              {ver.content.length} chars)
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                restoreNoteSnapshot(activeNote.id, ver.id)
                              }
                              className="flex items-center gap-1 text-sky-400 hover:text-sky-300 shrink-0 ml-2"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/50">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CustomSelect
                      value={activeNote.folder || 'General'}
                      onChange={(val) =>
                        updateNote(activeNote.id, { folder: val })
                      }
                      options={folderOptions}
                    />

                    <CustomDatePicker
                      value={activeNote.targetDate}
                      fallbackDate={todayIso}
                      onChange={(date) =>
                        updateNote(activeNote.id, { targetDate: date })
                      }
                      placeholder="Link date"
                    />

                    <CustomSelect
                      value={activeNote.tag}
                      onChange={(val) =>
                        updateNote(activeNote.id, { tag: val as NoteTag })
                      }
                      options={NOTE_TAG_OPTIONS}
                    />

                    {!isPreview && (
                      <div className="flex items-center gap-0.5 pl-1 border-l border-slate-800">
                        <button
                          type="button"
                          onClick={() => insertSyntax('## Section')}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
                          title="Heading"
                        >
                          <Heading2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertSyntax('**bold text**')}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
                          title="Bold"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertSyntax('- [ ] New task item')}
                          className={`flex items-center gap-1 px-2 py-1 hover:bg-slate-800 rounded-lg text-[11px] font-mono ${theme.accentText}`}
                        >
                          <ListChecks className="w-3.5 h-3.5" />
                          <span>+Task</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            insertSyntax('```ts\nconst ready = true;\n```')
                          }
                          className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 rounded-lg text-[11px] font-mono text-emerald-400"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>+Code</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 text-[11px] font-mono text-slate-400">
                    {taskStats.total > 0 && (
                      <span
                        className={`flex items-center gap-1 ${theme.accentText}`}
                      >
                        <CheckSquare className="w-3 h-3" />
                        {taskStats.done}/{taskStats.total}
                      </span>
                    )}
                    <span>{wordCount} words</span>
                  </div>
                </div>
              </div>

              {isPreview ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm font-mono text-slate-200">
                  {activeNote.content.split('\n').map((line, idx) => {
                    if (line.startsWith('# '))
                      return (
                        <h1
                          key={idx}
                          className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-1.5 mt-2"
                        >
                          {renderInlineMarkdown(line.slice(2))}
                        </h1>
                      );
                    if (line.startsWith('## '))
                      return (
                        <h2
                          key={idx}
                          className={`text-base font-semibold ${theme.accentText} mt-3`}
                        >
                          {renderInlineMarkdown(line.slice(3))}
                        </h2>
                      );
                    if (line.startsWith('```'))
                      return (
                        <div
                          key={idx}
                          className="text-[11px] text-emerald-400 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800 inline-block"
                        >
                          {line}
                        </div>
                      );
                    if (line.startsWith('- [x] '))
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleMarkdownTaskLine(idx)}
                          className="flex items-center gap-2.5 text-slate-500 line-through cursor-pointer hover:text-slate-300 py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked
                            readOnly
                            className="accent-emerald-400 rounded cursor-pointer"
                          />
                          <span>{renderInlineMarkdown(line.slice(6))}</span>
                        </div>
                      );
                    if (line.startsWith('- [ ] '))
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleMarkdownTaskLine(idx)}
                          className="flex items-center gap-2.5 text-slate-100 cursor-pointer hover:text-sky-300 py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={false}
                            readOnly
                            className="accent-sky-400 rounded cursor-pointer"
                          />
                          <span>{renderInlineMarkdown(line.slice(6))}</span>
                        </div>
                      );
                    if (line.startsWith('- '))
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-slate-200 pl-1"
                        >
                          <span className={`${theme.accentText} mt-1`}>•</span>
                          <span className="leading-relaxed">
                            {renderInlineMarkdown(line.slice(2))}
                          </span>
                        </div>
                      );
                    return (
                      <p key={idx} className="leading-relaxed">
                        {line ? renderInlineMarkdown(line) : '\u00A0'}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-4 sm:p-5 min-h-0 overflow-hidden">
                  <textarea
                    ref={textareaRef}
                    value={activeNote.content}
                    onChange={(e) =>
                      updateNote(activeNote.id, { content: e.target.value })
                    }
                    placeholder="# Write markdown, dev logs, or - [ ] task lists..."
                    className="flex-1 w-full h-full bg-transparent resize-none outline-none text-xs sm:text-sm font-mono leading-relaxed text-slate-200 overflow-y-auto"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <p className="text-xs font-mono text-slate-500">
                ~ No active buffer selected. Create or pick a note.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
