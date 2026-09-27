import classNames from 'classnames';
import React, { useState } from 'react';

import { Chip, ChipVariant } from '@noodl-core-ui/components/common/Chip';
import { DialogRenderDirection } from '@noodl-core-ui/components/layout/BaseDialog';
import { ContextMenu, ContextMenuProps } from '@noodl-core-ui/components/popups/ContextMenu';
import { UserBadgeProps } from '@noodl-core-ui/components/user/UserBadge';
import { LauncherCard } from '@noodl-core-ui/preview/launcher/Launcher/components/LauncherCard';
import {
  bottomEdgeColour,
  hasUsableCapture,
  isBlankCapture,
  placeholderBucket,
  projectInitial
} from '@noodl-core-ui/utils/projectThumbnail';

import css from './LauncherProjectCard.module.scss';

// Runtime version detection types
export interface RuntimeVersionInfo {
  version: 'react17' | 'react19' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  indicators: string[];
}

// FIXME: Use the timeSince function from the editor package when this is moved there
function timeSince(date: Date | number) {
  const date_unix = typeof date === 'number' ? date : date.getTime();
  var seconds = Math.floor((new Date().getTime() - date_unix) / 1000);

  var interval = Math.floor(seconds / 31536000);

  if (interval > 1) {
    return interval + ' years';
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + ' months';
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + ' days';
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + ' hours';
  }
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return interval + ' minutes';
  }
  return Math.floor(seconds) + ' seconds';
}

export enum CloudSyncType {
  None = 'Local',
  Git = 'Git'
}

export interface LauncherProjectData {
  id: string;
  title: string;
  cloudSyncMeta: {
    type: CloudSyncType;
    source?: string;
  };
  localPath: string;
  lastOpened: string;
  pullAmount?: number;
  pushAmount?: number;
  uncommittedChangesAmount?: number;
  imageSrc: string;
  contributors?: UserBadgeProps[];
  runtimeInfo?: RuntimeVersionInfo;
}

export interface LauncherProjectCardProps extends LauncherProjectData {
  contextMenuItems: ContextMenuProps[];
  onClick?: () => void;
  runtimeInfo?: RuntimeVersionInfo;
  onMigrateProject?: () => void;
  onOpenReadOnly?: () => void;
}

const WarningTriangle = (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 1.6 15 14H1L8 1.6Zm0 4.1c-.5 0-.8.3-.8.8l.2 3h1.2l.2-3c0-.5-.3-.8-.8-.8Zm0 6.6a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z" />
  </svg>
);

/**
 * CHR-005 / R5 — a project's picture on the one launcher card.
 *
 * 🔴 THE CAPTURE IS A STRIP, NOT A 16:9 PICTURE. `thumbURI` is the top 400px of the page at the
 * window's width: of twelve real ones read on 2026-09-15, nine were 1263×400 or wider (≥ 3.16:1),
 * one 712×400 and one 400×703. Cover-cropping a 3:1 strip into 16:9 keeps its middle 56%, which on
 * a left-aligned page (Reading Shelf) is empty ground. So the capture is fitted to the card's WIDTH,
 * pinned to the top, and the slot below it is painted in the capture's own bottom-edge colour.
 *
 * The gradient-and-initial placeholder is only for a project with no usable capture (R5).
 */
function ProjectPicture({ title, imageSrc }: { title: string; imageSrc: string }) {
  // An <img> load error or a blank capture flips this off, so a dead URL still resolves.
  const [showCapture, setShowCapture] = useState(() => hasUsableCapture(imageSrc));
  const [ground, setGround] = useState<string | null>(null);

  if (!showCapture) {
    return (
      <div className={classNames(css['Placeholder'], css[`hue-${placeholderBucket(title)}`])} aria-hidden="true">
        <span className={css['Initial']}>{projectInitial(title)}</span>
      </div>
    );
  }

  return (
    // The one computed value on the card: the capture's own ground.
    <div className={css['Capture']} style={ground ? { backgroundColor: ground } : undefined}>
      <img
        className={css['CaptureImage']}
        src={imageSrc}
        alt=""
        onError={() => setShowCapture(false)}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (isBlankCapture(img)) {
            setShowCapture(false);
            return;
          }
          setGround(bottomEdgeColour(img));
        }}
      />
    </div>
  );
}

export function LauncherProjectCard({
  title,
  cloudSyncMeta,
  lastOpened,
  imageSrc,
  contextMenuItems,
  runtimeInfo,
  onClick
}: LauncherProjectCardProps) {
  const isLocal = cloudSyncMeta.type === CloudSyncType.None;
  const isReact17 = runtimeInfo?.version === 'react17';

  return (
    <LauncherCard
      className={css['Card']}
      testId="launcher-project-card"
      onClick={onClick}
      picture={<ProjectPicture title={title} imageSrc={imageSrc} />}
      title={title}
      description={`Edited ${timeSince(new Date(lastOpened))} ago`}
      footer={
        <>
          <span className={css['Chips']}>
            {isLocal && <Chip label="Local only" variant={ChipVariant.Neutral} />}
            {isReact17 && <Chip label="React 17 runtime" variant={ChipVariant.Warning} icon={WarningTriangle} />}
          </span>

          {Boolean(contextMenuItems) && (
            <div
              className={css['Kebab']}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <ContextMenu renderDirection={DialogRenderDirection.Below} menuItems={contextMenuItems} />
            </div>
          )}
        </>
      }
    />
  );
}
