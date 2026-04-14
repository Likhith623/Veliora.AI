'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, HelpCircle, Plus, Edit3, Trash2, Globe, Lock,
  Loader2, MessageCircle, Sparkles, RefreshCcw
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';

interface Question {
  id: string;
  question_text: string;
  category?: string;
  is_public?: boolean;
  options?: string[];
  correct_option_index?: number;
  created_at?: string;
}

export default function QuestionsPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [newOptions, setNewOptions] = useState<string[]>(['', '', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [randomQ, setRandomQ] = useState<Question | null>(null);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadQuestions();
  }, [user?.id]);

  const loadQuestions = async () => {
    try {
      const res = await api.getMyQuestions();
      setQuestions(Array.isArray(res) ? res : res.questions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const createQuestion = async () => {
    if (!newText.trim()) return;
    if (newOptions.some(o => !o.trim())) {
      toast.error("Please fill in all 4 options.");
      return;
    }
    setIsSaving(true);
    try {
      await api.createQuestion({
        question_text: newText.trim(),
        category: newCategory.trim() || undefined,
        is_public: isPublic,
        options: newOptions,
        correct_option_index: newCorrectIndex
      });
      toast.success('Question created!');
      setNewText('');
      setNewCategory('');
      setNewOptions(['', '', '', '']);
      setNewCorrectIndex(0);
      setShowCreate(false);
      loadQuestions();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create');
    } finally {
      setIsSaving(false);
    }
  };

  const updateQuestion = async (questionId: string) => {
    if (!newText.trim()) return;
    setIsSaving(true);
    try {
      await api.updateQuestion(questionId, {
        question_text: newText.trim(),
        is_public: isPublic,
        options: newOptions,
        correct_option_index: newCorrectIndex
      });
      toast.success('Question updated!');
      setEditingId(null);
      setNewText('');
      setNewOptions(['', '', '', '']);
      loadQuestions();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      await api.deleteQuestion(questionId);
      toast.success('Question deleted');
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    toast.loading('Gemini is generating...', { id: 'ai' });
    try {
      const g = await api.generateQuestionAI();
      setNewText(g.question_text);
      if (g.options && Array.isArray(g.options)) {
        setNewOptions(g.options);
      }
      if (typeof g.correct_option_index === 'number') {
        setNewCorrectIndex(g.correct_option_index);
      }
      if (g.category) {
        setNewCategory(g.category);
      }
      toast.success('Generated successfully!', { id: 'ai' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate', { id: 'ai' });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const fetchRandom = async () => {
    setIsLoadingRandom(true);
    try {
      const res = await api.getRandomQuestion();
      setRandomQ(res);
    } catch (e) {
      toast.error('No random question available');
    } finally {
      setIsLoadingRandom(false);
    }
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setNewText(q.question_text);
    setIsPublic(q.is_public !== false);
    setNewOptions(q.options || ['', '', '', '']);
    setNewCorrectIndex(q.correct_option_index || 0);
    setShowCreate(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card max-w-md">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 text-purple-400" />
          <h2 className="text-xl font-bold mb-2">Questions</h2>
          <p className="text-muted mb-6">Please log in</p>
          <Link href="/login"><button className="btn-primary w-full">Log In</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 glass border-b border-themed z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard">
            <motion.button className="p-2 rounded-xl hover:bg-[var(--bg-card-hover)] border border-themed transition" whileTap={{ scale: 0.92 }}>
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <h1 className="font-bold text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <HelpCircle className="w-4 h-4 text-purple-400" />
            </div>
            My Questions
          </h1>
          <motion.button
            onClick={() => { setShowCreate(!showCreate); setEditingId(null); setNewText(''); setNewOptions(['', '', '', '']); }}
            className="ml-auto p-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition"
            whileTap={{ scale: 0.92 }}
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Random question spotlight */}
        <div className="glass-card mb-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5" />
          <div className="relative z-10">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-purple-400" />
            <h3 className="font-bold text-sm mb-3">Random Question of the Moment</h3>
            {randomQ ? (
              <motion.div
                key={randomQ.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-lg font-medium mb-2 leading-snug">"{randomQ.question_text}"</p>
                {randomQ.category && <span className="text-xs text-muted bg-[var(--bg-card-hover)] px-2 py-0.5 rounded-full">{randomQ.category}</span>}
              </motion.div>
            ) : (
              <p className="text-muted text-sm">Click below to discover a random question</p>
            )}
            <motion.button
              onClick={fetchRandom}
              disabled={isLoadingRandom}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition"
              whileTap={{ scale: 0.95 }}
            >
              {isLoadingRandom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
              New Random Question
            </motion.button>
          </div>
        </div>

        {/* Create / Edit form */}
        <AnimatePresence>
          {(showCreate || editingId) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="glass-card border-purple-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    {editingId ? <Edit3 className="w-4 h-4 text-purple-400" /> : <Plus className="w-4 h-4 text-purple-400" />}
                    {editingId ? 'Edit Question' : 'Create Question'}
                  </h3>
                  <motion.button
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold hover:bg-purple-500/20 transition"
                  >
                    {isGeneratingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Generate with AI 🤖
                  </motion.button>
                </div>

                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-xs text-muted mb-1 font-medium">Question Text</label>
                    <textarea
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      placeholder="Write your personal question here..."
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-themed text-sm outline-none focus:border-purple-500/50 transition resize-none min-h-[80px]"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-muted mb-2 font-medium">Options (Select the correct answer)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {newOptions.map((opt, optIdx) => (
                        <div key={optIdx} className="relative">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const opts = [...newOptions];
                              opts[optIdx] = e.target.value;
                              setNewOptions(opts);
                            }}
                            placeholder={`Option ${optIdx + 1}`}
                            className={`w-full pl-4 pr-10 py-2.5 rounded-xl border outline-none text-sm transition ${
                              newCorrectIndex === optIdx
                                ? 'bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400'
                                : 'bg-[var(--bg-primary)] border-[var(--border-color)] focus:border-purple-500/50'
                            }`}
                          />
                          <button
                            onClick={() => setNewCorrectIndex(optIdx)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[var(--bg-card)] transition"
                            title="Mark as correct answer"
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${newCorrectIndex === optIdx ? 'border-green-500 bg-green-500' : 'border-gray-400 opacity-50'}`}>
                              {newCorrectIndex === optIdx && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!editingId && (
                    <div>
                      <label className="block text-xs text-muted mb-1 font-medium">Category</label>
                      <input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="e.g., culture, family, fun... (optional)"
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-themed text-sm outline-none focus:border-purple-500/50 transition"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setIsPublic(!isPublic)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                      isPublic ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {isPublic ? 'Public' : 'Private'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={editingId ? () => updateQuestion(editingId) : createQuestion}
                    disabled={!newText.trim() || isSaving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingId ? 'Update' : 'Create'}
                  </button>
                  <button
                    onClick={() => { setShowCreate(false); setEditingId(null); setNewText(''); }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Questions list */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16 glass-card">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 text-muted opacity-20" />
            <h3 className="font-bold text-lg mb-2">No questions yet</h3>
            <p className="text-muted text-sm mb-4">Create personal questions to learn about your bond partners.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
              <Plus className="w-4 h-4 mr-1 inline" /> Create Your First
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <motion.div
                key={q.id}
                className="glass-card relative group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug mb-1.5">{q.question_text}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted">
                      {q.category && (
                        <span className="bg-[var(--bg-card-hover)] px-2 py-0.5 rounded-full">{q.category}</span>
                      )}
                      <span className={`flex items-center gap-0.5 ${q.is_public !== false ? 'text-green-400' : 'text-amber-400'}`}>
                        {q.is_public !== false ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {q.is_public !== false ? 'Public' : 'Private'}
                      </span>
                      {q.created_at && <span>{new Date(q.created_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={() => startEdit(q)}
                      className="p-1.5 rounded-lg hover:bg-purple-500/10 text-purple-400 transition"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
