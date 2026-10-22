import { useCallback, useState } from 'react';
import type { Profile } from '../../lib/types';
import { fetchChildren } from '../../lib/data';
import { usePolling } from '../../lib/usePolling';
import { useChapters } from '../../lib/useVerses';
import { CenterMessage, Spinner, Toast } from '../../components/Bits';
import { IconBook, IconCalendar, IconHome, IconLogout } from '../../components/Icons';
import { Dashboard } from './Dashboard';
import { Review } from './Review';
import { Plan } from './Plan';
import { Surahs } from './Surahs';

type View = { name: 'home' } | { name: 'review'; id: string } | { name: 'plan' } | { name: 'surahs' };

export function ParentApp({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const [view, setView] = useState<View>({ name: 'home' });
  const kids = usePolling(fetchChildren, [], 5 * 60 * 1000);
  const { chapters, error: chaptersError, retry: retryChapters } = useChapters();
  const [toast, setToast] = useState<string | null>(null);
  const endToast = useCallback(() => setToast(null), []);

  const child = kids.data?.[0];

  let body;
  if (kids.loading && !kids.data) {
    body = (
      <div className="center-msg">
        <Spinner />
      </div>
    );
  } else if (!child) {
    body = (
      <CenterMessage title="No student yet">
        Create your son's login in Supabase and add his profile row (see the README, step 4). Then reopen this page.
      </CenterMessage>
    );
  } else if (view.name === 'review') {
    body = (
      <Review
        recordingId={view.id}
        chapters={chapters}
        parentId={profile.id}
        child={child}
        onDone={(msg) => {
          setView({ name: 'home' });
          if (msg) setToast(msg);
        }}
      />
    );
  } else if (view.name === 'plan') {
    body = (
      <Plan
        child={child}
        chapters={chapters}
        chaptersError={chaptersError}
        onRetryChapters={retryChapters}
        onGoSurahs={() => setView({ name: 'surahs' })}
      />
    );
  } else if (view.name === 'surahs') {
    body = <Surahs child={child} chapters={chapters} chaptersError={chaptersError} onRetryChapters={retryChapters} />;
  } else {
    body = (
      <Dashboard
        parent={profile}
        child={child}
        chapters={chapters}
        onOpenReview={(id) => setView({ name: 'review', id })}
        onOpenPlan={() => setView({ name: 'plan' })}
      />
    );
  }

  return (
    <div className="parent-shell">
      <div className="parent-body">{body}</div>
      {toast && (
        <Toast onDone={endToast} ms={4500}>
          {toast}
        </Toast>
      )}
      {view.name !== 'review' && (
        <nav className="tabbar" aria-label="Parent">
          <button
            type="button"
            className={view.name === 'home' ? 'active' : ''}
            aria-current={view.name === 'home' ? 'page' : undefined}
            onClick={() => setView({ name: 'home' })}
          >
            <IconHome size={24} />
            Home
          </button>
          <button
            type="button"
            className={view.name === 'plan' ? 'active' : ''}
            aria-current={view.name === 'plan' ? 'page' : undefined}
            onClick={() => setView({ name: 'plan' })}
          >
            <IconCalendar size={24} />
            Plan
          </button>
          <button
            type="button"
            className={view.name === 'surahs' ? 'active' : ''}
            aria-current={view.name === 'surahs' ? 'page' : undefined}
            onClick={() => setView({ name: 'surahs' })}
          >
            <IconBook size={24} />
            Surahs
          </button>
          <button type="button" onClick={onSignOut}>
            <IconLogout size={24} />
            Sign out
          </button>
        </nav>
      )}
    </div>
  );
}
