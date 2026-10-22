import type { Profile } from '../../lib/types';
import { IconLogout, IconRocket, IconTodayCheck, Logo } from '../../components/Icons';

export type ChildTab = 'today' | 'ship';

/** Left rail on a landscape tablet; becomes a bottom bar in portrait. */
export function Rail({
  profile,
  active,
  onTab,
  onSignOut,
}: {
  profile: Profile;
  active: ChildTab;
  onTab: (t: ChildTab) => void;
  onSignOut: () => void;
}) {
  return (
    <nav className="rail" aria-label="Main">
      <Logo />
      <button
        type="button"
        className={`rail-item${active === 'today' ? ' active' : ''}`}
        aria-current={active === 'today' ? 'page' : undefined}
        onClick={() => onTab('today')}
      >
        <IconTodayCheck size={28} />
        Today
      </button>
      <button
        type="button"
        className={`rail-item${active === 'ship' ? ' active' : ''}`}
        aria-current={active === 'ship' ? 'page' : undefined}
        onClick={() => onTab('ship')}
      >
        <IconRocket size={28} />
        My ship
      </button>
      <div className="rail-spacer" />
      <button className="rail-item" type="button" onClick={onSignOut} aria-label="Switch user">
        <span className="avatar">{profile.display_name.slice(0, 1).toUpperCase()}</span>
        <span className="rail-small">
          <IconLogout size={14} /> Switch
        </span>
      </button>
    </nav>
  );
}
