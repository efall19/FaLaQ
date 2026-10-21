import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isConfigured, supabase } from './lib/supabase';
import { fetchProfile } from './lib/data';
import type { Profile } from './lib/types';
import { Login } from './screens/Login';
import { ChildApp } from './screens/child/ChildApp';
import { ParentApp } from './screens/parent/ParentApp';
import { CenterMessage, Spinner } from './components/Bits';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [profileError, setProfileError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    let alive = true;
    setProfile(undefined);
    setProfileError(false);
    if (!userId) return;
    fetchProfile(userId)
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setProfileError(true));
    return () => {
      alive = false;
    };
  }, [userId, attempt]);

  const signOut = () => {
    supabase.auth.signOut();
  };

  if (!isConfigured) {
    return (
      <CenterMessage title="Almost there">
        This copy of FaLaQ isn't connected to its database yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see the
        README), then redeploy.
      </CenterMessage>
    );
  }
  if (session === undefined) return <Splash />;
  if (!session) return <Login />;
  if (profileError) {
    return (
      <CenterMessage
        title="Can't reach the server"
        action={
          <button type="button" className="btn btn-dark" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        }
      >
        Check the internet connection.
      </CenterMessage>
    );
  }
  if (profile === undefined) return <Splash />;
  if (profile === null) {
    return (
      <CenterMessage
        title="This login isn't set up yet"
        action={
          <button type="button" className="btn btn-dark" onClick={signOut}>
            Sign out
          </button>
        }
      >
        Add a profile row for {session.user.email} (README, step 4).
      </CenterMessage>
    );
  }
  return profile.role === 'parent' ? (
    <ParentApp profile={profile} onSignOut={signOut} />
  ) : (
    <ChildApp profile={profile} onSignOut={signOut} />
  );
}

function Splash() {
  return (
    <div className="center-msg">
      <Spinner />
    </div>
  );
}
