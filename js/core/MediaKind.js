// The three sections of the app and where a change made in each one is sent besides Trakt.
export const KINDS = {
  movies: { label: 'Movies', syncTo: ['Simkl'] },
  shows: { label: 'TV Shows', syncTo: ['Simkl'] },
  anime: { label: 'Anime', syncTo: ['AniList', 'Simkl'] },
};

// Trakt marks anime with the "anime" genre; everything else is a movie or a TV show.
export function kindOf(item) {
  const media = item.movie || item.show || {};
  if ((media.genres || []).includes('anime')) return 'anime';
  return item.movie ? 'movies' : 'shows';
}
