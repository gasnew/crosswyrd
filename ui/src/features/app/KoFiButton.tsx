import { Divider } from '@mui/material';

import { logEvent } from '../../firebase';

import './KoFiButton.css';

export function GarrettNote() {
  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <Divider style={{ margin: 12 }} />
      <p>
        By the way, if you're enjoying Crosswyrd, it really helps me to drop a
        donation! Your donations make it possible for me to develop and maintain
        this passion project. Thank you.
      </p>
      <p>- Garrett </p>
      <div style={{ display: 'flex', margin: 'auto' }}>
        <KoFiButton />
      </div>
    </div>
  );
}

export default function KoFiButton() {
  return (
    <div
      className="kofi-button-container"
      onClick={() => logEvent('donation_button_clicked')}
    >
      <a
        className="kofi-button"
        style={{ backgroundColor: 'rgb(255, 87, 34)', cursor: 'default' }}
        href="https://ko-fi.com/O5O4EFV47"
        target="_blank"
        rel="noreferrer"
      >
        <span className="kofi-text">
          <img
            src="/kofi-cup-border.webp"
            alt="Ko-fi donations"
            className="kofi-img"
          />
          Support Me on Ko-fi
        </span>
      </a>
    </div>
  );
}
