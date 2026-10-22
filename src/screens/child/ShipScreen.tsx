import { useCallback, useMemo, useState } from 'react';
import type { Profile } from '../../lib/types';
import type { Wallet } from '../../lib/data';
import { buyItem, equipItem, fetchShipState } from '../../lib/data';
import { CATALOG, CRYSTALS_BY_ATTEMPT, DAY_BONUS, SLOTS, itemById, resolveShip, type ShopItem, type Slot } from '../../lib/ship';
import { usePolling } from '../../lib/usePolling';
import { Ship } from '../../components/Ship';
import { Spinner, Toast } from '../../components/Bits';
import { IconCheck, IconGem, IconX } from '../../components/Icons';
import { Rail, type ChildTab } from './Rail';

type Choice = { slot: Slot; id: string | null }; // id null = "none" for optional slots

export function ShipScreen({
  profile,
  wallet,
  onWalletChange,
  onTab,
  onSignOut,
}: {
  profile: Profile;
  wallet: Wallet | null;
  onWalletChange: () => void;
  onTab: (t: ChildTab) => void;
  onSignOut: () => void;
}) {
  const state = usePolling(() => fetchShipState(profile.id), [profile.id], 60000);
  const [slot, setSlot] = useState<Slot>('paint');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const endToast = useCallback(() => setToast(null), []);

  const equipped = useMemo(() => resolveShip(state.data?.equipped), [state.data]);
  const owned = useMemo(() => new Set(state.data?.owned ?? []), [state.data]);
  const balance = wallet?.balance ?? 0;
  const isOwned = (i: ShopItem) => i.price === 0 || owned.has(i.id);

  // What the big ship shows: the fitted parts, plus the part being tried on.
  const preview = useMemo(() => {
    if (!choice) return equipped;
    const c = { ...equipped };
    if (choice.id === null) delete c[choice.slot];
    else c[choice.slot] = choice.id;
    return c;
  }, [equipped, choice]);

  const chosenItem = choice?.id ? itemById(choice.id) : undefined;
  const chosenIsFitted = choice ? (equipped[choice.slot] ?? null) === choice.id : false;

  const pick = (c: Choice) => {
    setChoice(c);
    setConfirming(false);
    setError('');
  };

  const fit = async () => {
    if (!choice) return;
    setBusy(true);
    setError('');
    try {
      await equipItem(choice.slot, choice.id);
      await state.reload();
      setToast(choice.id ? `${chosenItem?.name} is on your ship.` : 'Part taken off.');
      setChoice(null);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't change the ship.");
    } finally {
      setBusy(false);
    }
  };

  const buy = async () => {
    if (!chosenItem) return;
    setBusy(true);
    setError('');
    try {
      await buyItem(chosenItem.id);
      await state.reload();
      onWalletChange();
      setToast(`New part! ${chosenItem.name} is on your ship.`);
      setChoice(null);
      setConfirming(false);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't buy it.");
    } finally {
      setBusy(false);
    }
  };

  const slotInfo = SLOTS.find((s) => s.slot === slot)!;
  const items = CATALOG.filter((i) => i.slot === slot);

  return (
    <div className="child-shell">
      <Rail profile={profile} active="ship" onTab={onTab} onSignOut={onSignOut} />
      <main className="child-main ship-main">
        <header className="child-header">
          <div className="grow">
            <h1>My spaceship</h1>
            <div className="muted small">
              Earn crystals: {CRYSTALS_BY_ATTEMPT(1)} for a first-try approval, {CRYSTALS_BY_ATTEMPT(2)} for the second,{' '}
              {CRYSTALS_BY_ATTEMPT(3)} after that, +{DAY_BONUS} when the whole day is done.
            </div>
          </div>
          {wallet && wallet.today_earned > 0 && (
            <div className="chip-stat">
              <span className="muted">Today</span>
              <strong>+{wallet.today_earned}</strong>
            </div>
          )}
          <div className="chip-stat wallet">
            <IconGem size={28} />
            <strong>{wallet ? balance : '–'}</strong>
            <span className="muted">crystals</span>
          </div>
        </header>

        {!wallet && (
          <div className="banner" role="status">
            <span className="grow">The shop isn't open yet. Ask your teacher to finish setting it up.</span>
          </div>
        )}

        <div className="ship-layout">
          <section className="ship-stage" aria-label="Your spaceship">
            {state.loading && !state.data ? (
              <Spinner />
            ) : (
              <Ship config={preview} size={420} float label={chosenItem ? `Your spaceship with ${chosenItem.name}` : 'Your spaceship'} />
            )}
            {choice && !chosenIsFitted && (
              <span className="trying-on">Trying on: {chosenItem?.name ?? `no ${slotInfo.label.toLowerCase()}`}</span>
            )}
          </section>

          <section className="shop" aria-label="Shop">
            <div className="chips slot-tabs" role="tablist" aria-label="Parts">
              {SLOTS.map((s) => (
                <button
                  key={s.slot}
                  type="button"
                  role="tab"
                  aria-selected={slot === s.slot}
                  className={slot === s.slot ? 'on' : ''}
                  onClick={() => {
                    setSlot(s.slot);
                    setChoice(null);
                    setConfirming(false);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="shop-grid">
              {slotInfo.optional && (
                <ShopTile
                  name="None"
                  previewConfig={(() => {
                    const c = { ...equipped };
                    delete c[slot];
                    return c;
                  })()}
                  status={(equipped[slot] ?? null) === null ? 'fitted' : 'owned'}
                  selected={choice?.slot === slot && choice.id === null}
                  onClick={() => pick({ slot, id: null })}
                />
              )}
              {items.map((i) => (
                <ShopTile
                  key={i.id}
                  name={i.name}
                  price={i.price}
                  previewConfig={{ ...equipped, [slot]: i.id }}
                  status={equipped[slot] === i.id ? 'fitted' : isOwned(i) ? 'owned' : balance >= i.price ? 'buy' : 'locked'}
                  selected={choice?.id === i.id}
                  onClick={() => pick({ slot, id: i.id })}
                />
              ))}
            </div>

            <div className="shop-action" aria-live="polite">
              {!choice ? (
                <span className="muted">Tap a part to try it on your ship.</span>
              ) : chosenIsFitted ? (
                <span className="row-gap center">
                  <IconCheck size={20} /> Already on your ship.
                </span>
              ) : !chosenItem || isOwned(chosenItem) ? (
                <>
                  <span className="grow">{chosenItem ? chosenItem.name : `Take off the ${slotInfo.label.toLowerCase()}`}</span>
                  <button type="button" className="btn btn-outline-ink" onClick={() => setChoice(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={fit} disabled={busy}>
                    {busy ? <Spinner size={20} /> : null}
                    {chosenItem ? 'Put it on' : 'Take it off'}
                  </button>
                </>
              ) : balance < chosenItem.price ? (
                <>
                  <span className="grow">
                    <strong>{chosenItem.name}</strong>
                    <br />
                    <span className="muted small">
                      You need {chosenItem.price - balance} more {chosenItem.price - balance === 1 ? 'crystal' : 'crystals'}. Keep going!
                    </span>
                  </span>
                  <button type="button" className="btn btn-outline-ink" onClick={() => setChoice(null)}>
                    OK
                  </button>
                </>
              ) : confirming ? (
                <>
                  <span className="grow">
                    Buy <strong>{chosenItem.name}</strong> for {chosenItem.price} crystals?
                  </span>
                  <button type="button" className="btn btn-outline-ink" onClick={() => setConfirming(false)} disabled={busy}>
                    Not now
                  </button>
                  <button type="button" className="btn btn-primary" onClick={buy} disabled={busy}>
                    {busy ? <Spinner size={20} /> : null}
                    Yes, buy it
                  </button>
                </>
              ) : (
                <>
                  <span className="grow">
                    <strong>{chosenItem.name}</strong>
                  </span>
                  <button type="button" className="btn btn-outline-ink" onClick={() => setChoice(null)}>
                    <IconX size={18} />
                  </button>
                  <button type="button" className="btn btn-gem" onClick={() => setConfirming(true)}>
                    Buy for <IconGem size={20} /> {chosenItem.price}
                  </button>
                </>
              )}
            </div>
            {error && (
              <div className="error-text" role="alert">
                {error}
              </div>
            )}
          </section>
        </div>
      </main>
      {toast && (
        <Toast onDone={endToast} ms={3500}>
          <span>
            <strong>{toast}</strong>
          </span>
        </Toast>
      )}
    </div>
  );
}

function ShopTile({
  name,
  price,
  previewConfig,
  status,
  selected,
  onClick,
}: {
  name: string;
  price?: number;
  previewConfig: Parameters<typeof Ship>[0]['config'];
  status: 'fitted' | 'owned' | 'buy' | 'locked';
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`shop-tile ${status}${selected ? ' selected' : ''}`} onClick={onClick} aria-pressed={selected}>
      <Ship config={previewConfig} size={112} label={name} />
      <span className="tile-name">{name}</span>
      <span className="tile-price">
        {status === 'fitted' ? (
          <>
            <IconCheck size={14} /> On ship
          </>
        ) : status === 'owned' ? (
          'Yours'
        ) : (
          <>
            <IconGem size={16} /> {price}
          </>
        )}
      </span>
    </button>
  );
}
