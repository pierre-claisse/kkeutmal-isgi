// Lien vers le dictionnaire Naver (entrée coréenne, ouvre les onglets multilingues
// dont français quand l'entrée existe).

export function naverUrl(word: string): string {
  return `https://ko.dict.naver.com/#/search?query=${encodeURIComponent(word)}`;
}
