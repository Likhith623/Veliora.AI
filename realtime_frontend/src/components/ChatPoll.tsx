'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { BarChart3, Plus, X, Loader2, Check } from 'lucide-react';
import { api } from '@/lib/api';
import type { Poll } from '@/types';
import toast from 'react-hot-toast';

interface ChatPollProps {
  relationshipId: string;
  polls?: Poll[];
  onPollCreated?: (poll: Poll) => void;
  onVoted?: (pollId: string, option: number) => void;
}

export default function ChatPoll({ relationshipId, polls = [], onPollCreated, onVoted }: ChatPollProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isCreating, setIsCreating] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const createPoll = async () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) {
      toast.error('Need a question and at least 2 options');
      return;
    }
    setIsCreating(true);
    try {
      const res = await api.createPoll({
        question: question.trim(),
        options: options.filter(o => o.trim()),
        relationship_id: relationshipId,
      });
      onPollCreated?.(res.poll || res);
      setShowCreate(false);
      setQuestion('');
      setOptions(['', '']);
      toast.success('Poll created!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create poll');
    } finally {
      setIsCreating(false);
    }
  };

  const vote = async (pollId: string, optionIndex: number) => {
    setVotingId(pollId);
    try {
      await api.votePoll(pollId, optionIndex);
      onVoted?.(pollId, optionIndex);
      toast.success('Vote recorded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to vote');
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div>
      {/* Toggle create form */}
      <button
        onClick={() => setShowCreate(!showCreate)}
        className="flex items-center gap-1.5 text-xs text-familia-400 hover:text-familia-300 transition mb-3"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        {showCreate ? 'Cancel Poll' : 'Create Poll'}
      </button>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="glass-card !p-3 space-y-3">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="input-familia w-full text-sm"
                maxLength={200}
              />

              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted w-6">{i + 1}.</span>
                    <input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[i] = e.target.value;
                        setOptions(newOpts);
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="input-familia flex-1 text-sm"
                      maxLength={100}
                    />
                    {options.length > 2 && (
                      <button onClick={() => removeOption(i)} className="p-1 text-muted hover:text-red-400 transition">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={addOption}
                  disabled={options.length >= 6}
                  className="text-xs text-familia-400 hover:text-familia-300 flex items-center gap-1 transition disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" /> Add option
                </button>
                <button
                  onClick={createPoll}
                  disabled={isCreating}
                  className="btn-primary text-xs !py-1.5 !px-4 flex items-center gap-1"
                >
                  {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
                  Create
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Display polls */}
      {polls.map((poll) => {
        const totalVotes = poll.total_votes || poll.votes?.reduce((a, b) => a + b, 0) || 0;
        const hasVoted = poll.user_vote !== null && poll.user_vote !== undefined;

        return (
          <motion.div
            key={poll.poll_id}
            className="glass-card !p-3 mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-familia-400" />
              <h4 className="text-sm font-semibold">{poll.question}</h4>
            </div>

            <div className="space-y-2">
              {poll.options.map((option, idx) => {
                const voteCount = poll.votes?.[idx] || 0;
                const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                const isSelected = poll.user_vote === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => !hasVoted && vote(poll.poll_id, idx)}
                    disabled={hasVoted || votingId === poll.poll_id}
                    className={`w-full text-left relative overflow-hidden rounded-xl p-2.5 text-xs transition border ${
                      isSelected
                        ? 'border-familia-500/40 bg-familia-500/10'
                        : hasVoted
                          ? 'border-themed bg-[var(--bg-card)]'
                          : 'border-themed bg-[var(--bg-card)] hover:border-familia-500/30 hover:bg-[var(--bg-card-hover)] cursor-pointer'
                    }`}
                  >
                    {hasVoted && (
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-familia-500/10"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    )}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {isSelected && <Check className="w-3 h-3 text-familia-400" />}
                        {option}
                      </span>
                      {hasVoted && (
                        <span className="text-muted font-medium">{percentage}%</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] text-muted mt-2">
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
              {poll.expires_at && (
                <>
                  {' · '}Expires {new Date(poll.expires_at).toLocaleDateString()}
                </>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
