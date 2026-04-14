'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface CustomQuestion {
  question_text: string;
  options: string[];
  correct_option_index: number;
}

export default function MyContestQuestionsPage() {
  const [questions, setQuestions] = useState<CustomQuestion[]>([{
    question_text: '',
    options: ['', '', '', ''],
    correct_option_index: 0
  }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.getMyCustomQuestions().then(res => {
      const qData = res.questions || [];
      if (qData.length > 0) {
        setQuestions(qData);
      }
    }).catch(err => {
      console.error(err);
      toast.error('Failed to load your existing questions');
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const handleUpdate = (index: number, field: string, value: any) => {
    setQuestions(prev => {
      const newQ = [...prev];
      if (field === 'question_text' || field === 'correct_option_index') {
        newQ[index] = { ...newQ[index], [field]: value };
      } else if (field.startsWith('option_')) {
        const optIndex = parseInt(field.split('_')[1], 10);
        const newOptions = [...newQ[index].options];
        newOptions[optIndex] = value;
        newQ[index] = { ...newQ[index], options: newOptions };
      }
      return newQ;
    });
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { question_text: '', options: ['', '', '', ''], correct_option_index: 0 }]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    // Validate
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        toast.error(`Question ${i + 1} is missing text`);
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        toast.error(`Question ${i + 1} has empty options`);
        return;
      }
      if (q.correct_option_index < 0 || q.correct_option_index > 3) {
        toast.error(`Question ${i + 1} is missing a correct answer selection`);
        return;
      }
    }

    setIsSaving(true);
    toast.loading('Saving questions...', { id: 'save' });
    try {
      await api.saveCustomQuestions(questions);
      toast.success('Awesome! Your friends can now challenge you.', { id: 'save' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save', { id: 'save' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-transparent border-themed rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-50 glass border-b border-themed">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/contests">
              <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl hover:bg-[var(--bg-card-hover)] border border-themed transition">
                <ArrowLeft className="w-5 h-5 text-muted" />
              </motion.button>
            </Link>
            <h1 className="font-bold text-lg">My Custom Quiz</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 btn-primary px-4 py-2"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save Questions</span>
          </motion.button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="glass-card mb-8">
          <h2 className="text-xl font-bold mb-2">Create Your Ultimate Challenge 🏆</h2>
          <p className="text-sm text-muted">
            Write down personal questions about your life, secrets, or preferences. Add as many as you want! When your friends challenge you, we will randomly select 5 of your questions to test them.
          </p>
        </div>

        <div className="space-y-6">
          {questions.map((q, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card border border-themed"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                  {i + 1}
                </div>
                <h3 className="font-semibold">Question {i + 1}</h3>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(i)} className="ml-auto p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1 font-medium">Question Text</label>
                  <input
                    value={q.question_text}
                    onChange={e => handleUpdate(i, 'question_text', e.target.value)}
                    placeholder="e.g., What was my childhood pet's name?"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] outline-none focus:border-purple-500/50 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted mb-2 font-medium">Options (Select the correct answer)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex flex-col gap-1">
                        <div className="relative">
                          <input
                            type="text"
                            value={opt}
                            onChange={e => handleUpdate(i, `option_${optIdx}`, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className={`w-full pl-4 pr-10 py-2.5 rounded-xl border outline-none transition ${
                              q.correct_option_index === optIdx
                                ? 'bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400'
                                : 'bg-[var(--bg-primary)] border-[var(--border-color)] focus:border-purple-500/50'
                            }`}
                          />
                          <button
                            onClick={() => handleUpdate(i, 'correct_option_index', optIdx)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[var(--bg-card)] transition"
                            title="Mark as correct answer"
                          >
                            <CheckCircle2 className={`w-4 h-4 ${q.correct_option_index === optIdx ? 'text-green-500' : 'text-gray-400 opacity-50'}`} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.button
          onClick={addQuestion}
          whileTap={{ scale: 0.95 }}
          className="mt-6 w-full py-4 rounded-xl border-2 border-dashed border-themed text-purple-400 font-semibold hover:bg-purple-500/10 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Another Question
        </motion.button>
      </div>
    </div>
  );
}
