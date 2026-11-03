export const MAGAZINE = {
  name: 'Paragon AI MAG',
  slug: 'paragon-ai-mag',
  tagline: "See AI's next breakthrough, before it changes everything.",
  description:
    'An independent daily AI magazine: one video and one podcast episode every day, plus research, explainers and predictions in plain words.',
  subtext: 'Signal, never noise.',
} as const;

export const PROJECT = {
  name: 'Paragon AI MAG MD Reader',
  shortName: 'Paragon MD Reader',
  packageName: 'paragon-ai-mag-md-reader',
  repo: 'https://github.com/mrmajdi/ParagonAIMag-MD-Reader',
  version: '0.1.0',
  license: 'MIT',
} as const;

export type FollowLink = {
  id:
    | 'youtube'
    | 'spotify'
    | 'redcircle'
    | 'substack'
    | 'instagram'
    | 'linkedin'
    | 'bluesky'
    | 'x';
  label: string;
  url: string;
};

export const FOLLOW_LINKS: FollowLink[] = [
  { id: 'substack', label: 'Substack', url: 'https://paragonaimag.substack.com' },
  { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@ParagonAIMag' },
  {
    id: 'redcircle',
    label: 'RedCircle',
    url: 'https://www.redcircle.com/shows/cbce814a-d451-4913-a015-fe05b4d0e059',
  },
  {
    id: 'spotify',
    label: 'Spotify',
    url: 'https://open.spotify.com/show/2T9KN4qv9TXH1jYIzY9bev',
  },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/paragonaimag/' },
  { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/company/paragonaimag' },
  { id: 'bluesky', label: 'Bluesky', url: 'https://bsky.app/profile/paragonaimag.bsky.social' },
  { id: 'x', label: 'X', url: 'https://x.com/ParagonAIMag' },
];

export const PRIMARY_FOLLOW_LINKS = FOLLOW_LINKS.filter((link) =>
  ['substack', 'youtube', 'redcircle', 'spotify', 'instagram'].includes(link.id),
);
