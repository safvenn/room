import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { settlementsAPI, friendsAPI, usersAPI } from '../api/services';
import type { Settlement, FriendWithRequest, UserBalance, User } from '../types';
import { useAuthStore } from '../store/auth';
import { openUPIPayment, getUPIQRUrl, detectPlatform, buildUPIUrl } from '../utils/upi';
import toast from 'react-hot-toast';

// ─── UPI Payment Modal ─────────────────────────────────────────────────────
interface UPIModalProps {
  receiver: { id: string; name: string; upiId: string | null };
  amount: number;
  onClose: () => void;
  onRecorded: () => void;
}

function UPIModal({ receiver, amount, onClose, onRecorded }: UPIModalProps) {
  const platform = detectPlatform();
  const hasUPI = !!receiver.upiId;
  const [recording, setRecording] = useState(false);
  const [paid, setPaid] = useState(false);
  const [selectedApp, setSelectedApp] = useState<'gpay' | 'phonepe' | 'bhim' | 'any'>('gpay');

  const upiParams = hasUPI ? {
    upiId: receiver.upiId!,
    payeeName: receiver.name,
    amount,
    note: `Budget Buddy – settling with ${receiver.name}`,
  } : null;

  const qrUrl = upiParams ? getUPIQRUrl(upiParams) : null;
  const upiUrl = upiParams ? buildUPIUrl(upiParams) : null;

  // Direct click handler — MUST be synchronous for intent:// to work
  const handleOpenApp = () => {
    if (!upiParams) return;
    const launched = openUPIPayment(upiParams, selectedApp);
    if (launched) {
      setPaid(true); // prompt them to confirm
    }
  };

  const handleRecord = async () => {
    setRecording(true);
    try {
      await settlementsAPI.create({
        receiver_id: receiver.id,
        amount,
        payment_method: 'GPay',
      });
      toast.success("Settlement recorded! Awaiting friend's confirmation.");
      onRecorded();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to record');
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-6 space-y-5 shadow-2xl page-enter"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-primary text-lg">Pay {receiver.name}</h3>
            <p className="text-2xl font-bold text-primary mt-0.5">₹{amount.toLocaleString('en-IN')}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {!hasUPI ? (
          /* No UPI ID set — show message */
          <div className="glass-panel rounded-2xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-error text-xl mt-0.5">error</span>
            <div>
              <p className="font-semibold text-sm text-primary">{receiver.name} has no UPI ID set</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Ask them to add their UPI ID in Budget Buddy Profile settings.
                You can still record this settlement manually.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* QR Code — always shown */}
            {qrUrl && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Scan QR to pay</p>
                <div className="p-3 rounded-2xl border border-outline-variant/30 bg-white shadow-sm">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[180px] h-[180px]" />
                </div>
                <p className="text-xs text-on-surface-variant">{receiver.upiId}</p>
              </div>
            )}

            {/* App redirect buttons — mobile only */}
            {platform !== 'desktop' && (
              <div className="space-y-3">
                <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider text-center">
                  Or open payment app
                </p>
                {/* App selector */}
                <div className="flex gap-2 justify-center">
                  {(['gpay', 'phonepe', 'bhim'] as const).map(app => (
                    <button
                      key={app}
                      onClick={() => setSelectedApp(app)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        selectedApp === app
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
                      }`}
                    >
                      {app === 'gpay' ? 'GPay' : app === 'phonepe' ? 'PhonePe' : 'BHIM'}
                    </button>
                  ))}
                </div>
                {/* Open app button — synchronous click, no window.open */}
                <button
                  onClick={handleOpenApp}
                  className="w-full h-12 bg-primary text-on-primary rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                  Open {selectedApp === 'gpay' ? 'Google Pay' : selectedApp === 'phonepe' ? 'PhonePe' : 'BHIM'}
                </button>
                {/* Copy UPI ID fallback */}
                {upiUrl && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(receiver.upiId!); toast.success('UPI ID copied!'); }}
                    className="w-full h-10 bg-surface-container text-on-surface-variant rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    Copy UPI ID
                  </button>
                )}
              </div>
            )}

            {platform === 'desktop' && (
              <p className="text-center text-xs text-on-surface-variant italic">
                Scan QR code with your phone camera or UPI app to pay.
              </p>
            )}
          </>
        )}

        <div className="w-full h-px bg-outline-variant/30" />

        {/* Record payment */}
        <div className="space-y-2">
          {paid && (
            <div className="glass-panel rounded-xl p-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
              <p className="text-xs text-on-surface font-medium">App opened! After paying, record it below so your friend can confirm.</p>
            </div>
          )}
          <button
            onClick={handleRecord}
            disabled={recording}
            className="w-full h-12 bg-secondary text-on-secondary rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {recording
              ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
              : <span className="material-symbols-outlined text-[20px]">check</span>
            }
            {recording ? 'Recording…' : 'I've Paid — Record Settlement'}
          </button>
          <p className="text-center text-[10px] text-on-surface-variant/60">
            Your friend will confirm once they see the payment.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function SettlementsPage() {
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<FriendWithRequest[]>([]);
  const [friendDetails, setFriendDetails] = useState<Record<string, User>>({});
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [history, setHistory] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  // UPI modal state
  const [upiModal, setUpiModal] = useState<{
    receiver: { id: string; name: string; upiId: string | null };
    amount: number;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const friendsRes = await friendsAPI.list();
      const friendsList = friendsRes.data.friends || [];
      setFriends(friendsList);

      // Fetch full user details for each friend (to get upi_id)
      const details: Record<string, User> = {};
      await Promise.allSettled(
        friendsList.map(async f => {
          try {
            const res = await usersAPI.getById(f.friend.id);
            details[f.friend.id] = res.data;
          } catch {}
        })
      );
      setFriendDetails(details);

      const balancesRes = await settlementsAPI.balances();
      setBalances(balancesRes.data.per_user || []);

      const historyRes = await settlementsAPI.list();
      const settlementsList = Array.isArray(historyRes.data)
        ? historyRes.data
        : (historyRes.data as any).settlements || [];
      setHistory(settlementsList);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load settlements data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const getFriendName = (id: string) => {
    const f = friends.find(item => item.friend.id === id);
    return f ? f.friend.name : 'Unknown';
  };

  const getFriendUPI = (id: string): string | null => {
    return friendDetails[id]?.upi_id || null;
  };

  const openPaymentModal = (friendId: string, amount: number) => {
    setUpiModal({
      receiver: {
        id: friendId,
        name: getFriendName(friendId),
        upiId: getFriendUPI(friendId),
      },
      amount,
    });
  };

  const handleApprove = async (settlementId: string) => {
    try {
      await settlementsAPI.approve(settlementId);
      toast.success('Settlement approved!');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to approve');
    }
  };

  const toSettleList = balances
    .filter(b => b.balance < 0)
    .map(b => ({ friendId: b.user_id, name: getFriendName(b.user_id), balance: b.balance }));

  const owedToYouList = balances
    .filter(b => b.balance > 0)
    .map(b => ({ friendId: b.user_id, name: getFriendName(b.user_id), balance: b.balance }));

  const pendingSettlements = history.filter(s => s.status === 'pending');
  const completedSettlements = history.filter(s => s.status === 'completed');

  if (loading) {
    return (
      <Layout>
        <div className="page-container space-y-6">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-32 w-full" />
          <div className="skeleton h-48 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBack title="Settle Up">
      <div className="page-container page-enter pb-24 space-y-6">

        {/* Balances to Settle / Owed to You */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="glass-panel rounded-2xl p-5 space-y-4">
            <h2 className="text-monetary-md text-primary font-bold">Balances to Settle</h2>
            {toSettleList.length === 0 ? (
              <p className="py-4 text-center text-body-md text-on-surface-variant/60 italic">No outstanding balances.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {toSettleList.map(item => (
                  <div key={item.friendId} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-sm">
                        {item.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-primary">{item.name}</p>
                        <p className="text-xs text-error font-semibold">You owe: ₹{Math.abs(item.balance).toLocaleString('en-IN')}</p>
                        {getFriendUPI(item.friendId) ? (
                          <p className="text-[10px] text-on-surface-variant/60">{getFriendUPI(item.friendId)}</p>
                        ) : (
                          <p className="text-[10px] text-on-surface-variant/40 italic">No UPI ID set</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => openPaymentModal(item.friendId, Math.abs(item.balance))}
                      className="btn-primary h-8 px-3 text-xs shadow-none rounded-lg flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">payments</span>
                      Pay
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="glass-panel rounded-2xl p-5 space-y-4">
            <h2 className="text-monetary-md text-secondary font-bold">Owed to You</h2>
            {owedToYouList.length === 0 ? (
              <p className="py-4 text-center text-body-md text-on-surface-variant/60 italic">No outstanding receivables.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {owedToYouList.map(item => (
                  <div key={item.friendId} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary-container text-secondary flex items-center justify-center font-bold text-sm">
                        {item.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-primary">{item.name}</p>
                        <p className="text-xs text-secondary font-semibold">Owes you: ₹{item.balance.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-on-surface-variant/70 italic bg-surface-variant/30 px-2 py-0.5 rounded-full">
                      Awaiting payment
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Pending Confirmation */}
        <section className="glass-panel rounded-2xl p-5 space-y-4">
          <h2 className="text-monetary-md text-primary font-bold">Pending Confirmation</h2>
          {pendingSettlements.length === 0 ? (
            <p className="py-4 text-center text-body-md text-on-surface-variant/60 italic">No pending confirmations.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingSettlements.map(settlement => {
                const isPayer = settlement.payer_id === 'you' || settlement.payer_id === user?.id;
                const otherName = isPayer ? getFriendName(settlement.receiver_id) : getFriendName(settlement.payer_id);
                return (
                  <div key={settlement.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-sm">pending_actions</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-primary">
                          {isPayer ? `You paid ${otherName}` : `${otherName} paid you`}
                        </p>
                        <p className="text-xs text-on-surface-variant/80">
                          {new Date(settlement.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} • {settlement.payment_method}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-primary">₹{settlement.amount.toLocaleString('en-IN')}</span>
                      {!isPayer ? (
                        <button
                          onClick={() => handleApprove(settlement.id)}
                          className="btn-primary h-8 px-3 text-xs py-0 shadow-none rounded-lg bg-secondary text-on-secondary hover:bg-secondary/95"
                        >
                          Confirm
                        </button>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant/70 italic bg-surface-variant/30 px-2 py-0.5 rounded-full">
                          Awaiting confirm
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past Settlements */}
        <section className="glass-panel rounded-2xl p-5 space-y-4">
          <h2 className="text-monetary-md text-on-surface-variant font-semibold">Past Settlements</h2>
          {completedSettlements.length === 0 ? (
            <p className="py-4 text-center text-body-md text-on-surface-variant/60 italic">No completed settlements yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {completedSettlements.map(settlement => {
                const isPayer = settlement.payer_id === 'you' || settlement.payer_id === user?.id;
                const otherName = isPayer ? getFriendName(settlement.receiver_id) : getFriendName(settlement.payer_id);
                return (
                  <div key={settlement.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-sm">payments</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-primary">
                          {isPayer ? `You paid ${otherName}` : `${otherName} paid you`}
                        </p>
                        <p className="text-xs text-on-surface-variant/80">
                          {new Date(settlement.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} • {settlement.payment_method}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${isPayer ? 'text-error' : 'text-secondary'}`}>
                      {isPayer ? '-' : '+'} ₹{settlement.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* UPI Payment Modal */}
      {upiModal && (
        <UPIModal
          receiver={upiModal.receiver}
          amount={upiModal.amount}
          onClose={() => setUpiModal(null)}
          onRecorded={() => { setUpiModal(null); loadData(); }}
        />
      )}
    </Layout>
  );
}
