// Liens externes ouverts depuis chaque mot validé de la chaîne.

/** Dictionnaire Naver KO (onglets multilingues dont FR quand l'entrée existe). */
export function naverUrl(word: string): string {
  return `https://ko.dict.naver.com/#/search?query=${encodeURIComponent(word)}`;
}

/** Google Translate KO → FR. */
export function googleTranslateUrl(word: string): string {
  return `https://translate.google.com/?sl=ko&tl=fr&op=translate&text=${encodeURIComponent(word)}`;
}
