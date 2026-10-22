import { useEffect, useState } from 'react';
import Styleguide from './styleguide.jsx';

// M3 shell: placeholder home + styleguide route. Deck flows land in M4/M5.
function route() {
  return window.location.hash;
}

export default function App() {
  const [hash, setHash] = useState(route());
  useEffect(() => {
    const onHash = () => setHash(route());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (hash === '#/styleguide') {
    return (
      <div className="app-atmosphere min-h-dvh bg-bg text-ink">
        <Styleguide />
      </div>
    );
  }

  return (
    <div className="app-atmosphere flex min-h-dvh items-center justify-center bg-bg px-5 text-ink">
      <div className="max-w-md text-left">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-dim">Field record · invite only</p>
        <h1 className="font-shout text-5xl leading-none">
          HEARD IT <span className="font-whisper font-medium italic text-gold">in the wild?</span>
        </h1>
        <p className="mt-3 text-dim">New UI lands here — deck flows in M4/M5.</p>
        <p className="mt-4">
          <a href="#/styleguide" className="font-bold uppercase tracking-[0.14em] text-ember">
            Open the styleguide →
          </a>
        </p>
      </div>
    </div>
  );
}
