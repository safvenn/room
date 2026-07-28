import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { expensesAPI } from '../api/services';
import type { Category, PaymentMethod, Expense } from '../types';
import toast from 'react-hot-toast';

export default function EditExpensePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const categories: Category[] = ['Food', 'Travel', 'Shopping', 'Rent', 'Entertainment', 'Others'];
  const paymentMethods: PaymentMethod[] = ['GPay', 'Cash'];

  // Form state — loaded from the existing expense
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState<Expense | null>(null);

  const [amount, setAmount] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [category, setCategory] = useState<Category>('Food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('GPay');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await expensesAPI.get(id);
        const exp = res.data;
        setOriginal(exp);
        setAmount(exp.amount);
        setTitle(exp.title);
        setDescription(exp.description ?? '');
        // expense_date can be "YYYY-MM-DD" or ISO string; normalise to YYYY-MM-DD
        setExpenseDate(exp.expense_date.toString().split('T')[0]);
        setCategory(exp.category);
        setPaymentMethod(exp.payment_method);
      } catch {
        toast.error('Could not load expense');
        navigate('/history');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) { toast.error('Amount must be greater than 0'); return; }
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!id || !original) return;

    setSaving(true);
    try {
      // Only send changed fields
      const patch: Record<string, unknown> = {};
      if (title !== original.title) patch.title = title;
      if (description !== (original.description ?? '')) patch.description = description;
      if (amount !== original.amount) patch.amount = amount;
      if (paymentMethod !== original.payment_method) patch.payment_method = paymentMethod;
      if (category !== original.category) patch.category = category;
      const origDate = original.expense_date.toString().split('T')[0];
      if (expenseDate !== origDate) patch.expense_date = expenseDate;

      if (Object.keys(patch).length === 0) {
        toast('No changes to save', { icon: 'ℹ️' });
        return;
      }

      await expensesAPI.update(id, patch as any);
      toast.success('Expense updated!');
      navigate('/history');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update expense');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (cat: Category) => {
    const icons: Record<Category, string> = {
      Food: 'restaurant', Travel: 'flight', Shopping: 'shopping_cart',
      Rent: 'home', Entertainment: 'movie', Others: 'more_horiz',
    };
    return icons[cat];
  };

  if (loading) {
    return (
      <Layout showBack title="Edit Expense">
        <div className="page-container space-y-4">
          <div className="skeleton h-24 w-full rounded-2xl" />
          <div className="skeleton h-48 w-full rounded-2xl" />
          <div className="skeleton h-20 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBack title="Edit Expense">
      <div className="page-container page-enter pb-32">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Amount */}
          <div className="flex flex-col items-center justify-center py-6 bg-white rounded-2xl border border-outline-variant/35 shadow-sm">
            <span className="text-on-surface-variant font-label-caps text-label-caps uppercase mb-1 tracking-widest text-xs">
              Amount
            </span>
            <div className="flex items-center space-x-2">
              <span className="font-display-currency text-display-currency text-on-surface-variant">₹</span>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount || ''}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full max-w-[220px] text-center font-display-currency text-display-currency bg-transparent border-none focus:ring-0 placeholder:text-on-surface-variant/30 text-on-background outline-none"
              />
            </div>
            {original && amount !== original.amount && (
              <span className="mt-2 text-xs text-secondary font-medium">
                Was ₹{original.amount.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Core fields */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-on-surface-variant uppercase ml-1 text-xs tracking-widest">Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Dinner at Olive"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="input-field h-12 text-sm bg-surface-container-low"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-on-surface-variant uppercase ml-1 text-xs tracking-widest">Description</label>
              <input
                type="text"
                placeholder="Optional description..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="input-field h-12 text-sm bg-surface-container-low"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-label-caps text-on-surface-variant uppercase ml-1 text-xs tracking-widest">Date</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="input-field h-12 text-sm bg-surface-container-low"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-caps text-on-surface-variant uppercase ml-1 text-xs tracking-widest">Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="input-field h-12 text-sm bg-surface-container-low px-2 py-0 border-transparent focus:ring-0"
                >
                  {paymentMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Category picker */}
          <div className="space-y-2">
            <label className="block text-on-surface-variant font-label-caps text-label-caps uppercase ml-1 text-xs tracking-widest">Category</label>
            <div className="flex space-x-3 overflow-x-auto hide-scrollbar pb-2 px-1">
              {categories.map(cat => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex flex-col items-center space-y-1.5 min-w-[72px] transition-all duration-200 ${isSelected ? 'scale-105 opacity-100' : 'opacity-65 hover:opacity-100'}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-high text-on-surface'}`}>
                      <span className="material-symbols-outlined text-[20px]">{getCategoryIcon(cat)}</span>
                    </div>
                    <span className={`text-[10px] font-label-caps uppercase tracking-wider ${isSelected ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note: split cannot be changed on edit */}
          <div className="glass-panel rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-on-surface-variant/60 text-[18px] mt-0.5">info</span>
            <p className="text-xs text-on-surface-variant/70 leading-relaxed">
              Split details cannot be changed after creation. Delete and recreate the expense if you need a different split.
            </p>
          </div>

          {/* Save button */}
          <div className="fixed bottom-0 left-0 w-full p-container-padding bg-gradient-to-t from-surface via-surface/90 to-transparent z-40 pb-8">
            <div className="max-w-md mx-auto">
              <button
                type="submit"
                disabled={saving}
                className="w-full h-14 bg-primary text-on-primary rounded-2xl font-semibold flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-transform hover:bg-primary/95 disabled:opacity-60"
              >
                {saving ? (
                  <span className="material-symbols-outlined animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined">save</span>
                )}
                <span>{saving ? 'Saving…' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </Layout>
  );
}
